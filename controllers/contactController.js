// controllers/contactController.js
import nodemailer from "nodemailer";

export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send email to admin
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@kindearth.org',
      subject: `New Contact Message: ${subject || 'No Subject'}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
        <p><strong>Sent from:</strong> ${req.user?.email || 'Guest'}</p>
        <p><strong>User ID:</strong> ${req.user?.id || 'Not logged in'}</p>
      `
    };

    // Send auto-reply to user
    const autoReplyOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'We received your message - Kind Earth',
      html: `
        <h2>Thank you for contacting us! 🌱</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you within 24 hours.</p>
        <p><strong>Your message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
        <p>In the meantime, feel free to explore our website:</p>
        <ul>
          <li><a href="${process.env.FRONTEND_URL}/products">Browse 3D Printing Products</a></li>
          <li><a href="${process.env.FRONTEND_URL}/recycling">Start Recycling</a></li>
          <li><a href="${process.env.FRONTEND_URL}/learn">Learn About Recycling</a></li>
        </ul>
        <p>Best regards,<br>Kind Earth Team</p>
      `
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(mailOptions),
      transporter.sendMail(autoReplyOptions)
    ]);

    res.status(201).json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon."
    });

  } catch (err) {
    console.error("Error sending contact message:", err);
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
};