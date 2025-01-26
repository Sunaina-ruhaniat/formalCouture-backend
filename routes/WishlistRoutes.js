const express = require("express");
const router = express.Router();
const WishlistController = require("../controllers/WishlistController");
const { authMiddleware } = require("../middleware/AuthMiddleware");

router.get("/get-wishlist", authMiddleware, WishlistController.getWishlist);
router.post(
	"/add-to-wishlist",
	authMiddleware,
	WishlistController.addToWishlist
);
router.put(
	"/remove-from-wishlist",
	authMiddleware,
	WishlistController.removeFromWishlist
);

router.get("/guest/get-wishlist", WishlistController.getWishlist);
router.post("/guest/add-to-wishlist", WishlistController.addToWishlist);
router.put(
	"/guest/remove-from-wishlist",
	WishlistController.removeFromWishlist
);

module.exports = router;
