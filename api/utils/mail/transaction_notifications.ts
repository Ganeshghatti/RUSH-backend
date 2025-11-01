import { transporter } from "../../config/email-transporter";

interface TransactionMailData {
  userName: string;
  email: string;
  transactionId: string;
  status?: string;
  amount?: string;
  reason?: string;
}

const getTransactionHtmlTemplate = (data: TransactionMailData, type: string) => {
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

type RecipientType = 'admin-only' | 'user-only' | 'both';

const sendTransactionMail = async (data: TransactionMailData, subject: string, title: string, recipientType: RecipientType = 'both') => {
  try {
    const adminEmail = "vijayjoshi5410@gmail.com";
    let recipients: string[] = [];

    if (recipientType === 'both') {
      recipients = [data.email, adminEmail];
    } else if (recipientType === 'admin-only') {
      recipients = [adminEmail];
    } else if (recipientType === 'user-only') {
      recipients = [data.email];
    }

    const emailPromises = recipients.map(async (recipient) => {
      if (!recipient) return; // Skip if email is not available
      const recipientType = recipient === adminEmail ? 'admin' : 'user';
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: recipient,
        subject: subject,
        html: getTransactionHtmlTemplate(data, title),
      };

      try {
        console.log(`Sending transaction notification to ${recipientType}: ${recipient}`);
        await transporter.sendMail(mailOptions);
        console.log(`✅ Transaction notification sent to ${recipientType}: ${recipient}`);
      } catch (err: any) {
        console.error(`🚨 Failed to send transaction notification to ${recipientType} (${recipient}):`, err?.message || err);
      }
    });

    await Promise.all(emailPromises);
  } catch (err: any) {
    console.error("🚨 Failed to send transaction notifications:", err?.message || err);
  }
};

export const sendNewDebitRequestMail = async (data: TransactionMailData) => {
  await sendTransactionMail(data, `New Debit Request from ${data.userName}`, "💰 New Debit Request", 'admin-only');
};

export const sendDebitStatusUpdateMail = async (data: TransactionMailData) => {
  const subject = `Debit Request ${data.status || 'Update'}`;
  const title = `Debit Request ${data.status || 'Update'}`;
  await sendTransactionMail(data, subject, title, 'both');
};

export const sendCreditCompletedMail = async (data: TransactionMailData) => {
  await sendTransactionMail(data, "✅ Wallet Credit Successful", "✅ Wallet Credit Successful", 'user-only');
};

export const sendTransactionFailedMail = async (data: TransactionMailData) => {
  await sendTransactionMail(data, "❌ Transaction Failed", "❌ Transaction Failed", 'both');
};