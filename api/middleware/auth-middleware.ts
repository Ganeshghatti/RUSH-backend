import { Request, Response, NextFunction } from "express";
import User from "../models/user/user-model";
import jwt from "jsonwebtoken";

// Interface to extend Express Request with a user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Token verification middleware
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string[];
    };

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
      return;
    }

    const user = await User.findById(decoded.id);

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
  } catch (error: any) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

// just pass roles[] to checkRole
export const checkRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized: Authentication required",
        });
        return;
      }

      // Check if user has at least one of the required roles using the role from token
      const hasRequiredRole = req.user.role.some((role: string) =>
        roles.includes(role)
      );

      if (!hasRequiredRole) {
        res.status(403).json({
          success: false,
          message: "Access denied: Insufficient privileges",
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error("Role verification error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during role verification",
      });
      return;
    }
  };
};
