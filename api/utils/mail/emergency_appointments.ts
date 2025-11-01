import { transporter } from "../../config/email-transporter";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";

interface EmergencyAppointmentData {
  name: string;
  title: string;
  description: string;
  contactNumber: string;
  location: string;
}

const getEmergencyHtmlTemplate = (
  appointmentData: EmergencyAppointmentData,
  recipientType: "admin" | "doctor"
) => {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; padding: 30px;">
    <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
      <div style="background: linear-gradient(90deg, #e53935, #ff7043); color: white; padding: 16px 24px;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.3px;">🚨 Emergency Appointment Alert</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Patient Name:</b> ${appointmentData.name}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Contact Number:</b> ${appointmentData.contactNumber}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Location:</b> ${appointmentData.location}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Title:</b> ${appointmentData.title}</p>
        <p style="font-size: 15px; color: #333; margin-bottom: 12px;"><b>Description:</b> ${appointmentData.description}</p>
        
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 14px;">
          <p style="font-size: 13px; color: #666; margin: 0;">
            <b>Created At:</b> ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  </div>
  `;
};

/**
 * Sends an emergency appointment notification to all available doctors and admin
 */
export const sendAdminEmergencyNotification = async (
  appointmentData: EmergencyAppointmentData
): Promise<void> => {
  try {
    // Send to admin
    const adminEmail = "urushdr@gmail.com";
    const adminMailOptions = {
      from: process.env.SMTP_USER,
      to: adminEmail,
      subject: "New Emergency Appointment Created",
      html: getEmergencyHtmlTemplate(appointmentData, "admin"),
    };

    console.log("Attempting to send admin emergency email to:", adminEmail);
    await transporter.sendMail(adminMailOptions);
    console.log("Admin emergency email sent to:", adminEmail);

    // Find all doctors and send them notifications
    const doctors = await Doctor.find({}).populate({
      path: "userId",
      select: "email",
    });

    // Send emails to all doctors in parallel
    const emailPromises = doctors.map(async (doctor) => {
      const doctorEmail = (doctor.userId as any)?.email;
      if (!doctorEmail) return;

      const doctorMailOptions = {
        from: process.env.SMTP_USER,
        to: doctorEmail,
        subject: "New Emergency Case Available",
        html: getEmergencyHtmlTemplate(appointmentData, "doctor"),
      };

      try {
        console.log("Attempting to send doctor emergency email to:", doctorEmail);
        await transporter.sendMail(doctorMailOptions);
        console.log("Doctor emergency email sent to:", doctorEmail);
      } catch (err: any) {
        console.error(`Failed to send email to doctor ${doctorEmail}:`, err?.message || err);
      }
    });

    await Promise.all(emailPromises);
  } catch (err: any) {
    console.error("Emergency notification emails failed:", err?.message || err);
    throw err;
  }
};
