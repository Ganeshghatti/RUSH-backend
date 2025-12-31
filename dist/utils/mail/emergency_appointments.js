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
exports.sendAdminEmergencyNotification = void 0;
const email_transporter_1 = require("../../config/email-transporter");
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const getEmergencyHtmlTemplate = (appointmentData, recipientType) => {
    return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; padding: 30px;">
    <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
      <div style="background: linear-gradient(90deg, #e53935, #ff7043); color: white; padding: 16px 24px;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.3px;">🚨 Emergency Appointment Alert</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Patient Name:</b> ${appointmentData.name}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Contact Number:</b> ${appointmentData.contactNumber}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Location:</b> ${appointmentData.location}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Title:</b> ${appointmentData.title}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Description:</b> ${appointmentData.description}</p>
        
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 14px;">
          <p style="font-size: 13px; color: #666; margin: 0;">
            <b>Created At:</b> ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  </div>
  `;
};
/**
 * Sends an emergency appointment notification to all available doctors and admin
 */
const sendAdminEmergencyNotification = (appointmentData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Send to admin
        const adminEmail = "urushdr@gmail.com";
        const adminMailOptions = {
            from: process.env.SMTP_USER,
            to: adminEmail,
            subject: "New Emergency Appointment Created",
            html: getEmergencyHtmlTemplate(appointmentData, "admin"),
        };
        console.log("Attempting to send admin emergency email to:", adminEmail);
        yield email_transporter_1.transporter.sendMail(adminMailOptions);
        console.log("Admin emergency email sent to:", adminEmail);
        // Find all doctors and send them notifications
        const doctors = yield doctor_model_1.default.find({}).populate({
            path: "userId",
            select: "email",
        });
        // Send emails to all doctors in parallel
        const emailPromises = doctors.map((doctor) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const doctorEmail = (_a = doctor.userId) === null || _a === void 0 ? void 0 : _a.email;
            if (!doctorEmail)
                return;
            const doctorMailOptions = {
                from: process.env.SMTP_USER,
                to: doctorEmail,
                subject: "New Emergency Case Available",
                html: getEmergencyHtmlTemplate(appointmentData, "doctor"),
            };
            try {
                console.log("Attempting to send doctor emergency email to:", doctorEmail);
                yield email_transporter_1.transporter.sendMail(doctorMailOptions);
                console.log("Doctor emergency email sent to:", doctorEmail);
            }
            catch (err) {
                console.error(`Failed to send email to doctor ${doctorEmail}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("Emergency notification emails failed:", (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
});
exports.sendAdminEmergencyNotification = sendAdminEmergencyNotification;
