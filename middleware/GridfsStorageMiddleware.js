// gridfsStorage.js
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage").GridFsStorage;
const mongoose = require("mongoose");

const storage = new GridFsStorage({
	url: process.env.MONGODB_URI,
	options: {
		dbName: process.env.DB_NAME,
	},
	file: (req, file) => {
		return {
			bucketName: "uploads", // The GridFS bucket name
			filename: `${Date.now()}-${file.originalname}`, // Unique filename
		};
	},
});

exports.uploadMiddleware = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB in bytes
	fileFilter: (req, file, cb) => {
		// Optionally filter files based on type
		const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
		if (allowedMimeTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error("Invalid file type. Only JPG, PNG, and GIF are allowed."));
		}
	},
});
