const mongoose = require("mongoose");
const Review = require("./ReviewModel");

const productSchema = new mongoose.Schema(
	{
		productCode: {
			type: String,
			required: [true, "Product code is required"],
			trim: true,
			unique: true,
		},
		name: {
			type: String,
			required: [true, "Product name is required"],
			trim: true,
		},
		description: {
			type: String,
			required: [true, "Product description is required"],
			trim: true,
		},
		price: {
			type: Number,
			required: [true, "Product price is required"],
			min: [0, "Price must be a positive number"],
		},
		images: [
			{
				type: String,
			},
		],
		category: [
			{
				type: String,
				trim: true,
				default: "normal",
				enum: [
					"normal",
					"limited-edition",
					"evergreen-classic",
					"most-loved-style",
				],
			},
		],
		brand: {
			type: String,
			trim: true,
			default: null,
		},
		stock: {
			type: Number,
			required: [true, "Stock count is required"],
			min: [0, "Stock must be a non-negative number"],
			default: 0,
		},
		sizes: [
			{
				type: String,
				trim: true, // Example: "S", "M", "L", "XL"
			},
		],
		colors: [
			{
				type: String,
				trim: true, // Example: "Red", "Blue", "Green"
			},
		],
		fits: [
			{
				type: String,
				trim: true, // Example: "Slim", "Regular", "Relaxed"
			},
		],
		averageRating: {
			type: Number,
			default: 0, // Default rating is 0 if no reviews exist
			min: [0, "Rating must be at least 0"],
			max: [5, "Rating cannot exceed 5"],
		},
	},
	{ timestamps: true }
);

// Calculate the average rating after a review is added
productSchema.methods.calculateAverageRating = async function () {
	const reviews = await Review.find({ product: this._id });
	if (reviews.length > 0) {
		const average =
			reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
		this.averageRating = Math.round(average * 10) / 10; // Round to 1 decimal place
	} else {
		this.averageRating = 0;
	}
	await this.save();
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
