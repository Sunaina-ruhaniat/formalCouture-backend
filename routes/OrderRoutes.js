const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");
const {
	authMiddleware,
	adminMiddleware,
} = require("../middleware/AuthMiddleware");

// 1. Route to fetch all orders (Admin only)
router.get(
	"/get-all-orders",
	authMiddleware,
	adminMiddleware,
	OrderController.getAllOrders
);

// 2. Route to fetch orders for a specific user (Authenticated users only)
router.get("/get-user-orders", authMiddleware, OrderController.getUserOrders);

// Razorpay webhook to verify payment and create order
router.post("/razorpay/webhook", OrderController.razorpayWebhookHandler);

router.get("/payment-callback", OrderController.paymentCallback);
router.post("/payment-callback", OrderController.paymentCallback);

// Route to create Razorpay order and redirect URL
router.post(
	"/checkout",
	authMiddleware,
	OrderController.createRazorpayOrderAndRedirect
);

// 3. Route to fetch a specific order by its ID
router.get("/get-order/:orderId", authMiddleware, OrderController.getOrderById);

module.exports = router;
