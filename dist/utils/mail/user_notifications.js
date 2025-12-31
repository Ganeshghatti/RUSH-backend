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
exports.sendDoctorOnboardedMail = exports.sendDocumentVerificationMail = exports.sendProfileUpdateMail = exports.sendAccountStatusMail = exports.sendNewUserMail = void 0;
const email_transporter_1 = require("../../config/email-transporter");
const getUserHtmlTemplate = (data, title) => {
    return `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
          <h2 style="color: #1a73e8; margin-bottom: 16px;">${title}</h2>
          <p style="font-size: 15px; color: #333;"><b>User:</b> ${data.userName}</p>
          <p style="font-size: 15px; color: #333;"><b>Email:</b> ${data.email}</p>
          ${data.phone ? `<p style="font-size: 15px; color: #333;"><b>Phone:</b> ${data.phone}</p>` : ''}
          ${data.role ? `<p style="font-size: 15px; color: #333;"><b>Role:</b> ${data.role}</p>` : ''}
          ${data.status ? `<p style="font-size: 15px; color: #333;"><b>Status:</b> ${data.status}</p>` : ''}
          ${data.message ? `<p style="font-size: 15px; color: #333;"><b>Message:</b> ${data.message}</p>` : ''}
          ${data.verificationLink ? `<p style="font-size: 15px; color: #333;">Click to view details: <a href="${data.verificationLink}" style="display: inline-block; margin-top: 12px; padding: 12px 28px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">View Details</a></p>` : ''}
        </div>
      </div>
    `;
};
const sendUserMail = (data_1, subject_1, title_1, ...args_1) => __awaiter(void 0, [data_1, subject_1, title_1, ...args_1], void 0, function* (data, subject, title, recipientType = 'both') {
    try {
        const adminEmail = "urushdr@gmail.com";
        let recipients = [];
        if (recipientType === 'both') {
            recipients = [data.email, adminEmail];
        }
        else if (recipientType === 'admin-only') {
            recipients = [adminEmail];
        }
        else if (recipientType === 'user-only') {
            recipients = [data.email];
        }
        const emailPromises = recipients.map((recipient) => __awaiter(void 0, void 0, void 0, function* () {
            if (!recipient)
                return;
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: recipient,
                subject: subject,
                html: getUserHtmlTemplate(data, title),
            };
            try {
                console.log(`Sending user notification to ${recipient}`);
                yield email_transporter_1.transporter.sendMail(mailOptions);
                console.log(`✅ User notification sent to ${recipient}`);
            }
            catch (err) {
                console.error(`🚨 Failed to send user notification to ${recipient}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("🚨 Failed to send user notifications:", (err === null || err === void 0 ? void 0 : err.message) || err);
    }
});
const sendNewUserMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield sendUserMail(data, `New ${data.role} Registration: ${data.userName}`, "👤 New User Registration", 'admin-only');
});
exports.sendNewUserMail = sendNewUserMail;
const sendAccountStatusMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield sendUserMail(data, `Your account has been ${data.status}`, `Account Status: ${data.status}`, 'user-only');
});
exports.sendAccountStatusMail = sendAccountStatusMail;
const sendProfileUpdateMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield sendUserMail(data, `Profile Updated: ${data.userName}`, "📝 Profile Update Notification", 'both');
});
exports.sendProfileUpdateMail = sendProfileUpdateMail;
const sendDocumentVerificationMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = `Your documents have been ${data.status}`;
    yield sendUserMail(data, subject, `📄 Document Verification: ${data.status}`, 'user-only');
});
exports.sendDocumentVerificationMail = sendDocumentVerificationMail;
const sendDoctorOnboardedMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield sendUserMail(data, `Doctor Onboarded: ${data.userName}`, "👨‍⚕️ Doctor Onboarding Completed", 'admin-only');
});
exports.sendDoctorOnboardedMail = sendDoctorOnboardedMail;
