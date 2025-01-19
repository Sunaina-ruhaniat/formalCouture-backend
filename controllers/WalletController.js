const Wallet = require("../models/WalletModel");
const User = require("../models/UserModel");

// Controller to get wallet details
exports.getWallet = async (req, res) => {
	try {
		const walletId = req.user.wallet;
		let wallet = await Wallet.findById(walletId);

		if (!wallet) {
			const newWallet = await Wallet.create({ user: req.user._id });
			req.user.wallet = newWallet._id;
			await req.user.save();
			wallet = newWallet;
		}

		res.status(200).json({ wallet: wallet });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch wallet" });
	}
};
exports.addExchange = async (req, res) => {
	const { amount, username } = req.body;
	try {
		const user = await User.findOne({ username: username });
		const walletId = user.wallet;
		let wallet = await Wallet.findById(walletId);

		if (!wallet) {
			const newWallet = await Wallet.create({ user: user._id });
			user.wallet = newWallet._id;
			await user.save();
			wallet = newWallet;
		}

		await this.updateWalletBalance(wallet._id, "exchangeBalance", amount, user);

		res
			.status(200)
			.json({ message: `added ammount ${amount} to ${user.username}` });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch wallet" });
	}
};
exports.updateWalletBalance = async (walletId, balanceField, amount, user) => {
	const validFields = ["referralBalance", "exchangeBalance"];
	if (!validFields.includes(balanceField)) {
		throw new Error(`Invalid balance field: ${balanceField}`);
	}

	let wallet = await Wallet.findById(walletId);
	if (!wallet) {
		// throw new Error("Wallet not found");
		const newWallet = await Wallet.create({ user: user._id });
		user.wallet = newWallet._id;
		await user.save();
		wallet = newWallet;
	}

	wallet[balanceField] += amount;
	await wallet.save();
	return wallet;
};

exports.unlockWallet = async (req, res) => {
	try {
		// Get userId from request body
		const { username } = req.body;

		const user = await User.findOne({ username: username });
		// Validate that userId is provided
		if (!user) {
			return res.status(400).json({ error: "user not found" });
		}
		// Find the wallet associated with the user
		const wallet = await Wallet.findOne({ user: user._id });
		if (!wallet) {
			return res
				.status(404)
				.json({ error: "Wallet not found for the provided userId." });
		}

		// Check if the wallet is already unlocked
		if (!wallet.lock) {
			return res.status(200).json({ message: "Wallet is already unlocked." });
		}

		// Unlock the wallet
		wallet.lock = false;
		await wallet.save();

		return res.status(200).json({ message: "Wallet unlocked successfully." });
	} catch (error) {
		console.error("Error unlocking wallet:", error.message);
		res
			.status(500)
			.json({ message: "An error occurred while unlocking the wallet." });
	}
};
