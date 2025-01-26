exports.registrationEmail = (name, username, phone) => ({
	subject: "Welcome to Our E-commerce Platform!",
	text: `Hi ${name},\n\nThank you for registering with us. Your username is ${username} and your phone number is ${phone}.\n\nEnjoy your shopping journey!`,
	html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h1 style="color: #4CAF50;">Welcome, ${name}!</h1>
          <p>
            Thank you for joining our e-commerce platform. Here are your registration details:
          </p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Phone Number:</strong> ${phone}</li>
          </ul>
          <p>
            We're excited to have you on board. Start exploring our wide range of products and enjoy exclusive deals!
          </p>
          <a href="${process.env.FRONTEND_URL}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Start Shopping
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">
            If you have any questions, feel free to reply to this email or visit our
            <a href="${process.env.HELP_CENTER_URL}" style="color: #4CAF50;">Help Center</a>.
          </p>
        </div>
      `,
});

exports.forgotPasswordEmail = (username, resetURL) => ({
	subject: "Password Reset Request",
	text: `Hi ${username},\n\nYou requested a password reset. Please use the link below to reset your password:\n\n${resetURL}\n\nIf you didn't request this, please ignore this email.`,
	html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1 style="color: #4CAF50;">Password Reset Request</h1>
      <p>Hi ${username},</p>
      <p>You requested a password reset. Please use the link below to reset your password:</p>
      <a href="${resetURL}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p style="margin-top: 20px;">If you didn't request this, please ignore this email.</p>
      <p style="color: #777; font-size: 12px;">This link will expire in 15 minutes.</p>
    </div>
  `,
});

exports.orderSuccessEmail = (username, orderId, products, totalAmount) => ({
	subject: `Order #${orderId} - Payment Successful`,
	text: `Hi ${username},\n\nYour payment for Order #${orderId} has been successfully processed. Here are the details of your order:\n\n${products
		.map(
			(product) => `${product.name} (x${product.quantity}) - $${product.price}`
		)
		.join(
			"\n"
		)}\n\nTotal Amount: $${totalAmount}\n\nThank you for shopping with us!`,
	html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1 style="color: #4CAF50;">Order #${orderId} - Payment Successful</h1>
      <p>Hi ${username},</p>
      <p>Your payment for Order #${orderId} has been successfully processed. Below are the details of your order:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Product</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Quantity</th>
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${products
						.map(
							(product) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${product.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${product.quantity}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">$${product.price}</td>
          </tr>`
						)
						.join("")}
        </tbody>
      </table>
      <p style="margin-top: 20px; font-size: 16px;">Total Amount: <strong>$${totalAmount}</strong></p>
      <p style="margin-top: 20px;">Thank you for shopping with us! If you have any questions, feel free to reply to this email.</p>
    </div>
  `,
});
