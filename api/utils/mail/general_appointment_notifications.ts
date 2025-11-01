import { transporter } from "../../config/email-transporter";

interface GeneralAppointmentMailData {
    appointmentId: string;
    patientName: string;
    doctorName?: string;
    type?: string;
    status?: string;
    message?: string;
}

const getGeneralAppointmentHtmlTemplate = (data: GeneralAppointmentMailData, type: string) => {
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

export const sendGeneralAppointmentMail = async (data: GeneralAppointmentMailData) => { };
export const sendAppointmentCancelMail = async (data: GeneralAppointmentMailData) => { };
export const sendScheduleChangeMail = async (data: GeneralAppointmentMailData) => { };
