const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");

const getSessionCart = (req) => {
	// Return the session cart if available, else create a new one
	if (!req.session.cart) {
		req.session.cart = { products: [] };
	}
	return req.session.cart;
};

const getCart = async (req, res) => {
	try {
		if (req.user) {
			// For logged-in users, retrieve the cart using the cart ID stored in the user
			const cart = await Cart.findById(req.user.cart).populate(
				"products.product"
			);
			return res.status(200).json({ cart: cart || { products: [] } });
		} else {
			// For guests, retrieve the cart from session
			const cart = getSessionCart(req);
			return res.status(200).json({ cart });
		}
	} catch (error) {
		return res
			.status(500)
			.json({ message: "Error fetching cart", error: error.message });
	}
};

const addToCart = async (req, res) => {
	try {
		const { productId, variant } = req.body;
		let { quantity } = req.body;
		quantity = parseInt(quantity);

		// Get the product data (including price and variants) from the database
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// Check if the variant is available in the product's options
		const { size, color, fit } = variant;

		// Validate variant properties
		if (
			(size && !product.sizes.includes(size)) ||
			(color && !product.colors.includes(color)) ||
			(fit && !product.fits.includes(fit))
		) {
			return res
				.status(400)
				.json({ message: "Selected variant is not available" });
		}

		const price = product.price;
		let totalPrice = 0;

		if (req.user) {
			// For logged-in users, update the user's cart
			let cart = await Cart.findById(req.user.cart);

			if (!cart) {
				cart = new Cart({ user: req.user._id, products: [] });
				req.user.cart = cart._id; // Assign new cart to the user
				await req.user.save();
			}

			const existingProduct = cart.products.find(
				(item) =>
					item.product.toString() === productId &&
					JSON.stringify(item.variant) === JSON.stringify(variant)
			);

			if (existingProduct) {
				// If the product already exists in the cart, increase the quantity
				existingProduct.quantity += quantity;
				totalPrice = existingProduct.quantity * price; // Update the price based on the increased quantity
				existingProduct.price = totalPrice; // Update the price for the increased quantity
			} else {
				// If the product is new, add it to the cart
				totalPrice = quantity * price; // Calculate total price for new product
				cart.products.push({
					product: productId,
					quantity,
					price: totalPrice,
					variant,
				});
			}

			await cart.save();
			cart = await Cart.findById(req.user.cart).populate("products.product");
			return res.status(200).json({ cart });
		} else {
			// For guests, use the session cart
			const cart = getSessionCart(req);

			const existingProduct = cart.products.find(
				(item) =>
					item.product._id === productId &&
					JSON.stringify(item.variant) === JSON.stringify(variant)
			);

			if (existingProduct) {
				// If the product already exists in the session cart, increase the quantity
				existingProduct.quantity += quantity;
				totalPrice = existingProduct.quantity * price; // Update the price based on the increased quantity
				existingProduct.price = totalPrice; // Update the price for the increased quantity
			} else {
				// If the product is new, add it to the session cart
				totalPrice = quantity * price; // Calculate total price for new product
				cart.products.push({
					product: product,
					quantity,
					price: totalPrice,
					variant,
				});
			}

			return res.status(200).json({ cart });
		}
	} catch (error) {
		return res
			.status(500)
			.json({ message: "Error adding product to cart", error: error.message });
	}
};

const decreaseFromCart = async (req, res) => {
	try {
		const { productId, variant } = req.body;
		let { quantity = 1 } = req.body;
		quantity = parseInt(quantity);

		// Get the product data (including price and variants) from the database
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		// Check if the variant is available in the product's options
		const { size, color, fit } = variant;

		// Validate variant properties
		if (
			(size && !product.sizes.includes(size)) ||
			(color && !product.colors.includes(color)) ||
			(fit && !product.fits.includes(fit))
		) {
			return res
				.status(400)
				.json({ message: "Selected variant is not available" });
		}

		const price = product.price;
		let totalPrice = 0;

		if (req.user) {
			// For logged-in users, update the user's cart
			let cart = await Cart.findById(req.user.cart);

			if (!cart) {
				return res.status(404).json({ message: "Cart not found" });
			}

			const existingProduct = cart.products.find(
				(item) =>
					item.product.toString() === productId &&
					JSON.stringify(item.variant) === JSON.stringify(variant)
			);

			if (!existingProduct) {
				return res.status(404).json({ message: "Product not in cart" });
			}

			// Decrease the quantity
			existingProduct.quantity -= quantity;

			if (existingProduct.quantity <= 0) {
				// If the quantity becomes zero or less, remove the product from the cart
				cart.products = cart.products.filter(
					(item) =>
						item.product.toString() !== productId ||
						JSON.stringify(item.variant) !== JSON.stringify(variant)
				);
			} else {
				// If the quantity is still greater than zero, update the price
				totalPrice = existingProduct.quantity * price;
				existingProduct.price = totalPrice;
			}

			await cart.save();
			cart = await Cart.findById(req.user.cart).populate("products.product");
			return res.status(200).json({ cart });
		} else {
			// For guests, use the session cart
			const cart = getSessionCart(req);

			const existingProduct = cart.products.find(
				(item) =>
					item.product._id === productId &&
					JSON.stringify(item.variant) === JSON.stringify(variant)
			);

			if (!existingProduct) {
				return res.status(404).json({ message: "Product not in cart" });
			}

			// Decrease the quantity
			existingProduct.quantity -= quantity;

			if (existingProduct.quantity <= 0) {
				// If the quantity becomes zero or less, remove the product from the cart
				cart.products = cart.products.filter(
					(item) =>
						item.product._id !== productId ||
						JSON.stringify(item.variant) !== JSON.stringify(variant)
				);
			} else {
				// If the quantity is still greater than zero, update the price
				totalPrice = existingProduct.quantity * price;
				existingProduct.price = totalPrice;
			}

			return res.status(200).json({ cart });
		}
	} catch (error) {
		return res.status(500).json({
			message: "Error decreasing product from cart",
			error: error.message,
		});
	}
};

const removeFromCart = async (req, res) => {
	try {
		const { productId, variant } = req.body;

		if (req.user) {
			// For logged-in users, remove the product from the cart
			let cart = await Cart.findById(req.user.cart);

			if (!cart) {
				return res.status(400).json({ message: "Cart not found" });
			}

			cart.products = cart.products.filter(
				(item) =>
					!(
						item.product.toString() === productId &&
						JSON.stringify(item.variant) === JSON.stringify(variant)
					)
			);

			await cart.save();
			cart = await Cart.findById(req.user.cart).populate("products.product");
			return res.status(200).json({ cart });
		} else {
			// For guest users, remove the product from the session cart
			const cart = getSessionCart(req);

			cart.products = cart.products.filter(
				(item) =>
					!(
						item.product._id === productId &&
						JSON.stringify(item.variant) === JSON.stringify(variant)
					)
			);

			return res.status(200).json({ cart });
		}
	} catch (error) {
		return res.status(500).json({
			message: "Error removing product from cart",
			error: error.message,
		});
	}
};

const mergeCart = async (req, res, user) => {
	try {
		const sessionCart = getSessionCart(req); // Get the session cart (guest cart)
		if (sessionCart.products.length === 0) {
			return; // If there are no products in the session cart, no need to merge
		}

		// Find the user's cart in the database
		let cart = await Cart.findById(user.cart);

		if (!cart) {
			// If user doesn't have a cart, create one
			cart = new Cart({ user: user._id, products: [] });
			user.cart = cart._id;
			await user.save();
		}

		// Loop through each product in the session cart
		for (let sessionProduct of sessionCart.products) {
			const {
				product: sessionProductDetail,
				quantity,
				variant,
			} = sessionProduct;
			const productId = sessionProductDetail._id;
			// Get the product data (including price) from the database
			const product = await Product.findById(productId);
			if (!product) return;

			const price = product.price;
			const totalPrice = price * quantity;

			// Check if the product already exists in the user's cart
			const existingProduct = cart.products.find(
				(item) =>
					item.product.toString() === productId &&
					JSON.stringify(item.variant) === JSON.stringify(variant)
			);

			if (!existingProduct) {
				// Only add the product if it doesn't exist in the user's cart
				cart.products.push({
					product: productId,
					quantity,
					price: totalPrice,
					variant,
				});
			}
		}

		// Save the merged cart to the database
		await cart.save();

		// Clear the session cart after merging
		req.session.cart = { products: [] };
	} catch (error) {
		console.log("Error merging cart:", error);
	}
};

module.exports = {
	getCart,
	addToCart,
	decreaseFromCart,
	removeFromCart,
	mergeCart,
};
