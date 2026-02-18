import { transporter } from "../../config/email-transporter";


interface PatientMailData {
  patientName: string;
  appointmentId?: string;
  doctorName?: string;
  message?: string;
  visitStatus?: string;
  travelCost?: string;
}

const getPatientHtmlTemplate = (data: PatientMailData, type: string) => {
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

export const sendAppointmentReminderMail = async (data: PatientMailData) => { };
export const sendDoctorAvailabilityChangeMail = async (data: PatientMailData) => { };
export const sendHomeVisitSlotChangeMail = async (data: PatientMailData) => { };
export const sendVisitConfirmationMail = async (data: PatientMailData) => { };
export const sendTravelCostNoticeMail = async (email: string, data: PatientMailData) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Home Visit Appointment Update: Travel Cost Added",
      html: getPatientHtmlTemplate(data, "Home Visit Update"),
    };

    console.log(`Sending travel cost notice to patient: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ Travel cost notice sent to patient: ${email}`);
  } catch (err: any) {
    console.error(
      `🚨 Failed to send travel cost notice to ${email}:`,
      err?.message || err
    );
  }
};
export const sendVisitStatusMail = async (data: PatientMailData) => { };
