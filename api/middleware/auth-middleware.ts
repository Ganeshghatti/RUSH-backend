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
      role: string;
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
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "First login to continue",
    });
  }
};

// just pass roles checkRole
export const checkRole = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized: Authentication required",
        });
        return;
      }

      // check role
      const hasRequiredRole = req.user.role == role;

      if (!hasRequiredRole) {
        res.status(403).json({
          success: false,
          message: `Access denied: Only ${role} can access this route`,
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

export const authOptional = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return next(); 
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return next();
    }
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = decoded.id;
  } catch (err) {
    console.error("JWT decode failed:", err);
  }

  next();
};