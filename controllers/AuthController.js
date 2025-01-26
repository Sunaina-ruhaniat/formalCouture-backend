const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");
const CartController = require("../controllers/CartController");
const WishlistController = require("../controllers/WishlistController");
const EmailService = require("../services/EmailService");
const EmailTemplates = require("../templates/EmailTemplates");
const crypto = require("crypto");

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

		// Get the registration email content
		const { subject, text, html } = EmailTemplates.registrationEmail(
			user.name,
			user.username,
			user.phone
		);

		console.log(subject, text);

		// Send the email
		await EmailService.sendEmail(user.email, subject, text, html);

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

exports.forgotPassword = async (req, res) => {
	try {
		const { email } = req.body;

		// Find the user by email
		const user = await User.findOne({ email });
		if (!user) {
			return res
				.status(404)
				.json({ message: "User with this email does not exist." });
		}

		// Generate a reset token
		const resetToken = crypto.randomBytes(32).toString("hex");

		// Hash the token and set it in the user's record with an expiry time
		const hashedToken = crypto
			.createHash("sha256")
			.update(resetToken)
			.digest("hex");
		user.passwordResetToken = hashedToken;
		user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes
		await user.save();

		// Generate the reset link
		const resetURL = `${process.env.FRONTEND_RESET_PASSWORD_URL}/${resetToken}`;

		// Prepare email content
		const { subject, text, html } = EmailTemplates.forgotPasswordEmail(
			user.username,
			resetURL
		);

		// Send the reset email
		await EmailService.sendEmail(user.email, subject, text, html);

		res
			.status(200)
			.json({ message: "Password reset link has been sent to your email." });
	} catch (error) {
		console.error("Error in forgotPassword:", error);
		res.status(500).json({ message: "An error occurred. Please try again." });
	}
};

exports.resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		// Hash the token to find the user
		const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

		// Find the user with the token and check if it's still valid
		const user = await User.findOne({
			passwordResetToken: hashedToken,
			passwordResetExpires: { $gt: Date.now() }, // Check if the token is not expired
		});

		if (!user) {
			return res.status(400).json({ message: "Invalid or expired token." });
		}

		// Update the password and clear the reset token fields
		user.password = password; // The pre-save hook will hash this
		user.passwordResetToken = undefined; // Clear the reset token
		user.passwordResetExpires = undefined; // Clear the token expiry
		await user.save();

		res.status(200).json({ message: "Password has been reset successfully." });
	} catch (error) {
		console.error("Error in resetPassword:", error);
		res.status(500).json({ message: "An error occurred. Please try again." });
	}
};
