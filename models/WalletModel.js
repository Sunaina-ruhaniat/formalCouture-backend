const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
	referralBalance: { type: Number, default: 0 }, // Balance for referral rewards
	exchangeBalance: { type: Number, default: 0 }, // Balance for exchange transactions
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User owning this wallet
	lock: { type: Boolean, default: false }, // Lock field for wallet discounts
	createdAt: { type: Date, default: Date.now }, // Wallet creation timestamp
});

module.exports = mongoose.model("Wallet", walletSchema);
