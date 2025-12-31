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
exports.sendDoctorFeedbackReceivedMail = exports.sendDoctorSubscriptionUpdateMail = exports.sendDoctorDocumentVerificationMail = exports.sendDoctorApprovalStatusMail = exports.sendDoctorRegistrationMail = void 0;
const getDoctorHtmlTemplate = (data, type) => {
    return `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 24px;">
          <h2 style="color: #388e3c; margin: 0 0 12px;">${type}</h2>
          <p><b>Doctor:</b> ${data.doctorName}</p>
          <p><b>Email:</b> ${data.email}</p>
          <p><b>Status:</b> ${data.status || ''}</p>
          <p><b>Subscription Status:</b> ${data.subscriptionStatus || ''}</p>
          <p><b>Feedback:</b> ${data.feedback || ''}</p>
        </div>
      </div>
    `;
};
const sendDoctorRegistrationMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendDoctorRegistrationMail = sendDoctorRegistrationMail;
const sendDoctorApprovalStatusMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendDoctorApprovalStatusMail = sendDoctorApprovalStatusMail;
const sendDoctorDocumentVerificationMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendDoctorDocumentVerificationMail = sendDoctorDocumentVerificationMail;
const sendDoctorSubscriptionUpdateMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendDoctorSubscriptionUpdateMail = sendDoctorSubscriptionUpdateMail;
const sendDoctorFeedbackReceivedMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendDoctorFeedbackReceivedMail = sendDoctorFeedbackReceivedMail;
