import { Request, Response } from "express";
import twilio from 'twilio';
import OnlineAppointment from "../../models/appointment/online-appointment-model";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const createTwilioRoom = async(req: Request, res: Response): Promise<void>  => {
    try{
        console.log("Incoming req.body:", req.body);
        const {appointmentId} = req.body;

        const appointment = await OnlineAppointment.findById(appointmentId);
        if(!appointment){
            res.status(404).json({ error: "Appointment not found" });
            return; 
        }

        const roomName = `room_${appointmentId}`;

        const room = await client.video.rooms.create({
            uniqueName: roomName,
            type: "group",
            maxParticipants: 2
        });
        console.log("Room created:", roomName);
        
        // Optionally, save room name to appointment
        appointment.roomName = room.uniqueName;
        await appointment.save();
        
        res.status(201).json({ success: true, roomName: room.uniqueName });
    } catch (error) {
        console.error("Room creation error:", error);
        res.status(500).json({ error: "Failed to create Twilio room" });
    }
}
