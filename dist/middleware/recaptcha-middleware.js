"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRecaptcha = void 0;
const axios_1 = __importDefault(require("axios"));
// reCAPTCHA verification middleware
const verifyRecaptcha = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const response = yield axios_1.default.post(verificationUrl, null, {
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
    }
    catch (error) {
        console.error("reCAPTCHA verification error:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't verify reCAPTCHA right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.verifyRecaptcha = verifyRecaptcha;
