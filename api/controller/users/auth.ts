import bcrypt from "bcrypt";
import User from "../../models/user/user-model";
import OTP from "../../models/otp-model";
import sendSMS from "../../utils/aws_sns/sms";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import validator from "validator";
import mongoose from "mongoose";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";
import { generateSignedUrlsForUser } from "../../utils/signed-url";

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
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters",
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

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
      return;
    }

    if (!["doctor", "patient"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be either 'doctor' or 'patient'",
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
    const hashedPassword = await bcrypt.hash(password.toLowerCase(), salt);

    // Create a new user
    const newUser = new User({
      email,
      password: hashedPassword,
      roles: [role],
      phone,
      phoneVerified: true,
      firstName,
      lastName,
      countryCode,
    });

    // Save user
    await newUser.save();

    // Create role-specific data
    if (role === "doctor") {
      const doctorProfile = await Doctor.create({ userId: newUser._id });
      newUser.roleRefs = { doctor: doctorProfile._id };
    } else if (role === "patient") {
      const patientProfile = await Patient.create({ userId: newUser._id });
      newUser.roleRefs = { patient: patientProfile._id };
    }

    await newUser.save();

    // Delete the OTP after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser?._id,
        email: newUser?.email,
        role: role,
      },
      process.env.JWT_SECRET || "",
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Ensure secure for HTTPS
      sameSite: "none", // Required for cross-site cookies
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: "/", // Root path
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
        role: newUser.roles,
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
    const { email, password, role } = req.body;

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

    if (!user.roles.includes(role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this role",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password.toLowerCase(), user.password);

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
      { id: user._id, email: user.email, role: role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Ensure secure for HTTPS
      sameSite: "none", // Required for cross-site cookies
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: "/", // Root path
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

    // Conditionally populate roles
    const populatePaths = [];
    if (user.roleRefs?.doctor) populatePaths.push("roleRefs.doctor");
    if (user.roleRefs?.patient) populatePaths.push("roleRefs.patient");

    if (populatePaths.length > 0) {
      user = await user.populate(populatePaths);
    }

    const userWithUrls = await generateSignedUrlsForUser(user);

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: userWithUrls,
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