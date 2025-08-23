import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/users/auth";
import mediaRoutes from "./routes/media/media-routes";
import patientRoutes from "./routes/onboard/patient";
import doctorRoutes from "./routes/onboard/doctor";
import doctorSubscriptionRoutes from "./routes/subscription/doctor-subscription";
import patientSubscriptionRoutes from "./routes/subscription/patient-subscription";
import doctorProfileRoutes from "./routes/doctor/update-profile";
import symptomRoutes from "./routes/symptom/symptom-route";
import cookieParser from "cookie-parser";
import adminRoutes from "./routes/admin/admin-route";
import walletRoutes from "./routes/users/wallet";
import onlineAppointmentRoutes from "./routes/appointment/online-appointment";
import emergencyAppointmentRoutes from "./routes/appointment/emergency-appointment";
import clinicAppointmentRoutes from "./routes/appointment/clinic-appointment";
import homeVisitAppointmentRoutes from "./routes/appointment/homevisit-appointment";
import { sendSMSV3 } from "./controller/users/auth";
import cron from "node-cron";
import { updateAppointmentExpiredStatus } from "./controller/appointment/online-appointment";
import { updateClinicAppointmentExpiredStatus } from "./controller/appointment/clinic-appointment";
import { updateHomeVisitAppointmentExpiredStatus } from "./controller/appointment/homevisit-appointment";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(
  cors({
    origin: [
      "https://app.rushdr.com",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://admin.rushdr.com",
      "https://rushdr.com",
      "https://www.rushdr.com",
      "http://localhost",
      "https://localhost",
      "capacitor://localhost",
    ],
    credentials: true,
  })
);

// Middleware
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ limit: "1000mb", extended: true }));
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
app.use("/", mediaRoutes); // Mount media routes at root for /api/image/upload
app.use("/patient", patientRoutes);

app.use("/doctor", doctorRoutes);
app.use("/doctor", doctorSubscriptionRoutes);
app.use("/patient", patientSubscriptionRoutes);
app.use("/api", doctorProfileRoutes);
app.use("/user", walletRoutes);

app.use(symptomRoutes);

app.use(adminRoutes);

app.use(onlineAppointmentRoutes);

app.use(emergencyAppointmentRoutes);

app.use(clinicAppointmentRoutes);

app.use(homeVisitAppointmentRoutes);

// // Error handling middleware
// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error(err);
//   res.status(500).json({ error: "Internal Server Error" });
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Cron job to update expired appointments
// Runs once every 24 hours at midnight to check for expired appointments

// cron.schedule("0 0 * * *", async () => {
//   console.log("Running cron job to update expired appointments...");
//   await updateAppointmentExpiredStatus();
//   await updateClinicAppointmentExpiredStatus();
//   await updateHomeVisitAppointmentExpiredStatus();
// });
