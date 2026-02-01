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
exports.sendDebitStatusUpdateMail = exports.sendNewDebitRequestMail = void 0;
const email_transporter_1 = require("../../config/email-transporter");
const getTransactionHtmlTemplate = (data, type) => {
    return `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
          <h2 style="color: #1a73e8; margin-bottom: 16px;">${type}</h2>
          <p style="font-size: 15px; color: #333;"><b>User:</b> ${data.userName}</p>
          <p style="font-size: 15px; color: #333;"><b>Transaction ID:</b> ${data.transactionId}</p>
          ${data.status ? `<p style="font-size: 15px; color: #333;"><b>Status:</b> ${data.status}</p>` : ''}
          ${data.amount ? `<p style="font-size: 15px; color: #333;"><b>Amount:</b> ₹${data.amount}</p>` : ''}
          ${data.reason ? `<p style="font-size: 15px; color: #333;"><b>Reason:</b> ${data.reason}</p>` : ''}
          <hr style="margin: 32px 0;">
          
        </div>
      </div>
    `;
};
const sendTransactionMail = (data_1, subject_1, title_1, ...args_1) => __awaiter(void 0, [data_1, subject_1, title_1, ...args_1], void 0, function* (data, subject, title, recipientType = 'both') {
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
                return; // Skip if email is not available
            const recipientType = recipient === adminEmail ? 'admin' : 'user';
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: recipient,
                subject: subject,
                html: getTransactionHtmlTemplate(data, title),
            };
            try {
                console.log(`Sending transaction notification to ${recipientType}: ${recipient}`);
                yield email_transporter_1.transporter.sendMail(mailOptions);
                console.log(`✅ Transaction notification sent to ${recipientType}: ${recipient}`);
            }
            catch (err) {
                console.error(`🚨 Failed to send transaction notification to ${recipientType} (${recipient}):`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }));
        yield Promise.all(emailPromises);
    }
    catch (err) {
        console.error("🚨 Failed to send transaction notifications:", (err === null || err === void 0 ? void 0 : err.message) || err);
    }
});
const sendNewDebitRequestMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield sendTransactionMail(data, `New Debit Request from ${data.userName}`, "💰 New Debit Request", 'admin-only');
});
exports.sendNewDebitRequestMail = sendNewDebitRequestMail;
const sendDebitStatusUpdateMail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = `Debit Request ${data.status || 'Update'}`;
    const title = `Debit Request ${data.status || 'Update'}`;
    yield sendTransactionMail(data, subject, title, 'both');
});
exports.sendDebitStatusUpdateMail = sendDebitStatusUpdateMail;
