const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");

exports.user = async (req, res) => {
	try {
		// const user = await User.findById(req.user._id).lean();

		return res.status(200).json({ user: req.user });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ error: error, message: error?.message });
	}
};

exports.getAllUsers = async (req, res) => {
	try {
		// Extract query parameters for pagination
		const { page = 1, limit = 20 } = req.query;

		// Convert query parameters to numbers
		const pageNumber = parseInt(page, 10);
		const pageSize = parseInt(limit, 10);

		if (pageNumber <= 0 || pageSize <= 0) {
			return res
				.status(400)
				.json({ message: "Page and limit must be positive integers." });
		}

		// Calculate the number of users to skip
		const skip = (pageNumber - 1) * pageSize;

		// Fetch users with pagination
		const users = await User.find()
			.sort({ createdAt: -1 }) // Sort users by creation date (newest first)
			.skip(skip)
			.limit(pageSize);

		// Get total number of users for pagination metadata
		const totalUsers = await User.countDocuments();

		// Return paginated data with metadata
		res.status(200).json({
			page: pageNumber,
			limit: pageSize,
			totalPages: Math.ceil(totalUsers / pageSize),
			totalUsers,
			users,
		});
	} catch (error) {
		console.error("Error in getAllUsers:", error);
		res.status(500).json({ message: "An error occurred. Please try again." });
	}
};

exports.changePassword = async (req, res) => {
	try {
		const { oldPassword, newPassword } = req.body;

		// Ensure required fields are provided
		if (!oldPassword || !newPassword) {
			return res
				.status(400)
				.json({ message: "Both old and new passwords are required." });
		}

		// Ensure the user is authenticated and fetched by the `authMiddleware`
		const user = req.user;

		// Check if the old password matches the current password
		const isMatch = await bcrypt.compare(oldPassword, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Old password is incorrect." });
		}

		// Check if the new password is the same as the old password
		if (oldPassword === newPassword) {
			return res.status(400).json({
				message: "New password cannot be the same as the old password.",
			});
		}

		// Update the password
		user.password = newPassword; // The pre-save middleware will hash this
		await user.save();

		res
			.status(200)
			.json({ message: "Password has been changed successfully." });
	} catch (error) {
		console.error("Error in changePassword:", error);
		res.status(500).json({ message: "An error occurred. Please try again." });
	}
};
