import { transporter } from "../../config/email-transporter";

interface AppointmentData {
    patientName: string;
    patientEmail: string;
    appointmentId: string;
    status: string;
    doctorName?: string;
    doctorEmail?: string;
    scheduledFor?: string;
    type?: string;
    reason?: string;
    location?: string;
    amount?: number;
    cancelledBy?: 'patient' | 'doctor';
    paymentStatus?: string;
}

const getAppointmentHtmlTemplate = (data: AppointmentData, mailType: string) => {
    return `
    <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px;">
        <h2 style="color: #1a73e8; margin-bottom: 16px;">${mailType}</h2>

        ${data.type === "Emergency" && data.status === "in-progress"
            ? `<p style="font-size: 15px; color: #333;">Dr. <b>${data.doctorName}</b> has accepted the emergency request.</p>`
            : ""
        }

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
export const sendNewAppointmentNotification = async (data: AppointmentData): Promise<void> => {
    try {
        const ADMIN_EMAIL = "urushdr@gmail.com";
        const recipientEmails: string[] = [ADMIN_EMAIL];

        if (data.doctorEmail) recipientEmails.push(data.doctorEmail);

        if (recipientEmails.length === 0) {
            console.error("No recipients for new appointment notification.");
            return;
        }

        const subject = `New ${data.type || ""} Appointment Request`.trim();

        const emailPromises = recipientEmails.map(async (email) => {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject,
                html: getAppointmentHtmlTemplate(data, `New ${data.type || ""} Appointment Request`),
            };

            try {
                console.log(`Sending new appointment notification to: ${email}`);
                await transporter.sendMail(mailOptions);
                console.log(`New appointment notification sent to: ${email}`);
            } catch (err: any) {
                console.error(`Failed to send new appointment notification to ${email}:`, err?.message || err);
            }
        });

        await Promise.all(emailPromises);
    } catch (err: any) {
        console.error("Failed to send new appointment notifications:", err?.message || err);
        throw err;
    }
};


// Send appointment cancellation notifications
export const sendAppointmentCancellationNotification = async (data: AppointmentData): Promise<void> => {
    try {
        const ADMIN_EMAIL = "urushdr@gmail.com";
        const recipientEmails = [ADMIN_EMAIL]; // Admin is always notified.

        if (data.cancelledBy === 'patient' && data.doctorEmail) {
            // If patient cancels, notify doctor.
            recipientEmails.push(data.doctorEmail);
        } else if (data.cancelledBy === 'doctor' && data.patientEmail) {
            // If doctor cancels, notify patient.
            recipientEmails.push(data.patientEmail);
        }

        if (recipientEmails.length === 0) {
            console.error("No recipients for cancellation email.");
            return;
        }

        const emailPromises = recipientEmails.map(async (email) => {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: `Appointment Cancelled: ${data.appointmentId}`,
                html: getAppointmentHtmlTemplate(data, "Appointment Cancelled"),
            };

            try {
                console.log(`Sending cancellation notification to: ${email}`);
                await transporter.sendMail(mailOptions);
                console.log(`Cancellation notification sent to: ${email}`);
            } catch (err: any) {
                console.error(`Failed to send cancellation notification to ${email}:`, err?.message || err);
            }
        });

        await Promise.all(emailPromises);
    } catch (err: any) {
        console.error("Failed to send cancellation notifications:", err?.message || err);
        throw err;
    }
};

// Send appointment status change notifications
export const sendAppointmentStatusNotification = async (data: AppointmentData): Promise<void> => {
    try {
        const recipientEmails = ["urushdr@gmail.com"]; // Admin always notified

        if (data.patientEmail) recipientEmails.push(data.patientEmail);

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

        const emailPromises = recipientEmails.map(async (email) => {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: `Appointment ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
                html: getAppointmentHtmlTemplate(
                    data,
                    statusTitles[data.status as keyof typeof statusTitles] || "Appointment Update"
                ),
            };

            try {
                console.log(`Sending status notification to: ${email}`);
                await transporter.sendMail(mailOptions);
                console.log(`Status notification sent to: ${email}`);
            } catch (err: any) {
                console.error(`Failed to send status notification to ${email}:`, err?.message || err);
            }
        });

        await Promise.all(emailPromises);
    } catch (err: any) {
        console.error("Failed to send status notifications:", err?.message || err);
        throw err;
    }
};

// Send appointment reminder notifications
export const sendAppointmentReminder = async (data: AppointmentData): Promise<void> => {
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
        await transporter.sendMail(mailOptions);
        console.log(`Reminder sent to doctor: ${data.doctorEmail}`);
    } catch (err: any) {
        console.error("Failed to send appointment reminders:", err?.message || err);
        throw err;
    }
};

// Send home visit related notifications
export const sendHomeVisitNotification = async (
    data: AppointmentData & { travelCost?: number }
): Promise<void> => {
    try {
        const recipientEmails = ["vijayjoshi5410@gmail.com"]; // Admin always notified
        if (data.patientEmail) recipientEmails.push(data.patientEmail);
        if (data.doctorEmail) recipientEmails.push(data.doctorEmail);

        const emailPromises = recipientEmails.map(async (email) => {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: "Home Visit Appointment Update",
                html: getAppointmentHtmlTemplate(
                    {
                        ...data,
                        amount: (data.amount || 0) + (data.travelCost || 0),
                    },
                    "Home Visit Update"
                ),
            };

            try {
                console.log(`Sending home visit notification to: ${email}`);
                await transporter.sendMail(mailOptions);
                console.log(`Home visit notification sent to: ${email}`);
            } catch (err: any) {
                console.error(`Failed to send home visit notification to ${email}:`, err?.message || err);
            }
        });

        await Promise.all(emailPromises);
    } catch (err: any) {
        console.error("Failed to send home visit notifications:", err?.message || err);
        throw err;
    }
};
