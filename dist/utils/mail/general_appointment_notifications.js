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
exports.sendScheduleChangeMail = exports.sendAppointmentCancelMail = exports.sendGeneralAppointmentMail = void 0;
const getGeneralAppointmentHtmlTemplate = (data, type) => {
    return `
      <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 24px;">
          <h2 style="color: #1976d2; margin: 0 0 12px;">${type}</h2>
          <p><b>AppointmentId:</b> ${data.appointmentId}</p>
          <p><b>Patient:</b> ${data.patientName}</p>
          <p><b>Doctor:</b> ${data.doctorName || ''}</p>
          <p><b>Status:</b> ${data.status || ''}</p>
          <p><b>Message:</b> ${data.message || ''}</p>
        </div>
      </div>
    `;
};
const sendGeneralAppointmentMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendGeneralAppointmentMail = sendGeneralAppointmentMail;
const sendAppointmentCancelMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendAppointmentCancelMail = sendAppointmentCancelMail;
const sendScheduleChangeMail = (data) => __awaiter(void 0, void 0, void 0, function* () { });
exports.sendScheduleChangeMail = sendScheduleChangeMail;
