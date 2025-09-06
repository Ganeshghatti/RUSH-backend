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
exports.default = handler;
const db_1 = __importDefault(require("./config/db"));
const online_appointment_1 = require("./controller/appointment/online-appointment");
const clinic_appointment_1 = require("./controller/appointment/clinic-appointment");
const homevisit_appointment_1 = require("./controller/appointment/homevisit-appointment");
const emergency_appointment_1 = require("./controller/appointment/emergency-appointment");
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_1.default)();
            const results = yield Promise.all([
                (0, online_appointment_1.updateAppointmentExpiredStatus)(),
                (0, clinic_appointment_1.updateClinicAppointmentExpiredStatus)(),
                (0, homevisit_appointment_1.updateHomeVisitAppointmentExpiredStatus)(),
                (0, emergency_appointment_1.updateEmergencyAppointmentExpiredStatus)(),
            ]);
            console.log("Results ", results);
            return res.status(200).json({
                success: true,
                message: "Expired appointments updated successfully",
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error("Cron job error:", err);
            return res.status(500).json({
                success: false,
                error: "Failed to update expired appointments",
                details: err.message,
            });
        }
    });
}
