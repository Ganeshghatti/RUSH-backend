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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVisitStatusMail = exports.sendTravelCostNoticeMail = exports.sendVisitConfirmationMail = exports.sendHomeVisitSlotChangeMail = exports.sendDoctorAvailabilityChangeMail = exports.sendAppointmentReminderMail = void 0;
const email_transporter_1 = require("../../config/email-transporter");
const getPatientHtmlTemplate = (data, type) => {
    return `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
          <h2 style="color: #1a73e8; margin-bottom: 16px;">${type}</h2>
          <p style="font-size: 15px; color: #333;"><b>Patient:</b> ${data.patientName}</p>
          ${data.doctorName ? `<p style="font-size: 15px; color: #333;"><b>Doctor:</b> ${data.doctorName}</p>` : ''}
          ${data.appointmentId ? `<p style="font-size: 15px; color: #333;"><b>Appointment:</b> ${data.appointmentId}</p>` : ''}
          ${data.visitStatus ? `<p style="font-size: 15px; color: #333;"><b>Status:</b> ${data.visitStatus}</p>` : ''}
          ${data.travelCost ? `<p style="font-size: 15px; color: #333;"><b>Travel Cost Added:</b> ₹${data.travelCost}</p>` : ''}
          ${data.message ? `<p style="font-size: 15px; color: #333; margin-top: 16px;">${data.message}</p>` : ''}
          <hr style="margin: 32px 0;">
          <p style="font-size: 12px; color: #bbb;">This is an automated notification from <b>RUSHDR</b>.</p>
        </div>
      </div>
    `;
};
const sendAppointmentReminderMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendAppointmentReminderMail = sendAppointmentReminderMail;
const sendDoctorAvailabilityChangeMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendDoctorAvailabilityChangeMail = sendDoctorAvailabilityChangeMail;
const sendHomeVisitSlotChangeMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendHomeVisitSlotChangeMail = sendHomeVisitSlotChangeMail;
const sendVisitConfirmationMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendVisitConfirmationMail = sendVisitConfirmationMail;
const sendTravelCostNoticeMail = (email, data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: "Home Visit Appointment Update: Travel Cost Added",
            html: getPatientHtmlTemplate(data, "Home Visit Update"),
        };
        console.log(`Sending travel cost notice to patient: ${email}`);
        yield email_transporter_1.transporter.sendMail(mailOptions);
        console.log(`✅ Travel cost notice sent to patient: ${email}`);
    }
    catch (err) {
        console.error(`🚨 Failed to send travel cost notice to ${email}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
    }
});
exports.sendTravelCostNoticeMail = sendTravelCostNoticeMail;
const sendVisitStatusMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendVisitStatusMail = sendVisitStatusMail;
