import { PublishCommand } from "@aws-sdk/client-sns";
import { snsClient } from "../../config/aws";
import dotenv from "dotenv";

// Make sure environment variables are loaded
dotenv.config();

const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
  const params = {
    Message: message,
    PhoneNumber: phoneNumber,
  };

  try {
    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
  } catch (error) {
    console.error("Error sending SMS:", error);
    throw error;
  }
};

export default sendSMS;
