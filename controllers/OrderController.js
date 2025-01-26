const crypto = require("crypto");
const Order = require("../models/OrderModel");
const Wallet = require("../models/WalletModel");
const Product = require("../models/ProductModel");

const Cart = require("../models/CartModel");
const rp_instance = require("../services/razorpay-sdk");
const EmailService = require("../services/EmailService");
const EmailTemplates = require("../templates/EmailTemplates");
const User = require("../models/UserModel");

// Fetch all orders with pagination
exports.getAllOrders = async (req, res) => {
	try {
		// Extract pagination parameters from query string
		const { page = 1, limit = 20 } = req.query;

		const pageNumber = parseInt(page, 10);
		const pageSize = parseInt(limit, 10);

		if (pageNumber <= 0 || pageSize <= 0) {
			return res.status(400).json({
				success: false,
				message: "Page and limit must be positive integers.",
			});
		}

		// Calculate the number of documents to skip
		const skip = (pageNumber - 1) * pageSize;

		// Fetch orders with pagination and populate user details
		const orders = await Order.find()
			.sort({ createdAt: -1 }) // Optional: Sort orders by creation date
			.skip(skip)
			.limit(pageSize)
			.populate("user", "name username email");

		// Get the total count of orders for pagination metadata
		const totalOrders = await Order.countDocuments();

		// Return paginated data with metadata
		res.status(200).json({
			success: true,
			page: pageNumber,
			limit: pageSize,
			totalPages: Math.ceil(totalOrders / pageSize),
			totalOrders,
			orders,
		});
	} catch (error) {
		console.error("Error fetching all orders:", error);
		res
			.status(500)
			.json({ success: false, message: "Failed to fetch orders." });
	}
};

// Fetch orders for a specific user
// Fetch orders for a specific user with pagination
exports.getUserOrders = async (req, res) => {
	try {
		const userId = req.user._id;

		// Extract pagination parameters from query string
		const { page = 1, limit = 20 } = req.query;

		const pageNumber = parseInt(page, 10);
		const pageSize = parseInt(limit, 10);

		if (pageNumber <= 0 || pageSize <= 0) {
			return res.status(400).json({
				success: false,
				message: "Page and limit must be positive integers.",
			});
		}

		// Calculate the number of documents to skip
		const skip = (pageNumber - 1) * pageSize;

		// Fetch user's orders with pagination and populate user details
		const orders = await Order.find({ user: userId })
			.sort({ createdAt: -1 }) // Optional: Sort orders by creation date
			.skip(skip)
			.limit(pageSize)
			.populate("user", "name username email");

		// Get the total count of user's orders for pagination metadata
		const totalOrders = await Order.countDocuments({ user: userId });

		// Return paginated data with metadata
		res.status(200).json({
			success: true,
			page: pageNumber,
			limit: pageSize,
			totalPages: Math.ceil(totalOrders / pageSize),
			totalOrders,
			orders,
		});
	} catch (error) {
		console.error("Error fetching user orders:", error);
		res
			.status(500)
			.json({ success: false, message: "Failed to fetch user orders." });
	}
};

exports.getOrderById = async (req, res) => {
	try {
		const orderId = req.params.orderId;
		const currentUser = req.user; // Assuming `req.user` contains authenticated user info

		// Fetch the order
		const order = await Order.findById(orderId).populate(
			"user",
			"name email role"
		);
		if (!order) {
			return res
				.status(404)
				.json({ success: false, message: "Order not found." });
		}

		// Check if the current user is the owner of the order or an admin
		if (
			order.user._id.toString() !== currentUser._id.toString() &&
			currentUser.role !== "admin"
		) {
			return res.status(403).json({
				success: false,
				message: "You are not authorized to view this order.",
			});
		}

		// If authorized, send the order details
		res.status(200).json({ success: true, order });
	} catch (error) {
		console.error("Error fetching order by ID:", error);
		res.status(500).json({ success: false, message: "Failed to fetch order." });
	}
};

exports.createRazorpayOrderAndRedirect = async (req, res) => {
	try {
		const userId = req.user._id;
		const { shippingAddress, billingAddress, useReferral, useExchange, gift } =
			req.body;

		// Fetch the cart
		const cart = await Cart.findOne({ user: userId }).populate(
			"products.product"
		);
		if (!cart || cart.products.length === 0) {
			return res.status(400).json({ message: "Cart is empty." });
		}

		// Check product stock
		for (const item of cart.products) {
			const product = await Product.findById(item.product._id);
			if (!product || product.stock < item.quantity) {
				return res
					.status(400)
					.json({ message: `Product ${product.name} is out of stock.` });
			}
		}

		// Fetch wallet details
		const wallet = await Wallet.findOne({ user: userId });
		if (!wallet) {
			return res.status(400).json({ message: "Wallet not found for user." });
		}

		// // Ensure wallet is not locked
		// if (wallet.lock) {
		// 	return res.status(400).json({
		// 		message:
		// 			"Wallet is locked. Please wait for the previous payment to complete.",
		// 	});
		// }

		// // Lock the wallet
		// wallet.lock = true;
		// await wallet.save();
		// Calculate total amount
		let totalAmount = 0;
		cart.products.forEach((item) => {
			totalAmount += item.price;
		});
		let giftAmount = parseInt(process.env.GIFT_AMOUNT, 10);
		totalAmount += gift ? giftAmount : 0;
		let referralDiscount = 0;
		let exchangeDiscount = 0;

		// Apply wallet discounts (prioritize exchange wallet)
		if (useExchange) {
			exchangeDiscount = Math.min(wallet.exchangeBalance, totalAmount);
		} else if (useReferral) {
			referralDiscount = Math.min(
				wallet.referralBalance,
				totalAmount * parseFloat(process.env.REFERRAL_PERCENTAGE_LIMIT)
			);
		}

		const finalAmount = totalAmount - referralDiscount - exchangeDiscount;

		// Create the order in the database before Razorpay order
		const order = await Order.create({
			user: userId,
			products: cart.products,
			totalAmount,
			finalAmount,
			referralDiscount,
			exchangeDiscount,
			shippingAddress,
			billingAddress,
			paymentStatus: "Pending", // Order status is initially Pending
			gift: gift || false,
		});

		// Initialize Razorpay
		const razorpay = rp_instance;
		// Create Payment Link via Razorpay API
		const paymentLinkPayload = {
			amount: finalAmount,
			currency: "INR",
			accept_partial: false,
			customer: {
				name: req.user.name,
				contact: req.user.phone,
				email: req.user.email,
			},
			notes: {
				userId,
				// shippingAddress: JSON.stringify(shippingAddress),
				// billingAddress: JSON.stringify(billingAddress),
				referralDiscount,
				exchangeDiscount,
				orderId: order._id,
			},
			reminder_enable: true,
			callback_url: process.env.PAYMENT_CALLBACK_URL,
			callback_method: "get",
		};

		const paymentLink = await razorpay.paymentLink.create(paymentLinkPayload);
		// Save checkout summary in session
		const checkoutSummary = {
			products: cart.products,
			referralDiscount,
			exchangeDiscount,
			totalAmount,
			finalAmount,
			shippingAddress,
			billingAddress,
			paymentLink: paymentLink.short_url,
			orderId: order._id, // Include the order ID in the summary
			userId,
			gift: gift || false,
		};
		// Respond with the payment link URL
		res.status(200).json({
			success: true,
			paymentLink: paymentLink.short_url, // Use the short_url for redirection
			checkoutSummary,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: error.message });
	}
};

exports.paymentCallback = async (req, res) => {
	const { razorpay_payment_link_status } = req.query;

	// all the validation doesnt work for some reason

	if (razorpay_payment_link_status === "paid") {
		// const generatedSignature = crypto
		// 	.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
		// 	.update(`${razorpay_payment_link_id}|${razorpay_payment_id}`)
		// 	.digest("hex");

		// console.log(req.query, req.body, generatedSignature);

		// if (generatedSignature === razorpay_signature) {
		// 	// Payment successful
		// }
		return res.redirect(process.env.PAYMENT_REDIRECT_SUCCESS_URL);
	}

	// Payment failed
	return res.redirect(process.env.PAYMENT_REDIRECT_FAILURE_URL);
};

exports.razorpayWebhookHandler = async (req, res) => {
	try {
		const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

		// Verify Razorpay signature
		const razorpaySignature = req.headers["x-razorpay-signature"];
		const generatedSignature = crypto
			.createHmac("sha256", secret)
			.update(JSON.stringify(req.body))
			.digest("hex");

		if (razorpaySignature !== generatedSignature) {
			return res.status(400).json({ message: "Invalid webhook signature." });
		}

		const payload = req.body;
		console.log(payload);
		// Process payment events
		const eventType = payload.event;
		const payment = payload.payload.payment.entity;
		const { id: paymentId, notes, status } = payment;

		// Extract userId and orderId from notes
		const userId = notes.userId;
		const orderId = notes.orderId;

		// Fetch wallet and order
		const wallet = await Wallet.findOne({ user: userId });
		if (!wallet) {
			return res.status(400).json({ message: "Wallet not found for user." });
		}

		const order = await Order.findById(orderId).populate("products.product");
		if (!order) {
			return res.status(400).json({ message: "Order not found." });
		}

		// Only process successful payments
		if (eventType === "payment.captured") {
			// Ensure payment is captured
			if (status !== "captured") {
				return res.status(400).json({ message: "Payment not captured." });
			}
			const referralDiscount = Number(notes.referralDiscount || 0);
			const exchangeDiscount = Number(notes.exchangeDiscount || 0);

			if (wallet.referralBalance < referralDiscount) {
				order.paymentStatus = "ReferralDisparity";
				order.paymentDetails = {
					paymentId,
				};
				await order.save();
				return res
					.status(400)
					.json({ error: "Insufficient referral balance." });
			}

			if (wallet.exchangeBalance < exchangeDiscount) {
				order.paymentStatus = "ExchangeDisparity";
				order.paymentDetails = {
					paymentId,
				};
				await order.save();
				return res
					.status(400)
					.json({ error: "Insufficient exchange balance." });
			}
			wallet.referralBalance -= referralDiscount;
			wallet.exchangeBalance -= exchangeDiscount;
			wallet.referralBalance = Math.max(wallet.referralBalance, 0);
			wallet.exchangeBalance = Math.max(wallet.exchangeBalance, 0);
			await wallet.save();

			// Deduct stock from products
			for (const item of order.products) {
				const product = await Product.findById(item.product._id);
				if (!product || product.stock < item.quantity) {
					throw new Error(`Product ${product.name} is out of stock.`);
				}
				product.stock -= item.quantity;
				await product.save();
			}

			// Update the order status
			order.paymentStatus = "Completed";
			order.paymentDetails = {
				paymentId,
			};
			await order.save();

			// Prepare the order details for the email
			const user = await User.findById(userId);
			const products = order.products.map((item) => ({
				name: item.product.name,
				quantity: item.quantity,
				price: item.price,
			}));
			const totalAmount = order.totalAmount;

			// Send the order success email
			const { subject, text, html } = EmailTemplates.orderSuccessEmail(
				user.username,
				orderId,
				products,
				totalAmount
			);

			await EmailService.sendEmail(user.email, subject, text, html);
			console.log("Payment captured successfully.");
		} else if (eventType === "payment.failed") {
			// Handle failed payment
			order.paymentStatus = "Failed";
			await order.save();

			console.log("Payment failed, order updated.");
		} else {
			return res.status(400).json({ message: "Unhandled webhook event type." });
		}

		// Unlock wallet in all cases
		// wallet.lock = false;
		// await wallet.save();
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error("Webhook Error:", error.message);
		res.status(500).json({ message: error.message });
	}
};
