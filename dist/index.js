"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const auth_1 = __importDefault(require("./routes/users/auth"));
const media_routes_1 = __importDefault(require("./routes/media/media-routes"));
const patient_1 = __importDefault(require("./routes/onboard/patient"));
const doctor_1 = __importDefault(require("./routes/onboard/doctor"));
const doctor_subscription_1 = __importDefault(require("./routes/subscription/doctor-subscription"));
const patient_subscription_1 = __importDefault(require("./routes/subscription/patient-subscription"));
const update_profile_1 = __importDefault(require("./routes/doctor/update-profile"));
const symptom_route_1 = __importDefault(require("./routes/symptom/symptom-route"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const admin_route_1 = __importDefault(require("./routes/admin/admin-route"));
const wallet_1 = __importDefault(require("./routes/users/wallet"));
const online_appointment_1 = __importDefault(require("./routes/appointment/online-appointment"));
const emergency_appointment_1 = __importDefault(require("./routes/appointment/emergency-appointment"));
const clinic_appointment_1 = __importDefault(require("./routes/appointment/clinic-appointment"));
const homevisit_appointment_1 = __importDefault(require("./routes/appointment/homevisit-appointment"));
// Load environment variables
dotenv_1.default.config();
// Connect to MongoDB
(0, db_1.default)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.set("trust proxy", 1);
app.use((0, cors_1.default)({
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
}));
// Middleware
app.use(express_1.default.json({ limit: "1000mb" }));
app.use(express_1.default.urlencoded({ limit: "1000mb", extended: true }));
app.use((0, cookie_parser_1.default)());
// Global rate limiting - applies to all routes
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 200, // Limit each IP to 200 requests per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
});
// Apply global rate limiting to all requests
app.use(globalLimiter);
// Routes
app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to RUSH Backend" });
});
// Auth routes
app.use("/auth", auth_1.default);
// Media routes
app.use("/media", media_routes_1.default);
app.use("/", media_routes_1.default); // Mount media routes at root for /api/image/upload
app.use("/patient", patient_1.default);
app.use("/doctor", doctor_1.default);
app.use("/doctor", doctor_subscription_1.default);
app.use("/patient", patient_subscription_1.default);
app.use("/api", update_profile_1.default);
app.use("/user", wallet_1.default);
app.use(symptom_route_1.default);
app.use(admin_route_1.default);
app.use(online_appointment_1.default);
app.use(emergency_appointment_1.default);
app.use(clinic_appointment_1.default);
app.use(homevisit_appointment_1.default);
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
