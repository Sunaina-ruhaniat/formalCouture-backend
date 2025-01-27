const Review = require("../models/ReviewModel");
const Product = require("../models/ProductModel");

// Create a new review
exports.createReview = async (req, res) => {
	try {
		const { productId, rating, comment } = req.body;
		const user = req.user;

		// Ensure the product exists
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}

		// Check if the user already reviewed this product
		const existingReview = await Review.findOne({
			product: productId,
			user: user._id,
		});
		if (existingReview) {
			return res
				.status(400)
				.json({ message: "You have already reviewed this product." });
		}

		// Create a new review
		const review = new Review({
			product: productId,
			user: user._id,
			rating: parseFloat(rating),
			comment,
		});

		await review.save();
		await product?.calculateAverageRating();
		const reviewPopulate = await Review.findById(review._id).populate(
			"user",
			"name username"
		);

		res.status(201).json({
			message: "Review created successfully.",
			review: reviewPopulate,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "An error occurred.", error });
	}
};

// Get all reviews for a product with pagination
exports.getReviewsByProduct = async (req, res) => {
	try {
		const { productId } = req.params;

		// Extract pagination parameters from the query string
		const { page = 1, limit = 20 } = req.query;

		// Ensure page and limit are integers
		const pageNumber = parseInt(page, 10);
		const limitNumber = parseInt(limit, 10);

		// Calculate the number of documents to skip
		const skip = (pageNumber - 1) * limitNumber;

		// Fetch reviews with pagination and populate user data
		const reviews = await Review.find({ product: productId })
			.skip(skip)
			.limit(limitNumber)
			.populate("user", "name username")
			.sort({ createdAt: -1 });

		// Get the total count of reviews for the product
		const totalReviews = await Review.countDocuments({ product: productId });

		// Send response with pagination details
		res.status(200).json({
			reviews,
			totalReviews,
			currentPage: pageNumber,
			totalPages: Math.ceil(totalReviews / limitNumber),
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "An error occurred.", error });
	}
};

// Get all reviews by a user with pagination
exports.getReviewsByUser = async (req, res) => {
	try {
		const { userId } = req.params; // User ID from the request params
		const requester = req.user; // Authenticated user

		// Check if the requester is either an admin or requesting their own reviews
		if (requester.role !== "admin" && requester._id.toString() !== userId) {
			return res.status(403).json({ message: "Access denied." });
		}

		// Extract pagination parameters from the query string
		const { page = 1, limit = 10 } = req.query;

		// Ensure page and limit are integers
		const pageNumber = parseInt(page, 10);
		const limitNumber = parseInt(limit, 10);

		// Calculate the number of documents to skip
		const skip = (pageNumber - 1) * limitNumber;

		// Fetch reviews by the specified user with pagination
		const reviews = await Review.find({ user: userId })
			.skip(skip)
			.limit(limitNumber)
			.populate("product", "name price")
			.populate("user", "name username")
			.sort({ createdAt: -1 }); // Sort by most recent first

		// Get the total count of reviews for the user
		const totalReviews = await Review.countDocuments({ user: userId });

		// Send response with pagination details
		res.status(200).json({
			reviews,
			totalReviews,
			currentPage: pageNumber,
			totalPages: Math.ceil(totalReviews / limitNumber),
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "An error occurred.", error });
	}
};

// Update a review
exports.updateReview = async (req, res) => {
	try {
		const { reviewId } = req.params;
		const { rating, comment } = req.body;
		const user = req.user._id;

		// Find the review and ensure the user owns it
		const review = await Review.findOne({ _id: reviewId, user });
		if (!review) {
			return res.status(404).json({ message: "Review not found." });
		}
		const product = await Product.findById(review.product);
		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}

		// Update the review
		review.rating = rating || review.rating;
		review.comment = comment || review.comment;
		await review.save();
		await product?.calculateAverageRating();
		const reviewPopulate = await Review.findById(review._id).populate(
			"user",
			"name username"
		);

		res.status(200).json({
			message: "Review updated successfully.",
			review: reviewPopulate,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "An error occurred.", error });
	}
};

// Delete a review
exports.deleteReview = async (req, res) => {
	try {
		const { reviewId } = req.params;
		const user = req.user._id;

		// Find the review and ensure the user owns it
		const review = await Review.findOneAndDelete({ _id: reviewId, user });
		if (!review) {
			return res.status(404).json({ message: "Review not found." });
		}
		const product = await Product.findById(review.product);
		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}
		await product?.calculateAverageRating();

		res.status(200).json({ message: "Review deleted successfully." });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "An error occurred.", error });
	}
};
