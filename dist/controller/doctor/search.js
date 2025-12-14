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
exports.searchDoctor = void 0;
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const signed_url_1 = require("../../utils/signed-url");
const mongoose_1 = __importDefault(require("mongoose"));
const searchDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, query, limit = 10, gender, appointmentType, specialization, } = req.query;
        const parsedLimit = Number(limit);
        const loggedInUserId = req.userId;
        // Parse appointments into an array
        const appointmentTypes = appointmentType
            ? String(appointmentType)
                .split(",")
                .map((t) => t.trim().toLowerCase().replace(/\s+/g, ""))
            : [];
        // ***** Step 1 : Only getting approved doctors & have active subscriptions ***** \\
        const now = new Date();
        const doctorFilter = {
            status: "approved",
            subscriptions: {
                $elemMatch: {
                    endDate: { $gt: now },
                },
            },
        };
        if (loggedInUserId) {
            doctorFilter.userId = {
                $ne: new mongoose_1.default.Types.ObjectId(loggedInUserId),
            };
        }
        // ***** Step 2 : Appointment type filter ***** \\
        if (appointmentTypes.length > 0) {
            doctorFilter.$or = [];
            if (appointmentTypes.includes("online")) {
                doctorFilter.$or.push({ "onlineAppointment.isActive": true });
            }
            if (appointmentTypes.includes("clinicvisit")) {
                doctorFilter.$or.push({ "clinicVisit.isActive": true });
            }
            if (appointmentTypes.includes("homevisit")) {
                doctorFilter.$or.push({ "homeVisit.isActive": true });
            }
            if (appointmentTypes.includes("emergencycall")) {
                doctorFilter.$or.push({ "emergencyCall.isActive": true });
            }
        }
        // ***** Step 3 : Specialization ****** \\
        if (specialization) {
            doctorFilter.specialization = { $regex: specialization, $options: "i" };
        }
        let doctorsBySpecialization = [];
        if (query && !specialization) {
            const queryRegex = new RegExp(String(query), "i");
            const filter = Object.assign({}, doctorFilter);
            if (!specialization) {
                filter.specialization = { $regex: queryRegex };
            }
            doctorsBySpecialization = yield doctor_model_1.default.find(filter)
                .select("-password -earnings")
                .populate({
                path: "userId",
                match: Object.assign({ isDocumentVerified: true }, (gender ? { gender } : {})),
                select: "firstName lastName email phone profilePic gender",
            })
                .limit(parsedLimit);
        }
        // Step 4: If no specialization match, search by name
        let finalDoctors = doctorsBySpecialization.filter((doc) => doc.userId);
        if (finalDoctors.length === 0 && query) {
            const queryRegex = new RegExp(String(query), "i");
            const doctorsByName = yield doctor_model_1.default.find(doctorFilter)
                .select("-password")
                .populate({
                path: "userId",
                match: Object.assign(Object.assign({ isDocumentVerified: true }, (gender ? { gender } : {})), { $or: [{ firstName: queryRegex }, { lastName: queryRegex }] }),
                select: "firstName lastName email phone profilePic gender",
            })
                .limit(parsedLimit);
            finalDoctors = doctorsByName.filter((doc) => doc.userId);
        }
        if (!query) {
            finalDoctors = yield doctor_model_1.default.find(doctorFilter)
                .select("-password")
                .populate({
                path: "userId",
                match: Object.assign({ isDocumentVerified: true }, (gender ? { gender } : {})),
                select: "firstName lastName email phone profilePic gender",
            })
                .limit(parsedLimit);
            finalDoctors = finalDoctors.filter((doc) => doc.userId);
        }
        // Step 6: Format response
        const doctorsWithSignedUrls = yield Promise.all(finalDoctors.map((doctor) => __awaiter(void 0, void 0, void 0, function* () {
            const doctorObj = doctor.toObject();
            const processed = yield (0, signed_url_1.generateSignedUrlsForDoctor)(doctorObj);
            const user = doctorObj.userId;
            return Object.assign(Object.assign({}, processed), { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone, profilePic: user.profilePic, gender: user.gender });
        })));
        res.status(200).json({
            success: true,
            message: "Doctors fetched successfully.",
            action: "searchDoctor:success",
            data: doctorsWithSignedUrls,
        });
    }
    catch (error) {
        console.error("Error while searching doctors:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't complete the doctor search.",
            action: error.message,
        });
    }
});
exports.searchDoctor = searchDoctor;
