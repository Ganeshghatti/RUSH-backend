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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTwilioRoom = void 0;
const twilio_1 = __importDefault(require("twilio"));
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const createTwilioRoom = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Incoming req.body:", req.body);
        const { appointmentId } = req.body;
        const appointment = yield online_appointment_model_1.default.findById(appointmentId);
        if (!appointment) {
            res.status(404).json({ error: "Appointment not found" });
            return;
        }
        const roomName = `room_${appointmentId}`;
        const room = yield client.video.rooms.create({
            uniqueName: roomName,
            type: "group",
            maxParticipants: 2
        });
        console.log("Room created:", roomName);
        // Optionally, save room name to appointment
        appointment.roomName = room.uniqueName;
        yield appointment.save();
        res.status(201).json({ success: true, roomName: room.uniqueName });
    }
    catch (error) {
        console.error("Room creation error:", error);
        res.status(500).json({ error: "Failed to create Twilio room" });
    }
});
exports.createTwilioRoom = createTwilioRoom;
