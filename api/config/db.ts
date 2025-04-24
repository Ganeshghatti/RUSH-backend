import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECT_URI || "");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(
      `Error connecting to MongoDB: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  }
};

export default connectDB;
