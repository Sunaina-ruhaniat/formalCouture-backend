const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		products: [
			{
				product: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Product",
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
					default: 1,
				},
				price: {
					type: Number,
					required: true,
				},
				variant: {
					type: Object,
					default: {}, // Example: { size: "M", color: "Red" }
				},
			},
		],
		shippingAddress: {
			name: { type: String, required: true },
			phone: { type: String, required: true },
			addressLine1: { type: String, required: true },
			addressLine2: { type: String },
			city: { type: String, required: true },
			state: { type: String, required: true },
			country: { type: String, required: true },
			zipCode: { type: String, required: true },
		},
		billingAddress: {
			name: { type: String, required: true },
			phone: { type: String, required: true },
			addressLine1: { type: String, required: true },
			addressLine2: { type: String },
			city: { type: String, required: true },
			state: { type: String, required: true },
			country: { type: String, required: true },
			zipCode: { type: String, required: true },
		},
		totalAmount: {
			type: Number,
			required: true,
		},
		finalAmount: {
			type: Number,
			required: true,
		},
		referralDiscount: {
			type: Number,
			default: 0,
		},
		exchangeDiscount: {
			type: Number,
			default: 0,
		},
		paymentStatus: {
			type: String,
			enum: ["Pending", "Completed", "Failed"],
			default: "Pending",
		},
		paymentDetails: {
			paymentId: { type: String },
			orderId: { type: String },
			paymentSignature: { type: String },
		},
		status: {
			type: String,
			enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
			default: "Processing",
		},
		gift: { type: Boolean, default: false },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
