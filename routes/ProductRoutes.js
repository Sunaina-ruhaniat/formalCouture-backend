const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/ProductController");
const {
	authMiddleware,
	adminMiddleware,
} = require("../middleware/AuthMiddleware");
const { uploadMiddleware } = require("../middleware/GridfsStorageMiddleware");

router.post(
	"/create-product",
	authMiddleware,
	adminMiddleware,
	uploadMiddleware.array("images"),
	ProductController.createProduct
);
router.get("/get-products", ProductController.getProducts);
router.get("/:id", ProductController.getProduct);

router.put(
	"/update-product/:id",
	authMiddleware,
	adminMiddleware,
	uploadMiddleware.array("images"),
	ProductController.updateProduct
);

router.delete(
	"/delete-product/:id",
	authMiddleware,
	adminMiddleware,
	ProductController.deleteProduct
);

module.exports = router;
