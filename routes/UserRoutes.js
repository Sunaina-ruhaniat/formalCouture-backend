const express = require("express");
const router = express.Router();
const UserController = require("../controllers/UserController");
const {
	authMiddleware,
	adminMiddleware,
} = require("../middleware/AuthMiddleware");

router.get("/get-user", authMiddleware, UserController.user);
router.get(
	"/get-all-users",
	authMiddleware,
	adminMiddleware,
	UserController.getAllUsers
);
router.post("/change-password", authMiddleware, UserController.changePassword);

module.exports = router;
