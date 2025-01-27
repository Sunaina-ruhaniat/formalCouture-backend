// Review Model (models/Review.js)
const mongoose = require("mongoose");
// const Product = require("./ProductModel"); // Import the Product model

const reviewSchema = new mongoose.Schema(
	{
		product: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		rating: {
			type: Number,
			required: [true, "Rating is required"],
			min: [1, "Rating must be at least 1"],
			max: [5, "Rating cannot exceed 5"],
		},
		comment: {
			type: String,
			required: [true, "Comment is required"],
		},
	},
	{ timestamps: true }
);

// // Middleware to update product rating after review save
// reviewSchema.post("save", async function () {
// 	const product = await Product.findById(this.product);
// 	if (product) {
// 		await product.calculateAverageRating(); // Recalculate the average rating
// 	}
// });

// // Middleware to update product rating after review update
// reviewSchema.post("findOneAndUpdate", async function () {
// 	const product = await Product.findById(this._update.product);
// 	if (product) {
// 		await product.calculateAverageRating(); // Recalculate the average rating
// 	}
// });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
