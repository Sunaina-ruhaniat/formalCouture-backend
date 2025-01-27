const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const { authMiddleware } = require("../middleware/AuthMiddleware");

// Routes
router.post("/create-review", authMiddleware, ReviewController.createReview);
router.get("/get-reviews/:productId", ReviewController.getReviewsByProduct);
router.get(
	"/get-user-reviews/:userId",
	authMiddleware,
	ReviewController.getReviewsByUser
);
router.put(
	"/update-review/:reviewId",
	authMiddleware,
	ReviewController.updateReview
);
router.delete(
	"/delete-review/:reviewId",
	authMiddleware,
	ReviewController.deleteReview
);

module.exports = router;
