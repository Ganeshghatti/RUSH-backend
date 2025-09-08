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
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const searchDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query, limit = 10, gender, appointment } = req.query;
        const parsedLimit = Number(limit);
        const queryRegex = query ? new RegExp(String(query), 'i') : null;
        // Step 1: Build filters
        const userFilter = { roles: 'doctor', isDocumentVerified: true };
        if (queryRegex)
            userFilter.firstName = { $regex: queryRegex };
        if (gender)
            userFilter.gender = gender;
        const matchedUsers = yield user_model_1.default.find(userFilter)
            .select('_id')
            .lean();
        const matchedUserIds = matchedUsers.map(user => user._id);
        // Step 2: Doctor filter for matched userIds
        const now = new Date();
        const doctorFilter = {
            status: "approved",
            subscriptions: {
                $elemMatch: {
                    endDate: { $gt: now }
                }
            }
        };
        if (matchedUserIds.length > 0) {
            doctorFilter.userId = { $in: matchedUserIds };
        }
        if (appointment === "online") {
            doctorFilter["onlineAppointment.isActive"] = true;
        }
        const doctorsByName = matchedUserIds.length > 0
            ? yield doctor_model_1.default.find(doctorFilter)
                .select('-password')
                .populate({
                path: 'userId',
                match: gender ? { gender } : undefined, // Apply gender match at populate level
                select: 'firstName lastName email phone profilePic gender'
            })
                .limit(parsedLimit)
            : [];
        // Step 3: Doctor filter for specialization match
        const specializationFilter = {
            status: "approved",
            subscriptions: {
                $elemMatch: {
                    endDate: { $gt: now }
                }
            }
        };
        if (queryRegex) {
            specializationFilter.specialization = { $regex: queryRegex };
        }
        if (appointment === "online") {
            specializationFilter["onlineAppointment.isActive"] = true;
        }
        const doctorsBySpecialization = yield doctor_model_1.default.find(specializationFilter)
            .select('-password')
            .populate({
            path: 'userId',
            match: gender ? { gender } : undefined,
            select: 'firstName lastName email phone profilePic gender'
        })
            .limit(parsedLimit);
        // Step 4: Combine and deduplicate
        const combinedDoctors = [...doctorsBySpecialization];
        doctorsByName.forEach(doc => {
            if (!combinedDoctors.some(d => d._id.toString() === doc._id.toString())) {
                combinedDoctors.push(doc);
            }
        });
        // Step 5: Fallback if empty
        let finalDoctors = combinedDoctors;
        if (finalDoctors.length === 0 && !query && !gender && !appointment) {
            finalDoctors = yield doctor_model_1.default.find({
                status: "approved",
                subscriptions: {
                    $elemMatch: {
                        endDate: { $gt: now }
                    }
                }
            })
                .select('-password')
                .populate({
                path: 'userId',
                match: { isDocumentVerified: true },
                select: 'firstName lastName email phone profilePic gender'
            })
                .limit(parsedLimit);
        }
        // Step 6: Format output
        const doctorsWithSignedUrls = yield Promise.all(finalDoctors
            .filter(doctor => doctor.userId) // Remove doctors with null user (gender mismatch)
            .slice(0, parsedLimit)
            .map((doctor) => __awaiter(void 0, void 0, void 0, function* () {
            const doctorObj = doctor.toObject();
            const processed = yield (0, signed_url_1.generateSignedUrlsForDoctor)(doctorObj);
            const user = doctorObj.userId;
            return Object.assign(Object.assign({}, processed), { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone, profilePic: user.profilePic, gender: user.gender });
        })));
        res.status(200).json({
            success: true,
            data: doctorsWithSignedUrls,
            message: "Doctors fetched successfully"
        });
    }
    catch (error) {
        console.error("Error while searching doctors:", error);
        res.status(500).json({
            success: false,
            message: "Error while searching doctors"
        });
    }
});
exports.searchDoctor = searchDoctor;
