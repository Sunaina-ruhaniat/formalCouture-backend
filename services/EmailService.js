const nodemailer = require("nodemailer");

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS,
	},
});

// Function to send an email
exports.sendEmail = async (to, subject, text, html) => {
	const mailOptions = {
		from: process.env.GMAIL_USER,
		to,
		subject,
		text,
		html,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("Email sent: ", info.response);
	} catch (error) {
		console.error("Error sending email: ", error);
	}
};
