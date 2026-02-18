import { transporter } from "./../../config/email-transporter";
import bcrypt from "bcrypt";
import User from "../../models/user/user-model";
import { Request, Response } from "express";
import validator from "validator";
import ResetPassword from "../../models/reset-password-model";
import crypto from "crypto";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";
import Admin from "../../models/user/admin-model";

export const sendResetPasswordLink = async (req: Request, res: Response) => {
  try {
    const { role, email } = req.body;

    if (!email || !validator.isEmail(email) || !role) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email and role.",
        action: "sendResetPasswordLink:validate-input",
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find an account with that email.",
        action: "sendResetPasswordLink:user-not-found",
      });
      return;
    }

    if (!user.roles.includes(role)) {
      res.status(400).json({
        success: false,
        message: "This account doesn't have access to that role.",
        action: `sendResetPasswordLink:missing-role:${role}`,
      });
      return;
    }

    const existingToken = await ResetPassword.findOne({
      email: normalizedEmail,
      role,
    });
    if (existingToken) {
      const now = Date.now();
      const createdAt = new Date(existingToken.createdAt).getTime();
      if (now - createdAt < 10 * 60 * 1000) {
        res.status(400).json({
          success: false,
          message:
            "We already sent a reset link—please wait a few minutes before requesting another.",
          action: "sendResetPasswordLink:throttled",
        });
        return;
      } else {
        // Token expired, delete it so a new one can be created
        await ResetPassword.deleteOne({ _id: existingToken._id });
      }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    const resetLink = `${process.env.DOMAIN_NAME}/reset-password/${token}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: normalizedEmail,
      subject: "Reset your RUSHDR password",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
            <h2 style="color: #1a73e8; margin-bottom: 16px;">Reset your RUSHDR password</h2>
            <p style="font-size: 15px; color: #333;">
              You requested a password reset. Click the button below to reset your password:
            </p>
            <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
            <p style="font-size: 13px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <span style="word-break: break-all; color: #1a73e8;">${resetLink}</span>
            </p>
            <p style="font-size: 13px; color: #888;">
              This link is valid for <b>10 minutes</b>.
            </p>
            <hr style="margin: 32px 0;">
            <p style="font-size: 12px; color: #bbb;">
              If you did not request this, you can safely ignore this email.<br>
              &copy; ${new Date().getFullYear()} RUSHDR
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    await ResetPassword.create({
      email: normalizedEmail,
      role,
      token,
    });

    res.status(200).json({
      success: true,
      message: "We emailed you a link to reset your password.",
      action: "sendResetPasswordLink:success",
    });
  } catch (error) {
    console.error("Error sending reset link:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't send the reset email right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { newPassword, role } = req.body;

    if (!token || !role) {
      res.status(400).json({
        success: false,
        message: "Token and role are required.",
        action: "resetPassword:validate-input",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
        action: "resetPassword:validate-password-length",
      });
      return;
    }

    const resetEntry = await ResetPassword.findOne({ token });
    if (!resetEntry) {
      res.status(400).json({
        success: false,
        message: "That reset link is no longer valid.",
        action: "resetPassword:token-not-found",
      });
      return;
    }

    // Check if token is expired (10 minutes = 600,000 ms)
    const now = Date.now();
    const createdAt = new Date(resetEntry.createdAt).getTime();
    if (now - createdAt > 10 * 60 * 1000) {
      // Optionally, delete the expired token
      await ResetPassword.deleteOne({ token });
      res.status(400).json({
        success: false,
        message: "This reset link has expired. Please request a new one.",
        action: "resetPassword:token-expired",
      });
      return;
    }

    const user = await User.findOne({ email: resetEntry.email });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the related account.",
        action: "resetPassword:user-not-found",
      });
      return;
    }

    if (resetEntry.role !== role) {
      res.status(400).json({
        success: false,
        message: "This reset link doesn't match the selected role.",
        action: `resetPassword:role-mismatch:${role}`,
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword.toLowerCase(), salt);

    if (role === "doctor") {
      const doctor = await Doctor.findOne({ userId: user._id });
      if (!doctor) {
        res.status(404).json({
          success: false,
          message: "Doctor profile is missing for this account.",
          action: "resetPassword:doctor-profile-missing",
        });
        return;
      }
      doctor.password = hashedPassword;
      await doctor.save();
    } else if (role === "patient") {
      const patient = await Patient.findOne({ userId: user._id });
      if (!patient) {
        res.status(404).json({
          success: false,
          message: "Patient profile is missing for this account.",
          action: "resetPassword:patient-profile-missing",
        });
        return;
      }
      patient.password = hashedPassword;
      await patient.save();
    } else if (role === "admin") {
      const admin = await Admin.findOne({ userId: user._id });
      if (!admin) {
        res.status(404).json({
          success: false,
          message: "Admin profile is missing for this account.",
          action: "resetPassword:admin-profile-missing",
        });
        return;
      }
      admin.password = hashedPassword;
      await admin.save();
    } else {
      res.status(400).json({
        success: false,
        message: "That role isn't supported for password resets.",
        action: `resetPassword:invalid-role:${role}`,
      });
      return;
    }

    // Delete token after use
    await ResetPassword.deleteOne({ token });

    res.status(200).json({
      success: true,
      message: "Your password has been updated.",
      action: "resetPassword:success",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't reset the password right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
