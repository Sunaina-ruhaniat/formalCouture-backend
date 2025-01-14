const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");
const CartController = require("../controllers/CartController");
const WishlistController = require("../controllers/WishlistController");

exports.register = async (req, res) => {
	try {
		const data = req.body;
		data.role = "customer";
		const user = await User.create(data);
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
		await user.save();

		// Set token as an HttpOnly cookie
		// can change it later to req.session.token
		// retrieve in middleware with req.session.token
		res.cookie("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
			sameSite: true, // if in localhost not then "none"
		});

		// Merge the session cart with the user's cart
		await CartController.mergeCart(req, res, user);
		await WishlistController.mergeWishlist(req, res, user);

		// const userWithoutPassword = user.toObject();
		// delete userWithoutPassword.password;

		return res
			.status(200)
			.json({ message: "Registered successfully", user: user, token: token });
	} catch (error) {
		console.log(error);
		return res
			.status(500)
			.json({ error: error.message, message: "Error Registering User" });
	}
};

exports.login = async (req, res) => {
	try {
		const { password, ...rest } = req.body;

		const user = await User.findOne(rest);
		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(404).json({ message: "Invalid Credentials" });
		}
		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

		// Set token as an HttpOnly cookie
		res.cookie("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production", // Set to true if using HTTPS
			sameSite: true, // if in localhost not then "none"
		});

		// Merge the session cart with the user's cart
		await CartController.mergeCart(req, res, user);
		await WishlistController.mergeWishlist(req, res, user);

		return res.status(200).json({ message: "Login Successful", user, token });
	} catch (error) {
		console.log(error);
		return res
			.status(500)
			.json({ error: error?.message, message: "Error in User Login" });
	}
};
