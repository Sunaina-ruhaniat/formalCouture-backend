const express = require("express");
const router = express.Router();
// const { gfs } = require("../middleware/GridfsStorageMiddleware");
const mongoose = require("mongoose");

const conn = mongoose.connection;
let gfs;
conn.once("open", async () => {
	// Create the GridFS stream object
	console.log("GridFS stream created");
	gfs = new mongoose.mongo.GridFSBucket(conn.db, {
		bucketName: "uploads",
	});
});

router.get("/:filename", async (req, res) => {
	const { filename } = req.params;
	try {
		const file = await gfs.find({ filename: filename }).toArray();
		if (!file.length) {
			return res.status(404).json({ message: "File not found" });
		}
		res.set("Content-Type", file[0].contentType);
		const readstream = gfs.openDownloadStream(file[0]._id);
		readstream.on("data", (chunk) => {
			console.log("Sending chunk of data");
		});
		readstream.on("end", () => {
			console.log("Finished sending image");
		});
		readstream.pipe(res);
	} catch (error) {
		console.error(error);
		res.status(404).json({ message: "File not found" });
	}
});

module.exports = router;
