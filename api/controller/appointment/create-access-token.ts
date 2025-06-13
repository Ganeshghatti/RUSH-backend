import twilio from 'twilio';
import { jwt } from "twilio";
import { Request, Response } from "express";

const AccessToken = jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

export const createRoomAccessToken = async(req: Request, res: Response): Promise<void> => {
    try{
        const { roomName } = req.body;
        const identity = req.user.id;
        console.log("IDENTITY ",identity)

        if(!roomName){
            res.status(400).json({ success: false, message: "Room name is required" });
            return;
        }

        const token = new AccessToken (
            process.env.TWILIO_ACCOUNT_SID!,
            process.env.TWILIO_API_KEY!,
            process.env.TWILIO_API_SECRET!,
            { identity }
        )

        const videoGrant = new VideoGrant({ room: roomName });
        token.addGrant(videoGrant);

        const jwtToken = token.toJwt();

        res.status(200).json({
            success: true,
            token: jwtToken,
            identity,
            roomName,
        });
    } catch(err){
        console.error("Failed to generate Twilio access token:", err);
        res.status(500).json({ success: false, message: "Token generation failed" });
    }
}