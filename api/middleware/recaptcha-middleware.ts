import { Request, Response, NextFunction } from "express";
import axios from "axios";

// reCAPTCHA verification middleware
export const verifyRecaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get reCAPTCHA token from request body
    const { recaptchaToken } = req.body;

    console.log("reCAPTCHA token:", recaptchaToken);

    if (!recaptchaToken) {
      res.status(400).json({
        success: false,
        message: "reCAPTCHA token is required.",
        action: "verifyRecaptcha:missing-token",
      });
      return;
    }

    // Get reCAPTCHA secret from environment variables
    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
    if (!RECAPTCHA_SECRET) {
      throw new Error("RECAPTCHA_SECRET_KEY is not defined in environment variables");
    }

    // Verify reCAPTCHA token with Google
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const response = await axios.post(verificationUrl, null, {
      params: {
        secret: RECAPTCHA_SECRET,
        response: recaptchaToken,
      },
    });

    console.log("reCAPTCHA verification response:", response.data);

    if (!response.data.success) {
      res.status(400).json({
        success: false,
        message: "We couldn't verify reCAPTCHA. Please try again.",
        action: "verifyRecaptcha:verification-failed",
      });
      return;
    }

    console.log("reCAPTCHA verification successful");

    next();
  } catch (error: any) {
    console.error("reCAPTCHA verification error:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't verify reCAPTCHA right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
}; 