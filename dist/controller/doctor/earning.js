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
exports.getDoctorEarnings = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const getDoctorEarnings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorUserId = req.user.id;
        const month = req.query.month;
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorEarnings:doctor-not-found",
            });
            return;
        }
        const doctorId = doctor._id;
        let dateFilter = {};
        if (month && month !== "all") {
            const year = new Date().getFullYear();
            const monthNumber = Number(month) - 1;
            dateFilter = {
                "slot.time.start": {
                    $gte: new Date(year, monthNumber, 1),
                    $lt: new Date(year, monthNumber + 1, 1),
                },
            };
        }
        const [online, emergency, home, clinic] = yield Promise.all([
            online_appointment_model_1.default.find(Object.assign({ doctorId }, dateFilter)),
            emergency_appointment_model_1.default.find(Object.assign({ doctorId }, dateFilter)),
            homevisit_appointment_model_1.default.find(Object.assign({ doctorId }, dateFilter)),
            clinic_appointment_model_1.default.find(Object.assign({ doctorId }, dateFilter)),
        ]);
        const extractEarning = (appt) => { var _a; return ((_a = appt.paymentDetails) === null || _a === void 0 ? void 0 : _a.doctorEarning) || 0; };
        const earningsList = [
            ...online.map((a) => extractEarning(a)),
            ...emergency.map((a) => extractEarning(a)),
            ...home.map((a) => extractEarning(a)),
            ...clinic.map((a) => extractEarning(a)),
        ];
        const totalEarnings = earningsList.reduce((sum, value) => sum + value, 0);
        res.status(200).json({
            success: true,
            message: "Doctor earnings fetched successfully.",
            totalEarnings,
            month: month || "all",
            counts: {
                online: online.length,
                emergency: emergency.length,
                homeVisit: home.length,
                clinic: clinic.length,
            },
            appointments: {
                online,
                emergency,
                home,
                clinic,
            },
        });
    }
    catch (error) {
        console.error("Error getting doctor earnings:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the doctor earnings.",
            action: error.message,
        });
    }
});
exports.getDoctorEarnings = getDoctorEarnings;
