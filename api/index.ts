import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/users/auth";
import mediaRoutes from "./routes/media/media-routes";
import patientRoutes from "./routes/onboard/patient"
import doctorRoutes from "./routes/onboard/doctor";
import doctorSubscriptionRoutes from "./routes/subscription/doctor-subscription";
import cookieParser from "cookie-parser";


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "https://app.rushdr.com",   
      "http://localhost:5173",   
      "http://localhost:3000"  
    ],
    credentials: true,
  })
);

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Global rate limiting - applies to all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply global rate limiting to all requests
app.use(globalLimiter);

// Routes
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to RUSH Backend" });
});

// Auth routes
app.use("/auth", authRoutes);

// Media routes
app.use("/media", mediaRoutes);
app.use("/patient", patientRoutes);

app.use("/doctor", doctorRoutes);
app.use("/doctor", doctorSubscriptionRoutes)

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
