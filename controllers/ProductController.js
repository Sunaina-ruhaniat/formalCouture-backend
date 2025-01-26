const Product = require("../models/ProductModel");
const multer = require("multer");

// Controller for creating a product
exports.createProduct = async (req, res) => {
	try {
		const {
			productCode,
			name,
			description,
			price,
			category,
			brand,
			stock,
			sizes,
			colors,
			fits,
		} = req.body;

		// Array to store image references
		let imageUrls = [];

		// Handle image uploads and store their references in GridFS
		if (req.files && req.files.length > 0) {
			for (const file of req.files) {
				// Construct URL for accessing the file through GridFS (example URL)
				const fileUrl = `/file/${file.filename}`; // Customize this URL based on how you serve files
				imageUrls.push(fileUrl);
			}
		}

		// Convert comma-separated strings to arrays
		const categoryArray = category
			? category.split(",").map((s) => s.trim())
			: [];
		const sizesArray = sizes ? sizes.split(",").map((s) => s.trim()) : [];
		const colorsArray = colors ? colors.split(",").map((c) => c.trim()) : [];
		const fitsArray = fits ? fits.split(",").map((f) => f.trim()) : [];

		const product = await Product.create({
			productCode,
			name,
			description,
			price,
			category: categoryArray,
			brand,
			stock,
			// sizes: JSON.parse(sizes || "[]"), // Convert sizes string to array
			// colors: JSON.parse(colors || "[]"), // Convert colors string to array
			// fits: JSON.parse(fits || "[]"), // Convert sizes string to array
			sizes: sizesArray,
			colors: colorsArray,
			fits: fitsArray,
			images: imageUrls,
		});

		await product.save();
		res.status(201).json({ message: "Product created successfully", product });
	} catch (error) {
		handleError(error, res);
	}
};

// Controller for getting all products (paginated)
exports.getProducts = async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			category,
			brand,
			color,
			fit,
			size,
			search,
		} = req.query;

		const filters = {};
		// if (category) filters.category = category;
		if (brand) filters.brand = brand;

		// Check for array filters and use the $in operator to match any element in the array
		if (category) filters.category = { $in: [category] }; // Match if color is in the colors array
		if (color) filters.colors = { $in: [color] }; // Match if color is in the colors array
		if (fit) filters.fits = { $in: [fit] }; // Match if fit is in the fits array
		if (size) filters.sizes = { $in: [size] }; // Match if size is in the sizes array

		// Add search for name
		if (search) {
			filters.$or = [
				{ name: { $regex: search, $options: "i" } }, // Case-insensitive search in name
				{ productCode: { $regex: search, $options: "i" } }, // Case-insensitive search in productCode
				{ description: { $regex: search, $options: "i" } }, // Case-insensitive search in description
			];
		}
		console.log(filters);
		const products = await Product.find(filters)
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.exec();

		const totalProducts = await Product.countDocuments(filters);
		res.status(200).json({
			products,
			totalProducts,
			currentPage: parseInt(page),
			totalPages: Math.ceil(totalProducts / limit),
		});
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error fetching products", error: error.message });
	}
};

// Controller for getting a single product
exports.getProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}
		res.status(200).json({ product: product });
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error fetching product", error: error.message });
	}
};

// Controller for updating a product
exports.updateProduct = async (req, res) => {
	try {
		const {
			name,
			description,
			price,
			category,
			brand,
			stock,
			sizes,
			colors,
			fits,
			removeImages,
		} = req.body;

		const product = await Product.findById(req.params.id);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		let imageUrls = product.images;

		// Remove specified images
		// if (removeImages) {
		// 	const imagesToRemove = JSON.parse(removeImages || "[]");
		// 	imageUrls = imageUrls.filter((url) => !imagesToRemove.includes(url));
		// }
		if (removeImages) {
			const imagesToRemove = removeImages
				? removeImages.split(",").map((i) => i.trim())
				: [];
			imageUrls = imageUrls.filter((url) => !imagesToRemove.includes(url));
		}

		// Add new images from request
		if (req.files && req.files.length > 0) {
			for (const file of req.files) {
				const fileUrl = `/file/${file.filename}`;
				imageUrls.push(fileUrl);
			}
		}
		// Convert comma-separated strings to arrays
		const categoryArray = category
			? category.split(",").map((s) => s.trim())
			: product.category;
		const sizesArray = sizes
			? sizes.split(",").map((s) => s.trim())
			: product.sizes;
		const colorsArray = colors
			? colors.split(",").map((c) => c.trim())
			: product.colors;
		const fitsArray = fits
			? fits.split(",").map((f) => f.trim())
			: product.fits;

		product.name = name || product.name;
		product.description = description || product.description;
		product.price = price || product.price;
		// product.category = category || product.category;
		product.brand = brand || product.brand;
		product.stock = stock || product.stock;
		// product.sizes = JSON.parse(sizes || "[]") || product.sizes;
		// product.colors = JSON.parse(colors || "[]") || product.colors;
		// product.fits = JSON.parse(fits || "[]") || product.fits;
		product.sizes = sizesArray;
		product.colors = colorsArray;
		product.fits = fitsArray;
		product.category = categoryArray;
		product.images = imageUrls;

		await product.save();
		res.status(200).json({ message: "Product updated successfully", product });
	} catch (error) {
		handleError(error, res);
	}
};

// Controller for deleting a product
exports.deleteProduct = async (req, res) => {
	try {
		const { id } = req.params;
		console.log(id);
		const product = await Product.findByIdAndDelete(id);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		res.status(200).json({ message: "Product deleted successfully" });
	} catch (error) {
		res
			.status(500)
			.json({ message: "Error deleting product", error: error.message });
	}
};

// Common error handler
const handleError = (error, res) => {
	if (error instanceof multer.MulterError) {
		if (error.code === "LIMIT_FILE_SIZE") {
			return res
				.status(400)
				.json({ message: "File size exceeds limit of 10MB" });
		}
		return res
			.status(400)
			.json({ message: "File upload error", error: error.message });
	}
	res.status(500).json({ message: "An error occurred", error: error.message });
};
