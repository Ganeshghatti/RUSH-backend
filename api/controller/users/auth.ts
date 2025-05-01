import bcrypt from "bcrypt";
import User from "../../models/user/user-model";
import OTP from "../../models/otp-model";
import sendSMS from "../../utils/aws_sns/sms";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import validator from "validator";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET;

// const isProduction = process.env.NODE_ENV === "production";

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, password, countryCode = "+91" } = req.body;

    // Validate input
    if (!phone || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Phone number, email, and password are required",
      });
      return;
    }

    if (!validator.isMobilePhone(phone, "any")) {
      res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
      return;
    }

    // If email is provided, validate it
    if (email && !validator.isEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // If password is provided, validate its strength
    if (password) {
      if (
        !validator.isStrongPassword(password, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 0,
        })
      ) {
        res.status(400).json({
          success: false,
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, and numbers",
        });
        return;
      }
    }

    // Check if user with this phone already exists
    const existingUserByPhone = await User.findOne({ phone });

    if (existingUserByPhone?.phoneVerified === true) {
      res.status(400).json({
        success: false,
        message: "User already verified",
      });
      return;
    }

    if (existingUserByPhone) {
      res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
      return;
    }

    // Check if user with this email already exists (if email provided)
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
        return;
      }
    }

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

    // Generate new OTP - 6 digits
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Save or update OTP in the database
    await OTP.findOneAndUpdate(
      { phone },
      { phone, otp: newOTP },
      { upsert: true, new: true }
    );

    // Format the phone number with country code if not already included
    const formattedPhone = phone.startsWith("+")
      ? phone
      : `${countryCode}${phone}`;

    // Send OTP via SMS
    const message = `Your RUSH verification code is ${newOTP}. Valid for 5 minutes.`;

    await sendSMS(formattedPhone, message);

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
    const {
      firstName,
      lastName,
      phone,
      otp,
      password,
      email,
      countryCode = "+91",
      role,
    } = req.body;

    // Validate required fields
    if (!phone || !otp) {
      res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
      return;
    }

    // Validate phone number
    if (!validator.isMobilePhone(phone, "any")) {
      res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
      return;
    }

    // For registration, validate additional fields
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({
        success: false,
        message:
          "First name, last name, email, and password are required for registration",
      });
      return;
    }

    // Validate email
    if (!validator.isEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    // Verify the OTP
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

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || ["patient"],
      phone,
      phoneVerified: true,
      firstName,
      lastName,
      countryCode,
    });

    // Save user
    await newUser.save();

    // Delete the OTP after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser?._id,
        email: newUser?.email,
        role: newUser?.role[0],
      },
      process.env.JWT_SECRET || "",
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true for production, false for development
      sameSite: "lax", // "none" for production, "lax" for development
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Registration successful",
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, currentRole } = req.body;

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

    // user.role is an array, so we need to check if the currentRole is in the user's roles
    if (!user.role.includes(currentRole)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this role",
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
      { id: user._id, email: user.email, role: currentRole },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
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

export const findCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.user;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    let user = await User.findById(id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in finding user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user",
      error: (error as Error).message,
    });
  }
};

// forgot password
