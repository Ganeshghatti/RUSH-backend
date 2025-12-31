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
exports.sendHomeVisitNotification = exports.sendAppointmentReminder = exports.sendAppointmentStatusNotification = exports.sendAppointmentCancellationNotification = exports.sendNewAppointmentNotification = void 0;
const email_transporter_1 = require("../../config/email-transporter");
const getAppointmentHtmlTemplate = (data, mailType) => {
    return `
    <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
        <h2 style="color: #1a73e8; margin-bottom: 16px;">${mailType}</h2>

        ${data.type === "Emergency" && data.status === "in-progress"
        ? `<p style="font-size: 15px; color: #333;">Dr. <b>${data.doctorName}</b> has accepted the emergency request.</p>`
        : ""}

        <p style="font-size: 15px; color: #333;"><b>Patient:</b> ${data.patientName}</p>
        ${data.doctorName ? `<p style="font-size: 15px; color: #333;"><b>Doctor:</b> ${data.doctorName}</p>` : ""}
        <p style="font-size: 15px; color: #333;"><b>Appointment ID:</b> ${data.appointmentId}</p>
        <p style="font-size: 15px; color: #333;"><b>Status:</b> ${data.status}</p>
        ${data.type ? `<p style="font-size: 15px; color: #333;"><b>Type:</b> ${data.type}</p>` : ""}
        ${data.scheduledFor ? `<p style="font-size: 15px; color: #333;"><b>Scheduled For:</b> ${data.scheduledFor}</p>` : ""}
        ${data.location ? `<p style="font-size: 15px; color: #333;"><b>Location:</b> ${data.location}</p>` : ""}
        ${data.reason ? `<p style="font-size: 15px; color: #333;"><b>Reason:</b> ${data.reason}</p>` : ""}
        ${data.amount ? `<p style="font-size: 15px; color: #333;"><b>Amount:</b> ₹${data.amount}</p>` : ""}
        ${data.paymentStatus ? `<p style="font-size: 15px; color: #333;"><b>Payment Status:</b> ${data.paymentStatus}</p>` : ""}

        <p style="font-size: 13px; color: #888; margin-top: 24px;">
          <b>Last Updated:</b> ${new Date().toLocaleString()}
        </p>
      </div>
    </div>
  `;
};
// Send new appointment notification to doctor
// Send new appointment notification to both doctor and admin
const sendNewAppointmentNotification = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ADMIN_EMAIL = "urushdr@gmail.com";
        const recipientEmails = [ADMIN_EMAIL];
        if (data.doctorEmail)
            recipientEmails.push(data.doctorEmail);
        if (recipientEmails.length === 0) {
            console.error("No recipients for new appointment notification.");
            return;
        }
        const subject = `New ${data.type || ""} Appointment Request`.trim();
        const emailPromises = recipientEmails.map((email) => __awaiter(void 0, void 0, void 0, function* () {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject,
                html: getAppointmentHtmlTemplate(data, `New ${data.type || ""} Appointment Request`),
            };
            try {
                console.log(`Sending new appointment notification to: ${email}`);
                yield email_transporter_1.transporter.sendMail(mailOptions);
                console.log(`New appointment notification sent to: ${email}`);
            }
            catch (err) {
                console.error(`Failed to send new appointment notification to ${email}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("Failed to send new appointment notifications:", (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
});
exports.sendNewAppointmentNotification = sendNewAppointmentNotification;
// Send appointment cancellation notifications
const sendAppointmentCancellationNotification = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ADMIN_EMAIL = "urushdr@gmail.com";
        const recipientEmails = [ADMIN_EMAIL]; // Admin is always notified.
        if (data.cancelledBy === 'patient' && data.doctorEmail) {
            // If patient cancels, notify doctor.
            recipientEmails.push(data.doctorEmail);
        }
        else if (data.cancelledBy === 'doctor' && data.patientEmail) {
            // If doctor cancels, notify patient.
            recipientEmails.push(data.patientEmail);
        }
        if (recipientEmails.length === 0) {
            console.error("No recipients for cancellation email.");
            return;
        }
        const emailPromises = recipientEmails.map((email) => __awaiter(void 0, void 0, void 0, function* () {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: `Appointment Cancelled: ${data.appointmentId}`,
                html: getAppointmentHtmlTemplate(data, "Appointment Cancelled"),
            };
            try {
                console.log(`Sending cancellation notification to: ${email}`);
                yield email_transporter_1.transporter.sendMail(mailOptions);
                console.log(`Cancellation notification sent to: ${email}`);
            }
            catch (err) {
                console.error(`Failed to send cancellation notification to ${email}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("Failed to send cancellation notifications:", (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
});
exports.sendAppointmentCancellationNotification = sendAppointmentCancellationNotification;
// Send appointment status change notifications
const sendAppointmentStatusNotification = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recipientEmails = ["urushdr@gmail.com"]; // Admin always notified
        if (data.patientEmail)
            recipientEmails.push(data.patientEmail);
        const statusTitles = {
            accepted: "Appointment Accepted",
            pending: "Appointment Pending Review",
            "in-progress": "Emergency Appointment Accepted",
            completed: "Appointment Completed",
            cancelled: "Appointment Cancelled",
            expired: "Appointment Expired",
            confirmed: "Appointment Confirmed",
            "doctor-accepted": "Doctor Accepted Appointment",
            "patient-confirmed": "Patient Confirmed Appointment",
        };
        const emailPromises = recipientEmails.map((email) => __awaiter(void 0, void 0, void 0, function* () {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: `Appointment ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
                html: getAppointmentHtmlTemplate(data, statusTitles[data.status] || "Appointment Update"),
            };
            try {
                console.log(`Sending status notification to: ${email}`);
                yield email_transporter_1.transporter.sendMail(mailOptions);
                console.log(`Status notification sent to: ${email}`);
            }
            catch (err) {
                console.error(`Failed to send status notification to ${email}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("Failed to send status notifications:", (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
});
exports.sendAppointmentStatusNotification = sendAppointmentStatusNotification;
// Send appointment reminder notifications
const sendAppointmentReminder = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!data.doctorEmail) {
            console.error("Doctor email is missing, cannot send reminder.");
            return;
        }
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: data.doctorEmail,
            subject: "Upcoming Appointment Reminder",
            html: getAppointmentHtmlTemplate(data, "Appointment Reminder"),
        };
        console.log(`Sending reminder to doctor: ${data.doctorEmail}`);
        yield email_transporter_1.transporter.sendMail(mailOptions);
        console.log(`Reminder sent to doctor: ${data.doctorEmail}`);
    }
    catch (err) {
        console.error("Failed to send appointment reminders:", (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
});
exports.sendAppointmentReminder = sendAppointmentReminder;
// Send home visit related notifications
const sendHomeVisitNotification = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recipientEmails = ["vijayjoshi5410@gmail.com"]; // Admin always notified
        if (data.patientEmail)
            recipientEmails.push(data.patientEmail);
        if (data.doctorEmail)
            recipientEmails.push(data.doctorEmail);
        const emailPromises = recipientEmails.map((email) => __awaiter(void 0, void 0, void 0, function* () {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: "Home Visit Appointment Update",
                html: getAppointmentHtmlTemplate(Object.assign(Object.assign({}, data), { amount: (data.amount || 0) + (data.travelCost || 0) }), "Home Visit Update"),
            };
            try {
                console.log(`Sending home visit notification to: ${email}`);
                yield email_transporter_1.transporter.sendMail(mailOptions);
                console.log(`Home visit notification sent to: ${email}`);
            }
            catch (err) {
                console.error(`Failed to send home visit notification to ${email}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("Failed to send home visit notifications:", (err === null || err === void 0 ? void 0 : err.message) || err);
        throw err;
    }
});
exports.sendHomeVisitNotification = sendHomeVisitNotification;
