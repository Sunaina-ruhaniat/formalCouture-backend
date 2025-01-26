const express = require("express");
const router = express.Router();
const ReferralController = require("../controllers/ReferralController");
const { authMiddleware } = require("../middleware/AuthMiddleware");

router.post(
	"/generate-referral",
	authMiddleware,
	ReferralController.generateReferral
);
router.post(
	"/redeem-referral/:linkId",
	authMiddleware,
	ReferralController.redeemReferral
);

module.exports = router;
