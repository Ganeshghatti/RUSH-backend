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
// Load environment variables
dotenv_1.default.config();
// Connect to MongoDB
(0, db_1.default)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
// CORS setup
app.use((0, cors_1.default)());
// Global rate limiting - applies to all routes
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 200, // Limit each IP to 100 requests per window
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
});
// Apply global rate limiting to all requests
app.use(globalLimiter);
// Routes
app.get("/", (req, res) => {
    res.send("Welcome to RUSH Backend");
});
// Auth routes
app.use("/auth", auth_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
