import { transporter } from "../../config/email-transporter";

interface DoctorData {
    doctorName: string;
    email: string;
    status?: string;
    subscriptionStatus?: string;
    feedback?: string;
}

const getDoctorHtmlTemplate = (data: DoctorData, type: string) => {
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

export const sendDoctorRegistrationMail = async (data: DoctorData) => { };
export const sendDoctorApprovalStatusMail = async (data: DoctorData) => { };
export const sendDoctorDocumentVerificationMail = async (data: DoctorData) => { };
export const sendDoctorSubscriptionUpdateMail = async (data: DoctorData) => { };
export const sendDoctorFeedbackReceivedMail = async (data: DoctorData) => { };
