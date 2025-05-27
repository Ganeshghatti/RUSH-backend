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

    if (!["doctor", "patient"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be either 'doctor' or 'patient'",
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
        message: "An OTP has already been sent to this phone number. Please wait 5 minutes.",
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

    // Format the phone number with country code
    const formattedPhone = phone.startsWith("+") ? phone : `${countryCode}${phone}`;

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
    if (!phone || !otp || !firstName || !lastName || !email || !password || !role) {
      res.status(400).json({
        success: false,
        message: "All fields (phone, otp, firstName, lastName, email, password, role) are required",
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

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
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

      // Update role-specific data
      if (role === "doctor") {
        const doctorProfile = await Doctor.create({ userId: user._id, password: hashedPassword });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.doctor = doctorProfile._id;
      } else if (role === "patient") {
        const patientProfile = await Patient.create({ userId: user._id, password: hashedPassword });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.patient = patientProfile._id;
      }

      await user.save();
    } else {
      // Create a new user with "patient" role by default
      const roles = ["patient"];
      if (role !== "patient") roles.push(role);

      user = new User({
        email,
        roles,
        phone,
        phoneVerified: true,
        firstName,
        lastName,
        countryCode,
      });

      // Create patient profile by default
      const patientProfile = await Patient.create({ userId: user._id, password: hashedPassword });
      if (!user.roleRefs) user.roleRefs = {};
      user.roleRefs.patient = patientProfile._id;

      // Create doctor profile if role is doctor
      if (role === "doctor") {
        const doctorProfile = await Doctor.create({ userId: user._id, password: hashedPassword });
        if (!user.roleRefs) user.roleRefs = {};
        user.roleRefs.doctor = doctorProfile._id;
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
        const token = jwt.sign(
          { id: "6824400a23ab3e6625377847", email, role }, // use dummy id
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

    if (!["doctor", "patient"].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Role must be either 'doctor' or 'patient'",
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
