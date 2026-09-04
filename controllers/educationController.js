// controllers/educationController.js
import EducationRequest from "../models/educationRequestModel.js";
import ProgramBooking from "../models/programBookingModel.js";
import User from "../models/userModel.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Create education program request
export const createEducationRequest = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      organization,
      message,
      programType,
      preferredDate,
      participants
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and phone are required"
      });
    }

    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Create education request
    const educationRequest = await EducationRequest.create({
      user: req.user.id,
      name,
      email,
      phone,
      organization: organization || "",
      message: message || "",
      programType: programType || "community",
      preferredDate: preferredDate || null,
      participants: participants || 0,
      status: "pending"
    });

    // Send notification email to admin
    await sendNotificationEmail(educationRequest);

    res.status(201).json({
      success: true,
      message: "Education program request submitted successfully! We'll contact you within 24 hours.",
      request: educationRequest
    });

  } catch (err) {
    console.error("Error creating education request:", err);
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      error: err.message || "Failed to submit education request"
    });
  }
};

// ============ PROGRAM BOOKING FUNCTIONS ============

// Book program with payment
export const bookProgram = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      programId,
      programTitle,
      programCost,
      bookingData
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed"
      });
    }

    // Create booking record
    const booking = await ProgramBooking.create({
      user: req.user.id,
      programId,
      programTitle,
      programCost,
      bookingData,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "confirmed"
    });

    // Populate user details
    const user = await User.findById(req.user.id);
    const populatedBooking = await ProgramBooking.findById(booking._id).populate("user", "name email phone");

    // Send confirmation email to user
    await sendBookingConfirmationEmail(user, populatedBooking);

    // Send notification email to admin
    await sendAdminBookingNotification(user, populatedBooking);

    res.status(201).json({
      success: true,
      message: "Program booked successfully",
      booking: populatedBooking
    });

  } catch (err) {
    console.error("Error booking program:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to book program"
    });
  }
};

// Send confirmation email to user
export const sendConfirmationEmail = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await ProgramBooking.findById(bookingId).populate("user", "name email phone");
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found"
      });
    }

    await sendBookingConfirmationEmail(booking.user, booking);

    res.json({
      success: true,
      message: "Confirmation email sent successfully"
    });
  } catch (err) {
    console.error("Error sending confirmation email:", err);
    res.status(500).json({
      success: false,
      error: "Failed to send confirmation email"
    });
  }
};

// ============ HELPER EMAIL FUNCTIONS ============

// Send booking confirmation email to user
const sendBookingConfirmationEmail = async (user, booking) => {
  try {
    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const programDetails = booking.bookingData || {};
    const bookingDate = programDetails.date ? new Date(programDetails.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not specified';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `✅ Program Booking Confirmed: ${booking.programTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: linear-gradient(135deg, #22c55e, #0d9488); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
            .booking-details { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #4b5563; }
            .value { color: #1f2937; }
            .important { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .important-title { color: #92400e; font-weight: 700; display: flex; align-items: center; gap: 8px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
            .btn { display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .btn:hover { background: #16a34a; }
            .program-icon { font-size: 48px; text-align: center; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌱 Booking Confirmed!</h1>
              <p>Your program has been successfully booked</p>
            </div>
            <div class="content">
              <div class="program-icon">${booking.programId === 'workshop' ? '🤝' : '♻️'}</div>
              <h2 style="text-align: center; color: #1f2937;">${booking.programTitle}</h2>
              
              <div class="booking-details">
                <h3 style="margin-top: 0; color: #16a34a;">📋 Booking Details</h3>
                <div class="detail-row">
                  <span class="label">Booking ID</span>
                  <span class="value">#${booking._id.toString().slice(-6).toUpperCase()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Program</span>
                  <span class="value">${booking.programTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Date</span>
                  <span class="value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Time</span>
                  <span class="value">${programDetails.time || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Participants</span>
                  <span class="value">${programDetails.participants || 1}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Amount Paid</span>
                  <span class="value" style="font-weight: 700; color: #16a34a;">₹${booking.programCost}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Payment ID</span>
                  <span class="value" style="font-size: 12px;">${booking.paymentId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Status</span>
                  <span class="value" style="color: #16a34a; font-weight: 600;">✅ Confirmed</span>
                </div>
              </div>

              <div class="important">
                <div class="important-title">⚠️ Important: Non-Refundable</div>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">
                  Please note that this booking is <strong>non-refundable</strong>. 
                  If you need to reschedule, please contact us at least 48 hours in advance.
                </p>
              </div>

              <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0; color: #1e40af;">📍 Program Location</h4>
                <p style="margin: 5px 0 0; color: #1e3a8a;">
                  Kind Earth Recycling Center<br>
                  Kind Earth<br>
                  India
                </p>
                <p style="margin: 10px 0 0; font-size: 14px; color: #1e40af;">
                  📞 For queries: +91 9878165432
                </p>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL}/programs" class="btn">View My Programs</a>
              </div>

              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0; color: #16a34a;">📝 What to Bring</h4>
                <ul style="margin: 8px 0 0; padding-left: 20px; color: #4b5563;">
                  <li>✓ Comfortable clothing</li>
                  <li>✓ Water bottle</li>
                  <li>✓ Notebook for notes</li>
                  <li>✓ Enthusiasm to learn! 🌟</li>
                </ul>
              </div>

              <div class="footer">
                <p>Thank you for choosing Kind Earth! Together, we're making a difference. ♻️</p>
                <p style="font-size: 12px; color: #9ca3af;">
                  This is an automated confirmation email. Please do not reply to this email.
                </p>
                <p style="font-size: 12px; color: #9ca3af;">
                  © ${new Date().getFullYear()} Kind Earth. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to ${user.email}`);

  } catch (err) {
    console.error("Error sending booking confirmation email:", err);
    // Don't throw error - we don't want to fail the booking if email fails
  }
};

// Send admin notification for new booking
const sendAdminBookingNotification = async (user, booking) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const programDetails = booking.bookingData || {};
    const bookingDate = programDetails.date ? new Date(programDetails.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not specified';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@kindearth.org',
      subject: `📢 New Program Booking: ${booking.programTitle}`,
      html: `
        <h2>New Program Booking Confirmed</h2>
        <p><strong>Program:</strong> ${booking.programTitle}</p>
        <p><strong>Booking ID:</strong> #${booking._id.toString().slice(-6).toUpperCase()}</p>
        <p><strong>User:</strong> ${user.name} (${user.email})</p>
        <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
        <p><strong>Organization:</strong> ${programDetails.organization || 'Not specified'}</p>
        <p><strong>Date:</strong> ${bookingDate}</p>
        <p><strong>Time:</strong> ${programDetails.time || 'Not specified'}</p>
        <p><strong>Participants:</strong> ${programDetails.participants || 1}</p>
        <p><strong>Amount:</strong> ₹${booking.programCost}</p>
        <p><strong>Payment ID:</strong> ${booking.paymentId}</p>
        <p><a href="${process.env.FRONTEND_URL}/admin/bookings/${booking._id}">View Booking Details</a></p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification sent`);

  } catch (err) {
    console.error("Error sending admin notification:", err);
  }
};

// Send notification email to admin for education request
const sendNotificationEmail = async (request) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@kindearth.org',
      subject: 'New Education Program Request',
      html: `
        <h2>New Education Program Request</h2>
        <p><strong>Name:</strong> ${request.name}</p>
        <p><strong>Email:</strong> ${request.email}</p>
        <p><strong>Phone:</strong> ${request.phone}</p>
        <p><strong>Organization:</strong> ${request.organization || 'Not specified'}</p>
        <p><strong>Program Type:</strong> ${request.programType}</p>
        <p><strong>Message:</strong> ${request.message || 'No message provided'}</p>
        <p><strong>Status:</strong> ${request.status}</p>
        <p><strong>Submitted:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
        <a href="${process.env.FRONTEND_URL}/admin/education/${request._id}">View Request</a>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Error sending notification email:', err);
  }
};

// Send status update email to user
const sendStatusUpdateEmail = async (request) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const statusMessages = {
      pending: 'We have received your request and it is being reviewed.',
      reviewing: 'Our team is reviewing your request and will contact you soon.',
      scheduled: 'Your program has been scheduled. We will reach out with details.',
      completed: 'Your program has been completed. Thank you for participating!',
      cancelled: 'Your program request has been cancelled. Please contact us for more information.'
    };

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: request.email,
      subject: `Education Program Request Status Update - ${request.status}`,
      html: `
        <h2>Education Program Request Update</h2>
        <p>Dear ${request.name},</p>
        <p>Your education program request has been updated.</p>
        <p><strong>Status:</strong> ${request.status.toUpperCase()}</p>
        <p>${statusMessages[request.status] || 'Please check your request status.'}</p>
        ${request.workshopBooked ? '<p><strong>🎉 Workshop has been booked!</strong></p>' : ''}
        ${request.workshopDate ? `<p><strong>Workshop Date:</strong> ${new Date(request.workshopDate).toLocaleDateString()}</p>` : ''}
        ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
        <p>Thank you for your interest in our education program!</p>
        <p>Best regards,<br>Kind Earth Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Error sending status update email:', err);
  }
};

// ============ GET FUNCTIONS ============

// Get all education requests (admin only)
export const getAllEducationRequests = async (req, res) => {
  try {
    const requests = await EducationRequest.find()
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (err) {
    console.error("Error fetching education requests:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch education requests"
    });
  }
};

// Get user's education requests
export const getUserEducationRequests = async (req, res) => {
  try {
    const requests = await EducationRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (err) {
    console.error("Error fetching user education requests:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch your education requests"
    });
  }
};

// Get single education request
export const getEducationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await EducationRequest.findOne({
      _id: id,
      user: req.user.id
    }).populate("assignedTo", "name email");

    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Education request not found"
      });
    }

    res.json({
      success: true,
      request
    });
  } catch (err) {
    console.error("Error fetching education request:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch education request"
    });
  }
};

// Update education request status (admin only)
export const updateEducationRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo, workshopDate, workshopBooked } = req.body;

    const request = await EducationRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Education request not found"
      });
    }

    if (status) request.status = status;
    if (notes) request.notes = notes;
    if (assignedTo) request.assignedTo = assignedTo;
    if (workshopDate) request.workshopDate = workshopDate;
    if (workshopBooked !== undefined) request.workshopBooked = workshopBooked;

    await request.save();

    if (status) {
      await sendStatusUpdateEmail(request);
    }

    res.json({
      success: true,
      message: "Education request updated successfully",
      request
    });

  } catch (err) {
    console.error("Error updating education request:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update education request"
    });
  }
};

// Delete education request (admin only)
export const deleteEducationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await EducationRequest.findByIdAndDelete(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Education request not found"
      });
    }

    res.json({
      success: true,
      message: "Education request deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting education request:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete education request"
    });
  }
};

// Get education request statistics (admin only)
export const getEducationStats = async (req, res) => {
  try {
    const totalRequests = await EducationRequest.countDocuments();
    const pendingRequests = await EducationRequest.countDocuments({ status: "pending" });
    const reviewingRequests = await EducationRequest.countDocuments({ status: "reviewing" });
    const scheduledRequests = await EducationRequest.countDocuments({ status: "scheduled" });
    const completedRequests = await EducationRequest.countDocuments({ status: "completed" });
    const cancelledRequests = await EducationRequest.countDocuments({ status: "cancelled" });

    const workshopBooked = await EducationRequest.countDocuments({ workshopBooked: true });

    const programTypeBreakdown = await EducationRequest.aggregate([
      { $group: { _id: "$programType", count: { $sum: 1 } } }
    ]);

    const monthlyRequests = await EducationRequest.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      stats: {
        totalRequests,
        pendingRequests,
        reviewingRequests,
        scheduledRequests,
        completedRequests,
        cancelledRequests,
        workshopBooked,
        programTypeBreakdown,
        monthlyRequests
      }
    });

  } catch (err) {
    console.error("Error fetching education stats:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch education statistics"
    });
  }
};

// Get user's program bookings
export const getUserProgramBookings = async (req, res) => {
  try {
    const bookings = await ProgramBooking.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookings"
    });
  }
};

// Get single program booking
export const getProgramBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await ProgramBooking.findOne({
      _id: id,
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Booking not found"
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch booking"
    });
  }
};