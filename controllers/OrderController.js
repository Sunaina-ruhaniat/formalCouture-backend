const crypto = require("crypto");
const Order = require("../models/OrderModel");
const Wallet = require("../models/WalletModel");
const Product = require("../models/ProductModel");

const Cart = require("../models/CartModel");
const rp_instance = require("../services/razorpay-sdk");

// Fetch all orders
exports.getAllOrders = async (req, res) => {
	try {
		const orders = await Order.find().populate("user", "name email");
		res.status(200).json({ success: true, orders });
	} catch (error) {
		console.error("Error fetching all orders:", error);
		res
			.status(500)
			.json({ success: false, message: "Failed to fetch orders." });
	}
};

// Fetch orders for a specific user
exports.getUserOrders = async (req, res) => {
	try {
		const userId = req.user._id;

		const orders = await Order.find({ user: userId }).populate(
			"user",
			"name email"
		);
		// if (!orders.length) {
		// 	return res
		// 		.status(404)
		// 		.json({ success: false, message: "No orders found for this user." });
		// }

		res.status(200).json({ success: true, orders });
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
		const { shippingAddress, billingAddress, useReferral, useExchange } =
			req.body;

		// Fetch the cart
		const cart = await Cart.findOne({ user: userId }).populate(
			"products.product"
		);
		if (!cart || cart.products.length === 0) {
			return res.status(400).json({ error: "Cart is empty." });
		}

		// Check product stock
		for (const item of cart.products) {
			const product = await Product.findById(item.product._id);
			if (!product || product.stock < item.quantity) {
				return res
					.status(400)
					.json({ error: `Product ${product.name} is out of stock.` });
			}
		}

		// Fetch wallet details
		const wallet = await Wallet.findOne({ user: userId });
		if (!wallet) {
			return res.status(400).json({ error: "Wallet not found for user." });
		}

		// Calculate total amount
		let totalAmount = 0;
		cart.products.forEach((item) => {
			totalAmount += item.price;
		});

		let referralDiscount = 0;
		let exchangeDiscount = 0;

		// Apply wallet discounts (prioritize exchange wallet)
		if (useExchange) {
			exchangeDiscount = Math.min(wallet.exchangeBalance, totalAmount);
		} else if (useReferral) {
			referralDiscount = Math.min(wallet.referralBalance, totalAmount * 0.05);
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
		};
		// Respond with the payment link URL
		res.status(200).json({
			success: true,
			paymentLink: paymentLink.short_url, // Use the short_url for redirection
			checkoutSummary,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
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

		// Only process successful payments
		if (payload.event === "payment.captured") {
			const payment = payload.payload.payment.entity;

			// Extract necessary details from the payment payload
			const { id: paymentId, notes, amount, status } = payment;

			// Ensure payment is captured
			if (status !== "captured") {
				return res.status(400).json({ message: "Payment not captured." });
			}

			// Extract notes metadata
			const userId = notes.userId;
			const orderId = notes.orderId;
			// const shippingAddress = JSON.parse(notes.shippingAddress);
			// const billingAddress = JSON.parse(notes.billingAddress);
			const referralDiscount = Number(notes.referralDiscount || 0);
			const exchangeDiscount = Number(notes.exchangeDiscount || 0);
			// const products = JSON.parse(notes.products);

			// Fetch the corresponding order in the database
			const order = await Order.findById(orderId);
			const products = order.products;
			if (!order) {
				return res.status(400).json({ message: "Order not found." });
			}

			// Ensure sufficient wallet balance
			const wallet = await Wallet.findOne({ user: userId });
			if (!wallet) {
				return res.status(400).json({ message: "Wallet not found for user." });
			}

			if (wallet.referralBalance < referralDiscount) {
				return res
					.status(400)
					.json({ message: "Insufficient referral balance." });
			}

			if (wallet.exchangeBalance < exchangeDiscount) {
				return res
					.status(400)
					.json({ message: "Insufficient exchange balance." });
			}

			// Deduct stock from products
			for (const item of products) {
				const product = await Product.findById(item.product._id);
				if (!product || product.stock < item.quantity) {
					throw new Error(`Product ${product.name} is out of stock.`);
				}
				product.stock -= item.quantity;
				await product.save();
			}

			// Deduct wallet balances
			wallet.referralBalance -= referralDiscount;
			wallet.exchangeBalance -= exchangeDiscount;
			wallet.referralBalance = Math.max(wallet.referralBalance, 0);
			wallet.exchangeBalance = Math.max(wallet.exchangeBalance, 0);
			await wallet.save();

			// Update the order status
			order.paymentStatus = "Completed";
			order.paymentDetails = {
				paymentId,
			};
			await order.save();

			return res.status(200).json({ success: true, order });
		} else {
			return res.status(400).json({ message: "Unhandled webhook event type." });
		}
	} catch (error) {
		console.error("Webhook Error:", error.message);
		res.status(500).json({ message: error.message });
	}
};
