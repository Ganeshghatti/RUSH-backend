import { transporter } from "./../../config/email-transporter";
import bcrypt from "bcrypt";
import User from "../../models/user/user-model";
import { Request, Response } from "express";
import validator from "validator";
import ResetPassword from "../../models/reset-password-model";
import crypto from "crypto";

export const sendResetPasswordLink = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      res
        .status(400)
        .json({ success: false, message: "Valid email is required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const existingToken = await ResetPassword.findOne({ email });
    if (existingToken) {
      res
        .status(400)
        .json({
          success: false,
          message:
            "An email reset link has already been sent to this email address. Please wait 10 minutes.",
        });
      return;
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    const resetLink = `${process.env.DOMAIN_NAME}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Reset your RushDr password",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>This link is valid for 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    // Store token in DB
    await ResetPassword.create({ email, token });

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Error sending reset link:", error);
    res.status(500).json({
      success: false,
      message: "Server error while sending reset link",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
      return;
    }

    const resetEntry = await ResetPassword.findOne({ token });
    if (!resetEntry) {
      res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
      return;
    }

    const user = await User.findOne({ email: resetEntry.email });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // this will update based on role pass. 
    // user.password = hashedPassword;
    await user.save();

    // Delete token after use
    await ResetPassword.deleteOne({ token });

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
};
