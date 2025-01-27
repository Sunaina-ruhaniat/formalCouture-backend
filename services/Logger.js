const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize } = format;

// Define a custom log format
const customFormat = printf(({ level, message, timestamp, meta }) => {
	const metaString = meta ? ` | meta: ${JSON.stringify(meta)}` : "";
	return `${timestamp} | ${level
		.toUpperCase()
		.toString()} | ${message}${metaString}`;
});

// Create the logger
const logger = createLogger({
	level: "info", // Default log level
	format: combine(
		timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
		// colorize({ all: false }),
		customFormat
	),
	transports: [
		new transports.Console(), // Log to console
		new transports.File({ filename: "logs/error.log", level: "error" }), // Log errors to a file
		new transports.File({ filename: "logs/combined.log" }), // Log all levels to a file
	],
});

module.exports = logger;
