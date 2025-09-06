"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomAccessToken = void 0;
const twilio_1 = require("twilio");
const AccessToken = twilio_1.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const createRoomAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roomName } = req.body;
        const identity = req.user.id;
        console.log("IDENTITY ", identity);
        if (!roomName) {
            res.status(400).json({ success: false, message: "Room name is required" });
            return;
        }
        const token = new AccessToken(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, { identity });
        const videoGrant = new VideoGrant({ room: roomName });
        token.addGrant(videoGrant);
        const jwtToken = token.toJwt();
        res.status(200).json({
            success: true,
            token: jwtToken,
            identity,
            roomName,
        });
    }
    catch (err) {
        console.error("Failed to generate Twilio access token:", err);
        res.status(500).json({ success: false, message: "Token generation failed" });
    }
});
exports.createRoomAccessToken = createRoomAccessToken;
