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
exports.addPrescription = exports.getPrescriptionById = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const prescription_model_1 = require("../../models/appointment/prescription-model");
const validation_1 = require("../../validation/validation");
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const appointmentModels = {
    OnlineAppointment: online_appointment_model_1.default,
    ClinicAppointment: clinic_appointment_model_1.default,
    HomeVisitAppointment: homevisit_appointment_model_1.default,
    EmergencyAppointment: emergency_appointment_model_1.default,
};
// get prescription by id
const getPrescriptionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { prescriptionId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(prescriptionId)) {
            res.status(400).json({
                success: false,
                message: "The prescription ID provided is invalid.",
                action: "getPrescriptionById:invalid-id",
            });
            return;
        }
        // prescription data
        const prescription = yield prescription_model_1.Prescription.findById(prescriptionId)
            .populate("patientId", "firstName lastName gender dob email")
            .populate({
            path: "doctorId",
            select: "specialization userId",
            populate: {
                path: "userId",
                select: "firstName lastName gender email"
            }
        });
        if (!prescription) {
            res.status(404).json({
                success: false,
                message: "We couldn't find that prescription.",
                action: "getPrescriptionById:not-found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Prescription fetched successfully.",
            action: "getPrescriptionById:success",
            data: prescription,
        });
    }
    catch (error) {
        console.error("Error fetching prescription:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the prescription right now.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getPrescriptionById = getPrescriptionById;
// add new prescription or update if exist 
const addPrescription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // validate input
        const validationResult = validation_1.prescriptionSchemaZod.safeParse(req.body);
        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                message: "Please review the prescription details and try again.",
                action: "addPrescription:validation-error",
                data: {
                    errors: validationResult.error.errors,
                },
            });
            return;
        }
        // data from client
        const { appointmentId, appointmentTypeRef, patientId, symptoms, medicines, labTest, notes, nextAppointmentDate, } = validationResult.data;
        // doctor detail
        const doctor = yield doctor_model_1.default.findOne({ userId });
        if (!doctor) {
            res.status(400).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "addPrescription:doctor-not-found",
            });
            return;
        }
        // patient User detail
        const patientUser = yield user_model_1.default.findById(patientId);
        if (!patientUser) {
            res.status(400).json({
                success: false,
                message: "We couldn't find the patient record.",
                action: "addPrescription:patient-not-found",
            });
            return;
        }
        const AppointmentModel = appointmentModels[appointmentTypeRef];
        if (!AppointmentModel) {
            res.status(400).json({
                success: false,
                message: "The appointment type reference is invalid.",
                action: "addPrescription:invalid-appointment-type",
            });
            return;
        }
        // appointment detail
        const appointment = yield AppointmentModel.findById(appointmentId);
        if (!appointment) {
            res.status(400).json({
                success: false,
                message: "We couldn't find the appointment for the provided details.",
                action: "addPrescription:appointment-not-found",
            });
            return;
        }
        let savedPrescription;
        let successMessage;
        let successAction;
        // ***** prescription id already exist
        if (appointment.prescriptionId) {
            successMessage = "Prescription updated successfully.";
            successAction = "addPrescription:update-success";
            const existingPrescription = yield prescription_model_1.Prescription.findById(appointment.prescriptionId);
            // update existing prescription
            if (existingPrescription) {
                existingPrescription.set({
                    symptoms,
                    medicines,
                    labTest,
                    notes,
                    nextAppointmentDate,
                });
                savedPrescription = yield existingPrescription.save();
            }
            // prescriptonId exist in appointment but related prescription document was deleted
            else {
                const newPrescription = new prescription_model_1.Prescription({
                    appointmentId,
                    appointmentTypeRef,
                    doctorId: doctor._id,
                    patientId,
                    symptoms,
                    medicines,
                    labTest,
                    notes,
                    nextAppointmentDate,
                });
                savedPrescription = yield newPrescription.save();
                appointment.prescriptionId = savedPrescription._id;
                yield appointment.save();
            }
        }
        // ***** create new prescription
        else {
            successMessage = "Prescription created successfully.";
            successAction = "addPrescription:create-success";
            const newPrescription = new prescription_model_1.Prescription({
                appointmentId,
                appointmentTypeRef,
                doctorId: doctor._id,
                patientId,
                symptoms,
                medicines,
                labTest,
                notes,
                nextAppointmentDate,
            });
            savedPrescription = yield newPrescription.save();
            appointment.prescriptionId = savedPrescription._id;
            yield appointment.save();
        }
        res.status(200).json({
            success: true,
            message: successMessage,
            action: successAction,
            data: savedPrescription,
        });
    }
    catch (error) {
        console.error("Error creating/updating prescription:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't save the prescription.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.addPrescription = addPrescription;
