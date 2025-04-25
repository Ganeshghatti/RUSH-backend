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
exports.checkRole = exports.verifyToken = void 0;
const user_model_1 = __importDefault(require("../models/user/user-model"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Token verification middleware
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get token from cookies
        const token = req.cookies.token;
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Access denied: No token provided",
            });
            return;
        }
        // Verify token
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: "Invalid token",
            });
            return;
        }
        const user = yield user_model_1.default.findById(decoded.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        // Set user info in request object
        req.user = {
            id: user._id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        console.error("Token verification error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
});
exports.verifyToken = verifyToken;
// just pass roles[] to checkRole
const checkRole = (roles) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: "Unauthorized: Authentication required",
                });
                return;
            }
            // Check if user has at least one of the required roles using the role from token
            const hasRequiredRole = req.user.role.some((role) => roles.includes(role));
            if (!hasRequiredRole) {
                res.status(403).json({
                    success: false,
                    message: "Access denied: Insufficient privileges",
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error("Role verification error:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error during role verification",
            });
            return;
        }
    });
};
exports.checkRole = checkRole;
