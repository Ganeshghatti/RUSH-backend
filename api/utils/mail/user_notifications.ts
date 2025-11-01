import { transporter } from "../../config/email-transporter";

export interface UserMailData {
  userName: string;
  email: string;
  type?: string;
  status?: string;
  verificationLink?: string;
  role?: string;
  phone?: string;
  message?: string;
}

const getUserHtmlTemplate = (data: UserMailData, title: string) => {
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

type RecipientType = 'admin-only' | 'user-only' | 'both';

const sendUserMail = async (data: UserMailData, subject: string, title: string, recipientType: RecipientType = 'both') => {
  try {
    const adminEmail = "urushdr@gmail.com";
    let recipients: string[] = [];

    if (recipientType === 'both') {
      recipients = [data.email, adminEmail];
    } else if (recipientType === 'admin-only') {
      recipients = [adminEmail];
    } else if (recipientType === 'user-only') {
      recipients = [data.email];
    }

    const emailPromises = recipients.map(async (recipient) => {
      if (!recipient) return;
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: recipient,
        subject: subject,
        html: getUserHtmlTemplate(data, title),
      };

      try {
        console.log(`Sending user notification to ${recipient}`);
        await transporter.sendMail(mailOptions);
        console.log(`✅ User notification sent to ${recipient}`);
      } catch (err: any) {
        console.error(`🚨 Failed to send user notification to ${recipient}:`, err?.message || err);
      }
    });

    await Promise.all(emailPromises);
  } catch (err: any) {
    console.error("🚨 Failed to send user notifications:", err?.message || err);
  }
};

export const sendNewUserMail = async (data: UserMailData) => {
  await sendUserMail(data, `New ${data.role} Registration: ${data.userName}`, "👤 New User Registration", 'admin-only');
};

export const sendAccountStatusMail = async (data: UserMailData) => {
  await sendUserMail(data, `Your account has been ${data.status}`, `Account Status: ${data.status}`, 'user-only');
};

export const sendProfileUpdateMail = async (data: UserMailData) => {
  await sendUserMail(data, `Profile Updated: ${data.userName}`, "📝 Profile Update Notification", 'both');
};

export const sendDocumentVerificationMail = async (data: UserMailData) => {
  const subject = `Your documents have been ${data.status}`;
  await sendUserMail(data, subject, `📄 Document Verification: ${data.status}`, 'user-only');
};

export const sendDoctorOnboardedMail = async (data: UserMailData) => {
  await sendUserMail(data, `Doctor Onboarded: ${data.userName}`, "👨‍⚕️ Doctor Onboarding Completed", 'admin-only');
};
