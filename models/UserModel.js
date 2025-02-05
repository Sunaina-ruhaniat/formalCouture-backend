const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Cart = require("../models/CartModel");
const Wishlist = require("../models/WishlistModel");
const Wallet = require("../models/WalletModel");

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		username: {
			type: String,
			required: true,
			unique: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		phone: {
			type: String,
			required: false,
			unique: true,
		},
		password: {
			type: String,
			required: true,
			// select:false,
		},
		image: {
			type: String,
		},
		cart: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Cart",
		},
		wishlist: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Wishlist",
		},
		role: {
			type: String,
			enum: ["customer", "admin"],
			default: "customer",
		},
		wallet: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Wallet",
		},
		passwordResetToken: { type: String },
		passwordResetExpires: { type: Date },
	},
	{
		timestamps: true,
		toJSON: {
			transform: function (doc, ret) {
				delete ret.password;
				return ret;
			},
		},
	}
);

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 12);
	next();
});

// Pre-save hook to create a cart for the user if it doesn't exist
userSchema.pre("save", async function (next) {
	if (this.cart) return next();

	try {
		const newCart = await Cart.create({ user: this._id, products: [] });
		this.cart = newCart._id;
		next();
	} catch (error) {
		return next(error);
	}
});

// Pre-save hook to create a wishlist for the user if it doesn't exist
userSchema.pre("save", async function (next) {
	if (this.wishlist) return next();

	try {
		const newWishlist = await Wishlist.create({ user: this._id, products: [] });
		this.wishlist = newWishlist._id;
		next();
	} catch (error) {
		return next(error);
	}
});

// Pre-save hook to create a wallet for the user if it doesn't exist
userSchema.pre("save", async function (next) {
	if (this.wallet) return next();

	try {
		const newWallet = await Wallet.create({ user: this._id });
		this.wallet = newWallet._id;
		next();
	} catch (error) {
		return next(error);
	}
});

const User = mongoose.model("User", userSchema);

module.exports = User;
