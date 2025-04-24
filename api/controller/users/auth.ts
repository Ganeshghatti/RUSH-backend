import bcrypt from "bcrypt";
import User from "../../models/user/user-model";
import OTP from "../../models/otp-model";
import sendSMS from "../../utils/aws_sns/sms";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    // Check if an OTP already exists for the phone number
    const existingOTP = await OTP.findOne({ phone });

    if (existingOTP) {
      res.status(400).json({
        success: false,
        message:
          "An OTP has already been sent to this phone number. Please wait 5 minutes.",
      });
      return;
    }

    // Generate new OTP
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Save or update OTP in the database
    await OTP.findOneAndUpdate(
      { phone },
      { phone, otp: newOTP },
      { upsert: true, new: true }
    );

    // Send OTP via SMS
    const message = `Your OTP is ${newOTP}. Valid for 5 minutes.`;

    const smsSent = await sendSMS(phone, message);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, otp, password, email } = req.body;

    if (!phone || !otp || !firstName || !lastName || !email || !password) {
      res.status(400).json({
        success: false,
        message:
          "Phone number, OTP, first name, last name, email and password are required",
      });
      return;
    }

    const otpRecord = await OTP.findOne({ phone });

    if (!otpRecord) {
      res.status(404).json({
        success: false,
        message: "No OTP found for this phone number",
      });
      return;
    }

    if (otpRecord.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword,
      role: "patient",
      phone,
      phoneVerified: true,
      firstName,
      lastName,
      countryCode: "+91",
    });

    // Save user
    await newUser.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      {
        id: newUser?._id,
        email: newUser?.email,
        role: newUser?.role,
      },
      process.env.JWT_SECRET || "",
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Required for HTTPS
      sameSite: "none", // Required for cross-domain cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: "/", // Cookie is available for all paths
    });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in the environment variables");
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Required for HTTPS
      sameSite: "none", // Required for cross-domain cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: "/", // Cookie is available for all paths
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};
