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
import Admin from "../../models/user/admin-model";
import * as dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "";

export const sendSMSV3 = async (phoneNumber: string, otp: string) => {
  try {
    const apiKey = process.env.OTP_API_KEY;
    const clientId = process.env.OTP_CLIENT_ID;

    if (!apiKey || !clientId) {
      throw new Error("API key or Client ID not defined in environment variables.");
    }

    // Remove '+' from phone number
    const formattedPhoneNumber = phoneNumber.replace('+', '');
    console.log(formattedPhoneNumber);

    const message = encodeURIComponent(
      `Dear User, Your Registration OTP with RUSHDR is ${otp} please do not share this OTP with anyone to keep your account secure - RUSHDR Sadguna Ventures`
    );

    const url = `https://api.mylogin.co.in/api/v2/SendSMS?SenderId=RUSHDR&Message=${message}&MobileNumbers=${formattedPhoneNumber}&TemplateId=1707175033225166571&ApiKey=${apiKey}&ClientId=${clientId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "text/plain",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.text();
    console.log("SMS sent successfully:", data);
  } catch (error) {
    console.error("Failed to send SMS:", error);
  }
};

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, countryCode = "+91", role } = req.body;

    // Validate input
    if (!phone || !email || !role) {
      res.status(400).json({
        success: false,
        message: "Phone number, email, and role are required",
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

    if (!validator.isEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    if (!["doctor", "patient", "admin"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be either 'doctor', 'patient' or 'admin'",
      });
      return;
    }

    // Check if user exists and already has the specified role
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.roles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `You are already registered with the role: ${role}`,
      });
      return;
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

    await sendSMSV3(phone, newOTP);

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
    if (
      !phone ||
      !otp ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !role
    ) {
      res.status(400).json({
        success: false,
        message:
          "All fields (phone, otp, firstName, lastName, email, password, role) are required",
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

    if (!validator.isEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
      return;
    }

    if (!["doctor", "patient", "admin"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be either 'doctor', 'patient' or 'admin'",
      });
      return;
    }

    // Verify the OTP
    const otpRecord = await OTP.findOne({ phone });

    if (!otpRecord || otpRecord.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
      return;
    }

    // Check if user exists
    let user = await User.findOne({ email });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.toLowerCase(), salt);

    if (user) {
      // Check if the phone number matches the existing user's phone
      if (user.phone !== phone) {
        res.status(400).json({
          success: false,
          message: "Phone number does not match the registered email",
        });
        return;
      }

      // Check if the user already has the specified role (redundant but kept for safety)
      if (user.roles.includes(role)) {
        res.status(400).json({
          success: false,
          message: `You are already registered with the role: ${role}`,
        });
        return;
      }

      // Add the new role
      user.roles.push(role);

      // Create role-specific data
      if (role === "doctor") {
        const doctorProfile = await Doctor.create({
          userId: user._id,
          password: hashedPassword,
        });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.doctor = doctorProfile._id;
      } else if (role === "patient") {
        const patientProfile = await Patient.create({
          userId: user._id,
          password: hashedPassword,
        });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.patient = patientProfile._id;
      } else if (role === "admin") {
        const adminProfile = await Admin.create({
          userId: user._id,
          password: hashedPassword,
        });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.admin = adminProfile._id;
      }

      await user.save();
    } else {
      // Create a new user with the specified role only
      user = new User({
        email,
        roles: [role], // Only assign the requested role
        phone,
        phoneVerified: true,
        firstName,
        lastName,
        countryCode,
      });

      // Create role-specific profile based on the requested role
      if (role === "doctor") {
        const doctorProfile = await Doctor.create({
          userId: user._id,
          password: hashedPassword,
        });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.doctor = doctorProfile._id;
      } else if (role === "patient") {
        const patientProfile = await Patient.create({
          userId: user._id,
          password: hashedPassword,
        });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.patient = patientProfile._id;
      } else if (role === "admin") {
        const adminProfile = await Admin.create({
          userId: user._id,
          password: hashedPassword,
        });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.admin = adminProfile._id;
      }

      await user.save();
    }

    // Delete the OTP after successful verification
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roles: user.roles,
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

    if (role === "admin") {
      if (email === "urushdr@gmail.com" && password === "admin") {

        const user = await User.findOne({ email });

        if (!user) {
          res.status(404).json({
            success: false,
            message: "User not found",
          });
          return;
        }

        const token = jwt.sign(
          { id: user._id, email, role }, 
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 24 * 60 * 60 * 1000,
          path: "/",
        });

        res.status(200).json({
          success: true,
          message: "Login successful",
        });
        return;
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
        return;
      }
    }

    if (!email || !password || !role) {
      res.status(400).json({
        success: false,
        message: "Email, password, and role are required",
      });
      return;
    }

    if (!validator.isEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    if (!["doctor", "patient", "admin"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be either 'doctor', 'patient' or 'admin'",
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
        message: `You are not registered with the role: ${role}. Please register first.`,
      });
      return;
    }

    // Fetch role-specific password
    let rolePassword: string | undefined;
    if (role === "doctor") {
      const doctor = await Doctor.findOne({ userId: user._id });
      rolePassword = doctor?.password;
    } else if (role === "patient") {
      const patient = await Patient.findOne({ userId: user._id });
      rolePassword = patient?.password;
    } else if (role === "admin") {
      const admin = await Admin.findOne({ userId: user._id });
      rolePassword = admin?.password;
    }

    if (!rolePassword) {
      res.status(500).json({
        success: false,
        message: `No ${role} profile found for this user`,
      });
      return;
    }

    const isMatch = await bcrypt.compare(password.toLowerCase(), rolePassword);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    let user = await User.findById(id).select("-password");

    console.log("user", user);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Conditionally populate roles
    const populatePaths = [];
    if (user.roleRefs?.doctor) populatePaths.push({
      path: "roleRefs.doctor",
      select: "-password"
    });
    if (user.roleRefs?.patient) populatePaths.push({
      path: "roleRefs.patient", 
      select: "-password"
    });

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

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};
