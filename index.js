const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const cookieParser = require("cookie-parser");
const http = require("http");
const app = express();
require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongo");

const store = new MongoStore({
	mongoUrl: process.env.MONGODB_URI,
	dbName: process.env.DB_NAME,
});

const UserRoutes = require("./routes/UserRoutes");
const ProductRoutes = require("./routes/ProductRoutes");
const CartRoutes = require("./routes/CartRoutes");
const WishlistRoutes = require("./routes/WishlistRoutes");
const AuthRoutes = require("./routes/AuthRoutes");
const FileRoutes = require("./routes/FileRoutes");
const WalletRoutes = require("./routes/WalletRoutes");
const ReferralRoutes = require("./routes/ReferralRoutes");
const OrderRoutes = require("./routes/OrderRoutes");
const { authMiddleware } = require("./middleware/authMiddleware");

app.use(cookieParser());
app.use(
	cors({
		// origin: "http://localhost:5173", // Adjust to match your React frontend's URL
		origin: (origin, callback) => {
			if (!origin || origin.startsWith("http://localhost")) {
				callback(null, true); // Allow any localhost origin
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true, // This is important to allow cookies to be sent
	})
);
// app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
	session({
		store: store, // Use MongoDB store for sessions
		secret: process.env.SESSION_SECRET, // Replace with a secure key
		resave: false, // Avoid resaving session if unmodified
		saveUninitialized: false, // Avoid saving empty sessions
		cookie: {
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000,
		}, // Use secure : true in https
	})
);

mongoose
	.connect(process.env.MONGODB_URI, {
		dbName: process.env.DB_NAME,
		// useUnifiedTopology: true,
		// useNewUrlParser: true,
		// createIndexes: true,
	})
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.log("Could not connect to MongoDB", err));

const server = http.createServer(app);

app.use("/ping", (req, res) => {
	return res.status(200).json({ status: "pong" });
});

app.use("/api/auth", AuthRoutes);
app.use("/api/user", authMiddleware, UserRoutes);
app.use("/api/product", ProductRoutes);
app.use("/api/cart", CartRoutes);
app.use("/api/wishlist", WishlistRoutes);
app.use("/api/wallet", WalletRoutes);
app.use("/api/order", OrderRoutes);
app.use("/file", FileRoutes);
app.use("/referral", ReferralRoutes);

// 404 For Rest
app.all("*", (req, res, next) => {
	res.status(404).send("Not Found");
});

const listener = server.listen(process.env.PORT || 8000, () => {
	console.log("Your app is listening on port " + listener.address().port);
});
