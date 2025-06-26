import twilio from 'twilio';
import { jwt } from "twilio";
import { Request, Response } from "express";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";

const AccessToken = jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

export const createEmergencyRoomAccessToken = async(req: Request, res: Response): Promise<void> => {
    try {
        const { roomName } = req.body;
        const userId = req.user.id;

        if (!roomName) {
            res.status(400).json({ success: false, message: "Room name is required" });
            return;
        }

        // First get the user to determine their role
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        // Get the emergency appointment
        const appointment = await EmergencyAppointment.findOne({ roomName });
        if (!appointment) {
            res.status(404).json({ success: false, message: "Emergency appointment not found" });
            return;
        }

        let isAuthorized = false;

        // Check authorization based on user role
        if (user.roles.includes('patient')) {
            const patient = await Patient.findById(user?.roleRefs?.patient);
            if (patient && appointment.patientId.toString() === patient._id.toString()) {
                isAuthorized = true;
            }
        } else if (user.roles.includes('doctor')) {
            const doctor = await Doctor.findById(user?.roleRefs?.doctor);
            if (doctor && appointment.doctorId && appointment.doctorId.toString() === doctor._id.toString()) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            res.status(403).json({ 
                success: false, 
                message: "You are not authorized to join this emergency appointment" 
            });
            return;
        }

        // Create Twilio access token
        const token = new AccessToken(
            process.env.TWILIO_ACCOUNT_SID!,
            process.env.TWILIO_API_KEY!,
            process.env.TWILIO_API_SECRET!,
            { identity: userId }
        );

        const videoGrant = new VideoGrant({ room: roomName });
        token.addGrant(videoGrant);

        const jwtToken = token.toJwt();

        res.status(200).json({
            success: true,
            token: jwtToken,
            identity: userId,
            roomName,
        });
    } catch(err) {
        console.error("Failed to generate emergency Twilio access token:", err);
        res.status(500).json({ success: false, message: "Token generation failed" });
    }
} 