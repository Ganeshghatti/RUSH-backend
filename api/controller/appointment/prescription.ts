import { Request, Response } from "express";
import mongoose from "mongoose";
import { Prescription } from "../../models/appointment/prescription-model";
import { prescriptionSchemaZod } from "../../validation/validation";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import Patient from "../../models/user/patient-model";
const appointmentModels: Record<string, mongoose.Model<any>> = {
  OnlineAppointment,
  ClinicAppointment,
  HomeVisitAppointment,
  EmergencyAppointment,
};

// get prescription by id
export const getPrescriptionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { prescriptionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
      res.status(400).json({
        success: false,
        message: "The prescription ID provided is invalid.",
        action: "getPrescriptionById:invalid-id",
      });
      return;
    }

    // prescription data
    const prescription = await Prescription.findById(prescriptionId)
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
  } catch (error) {
    console.error("Error fetching prescription:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the prescription right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// add new prescription or update if exist 
export const addPrescription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // validate input
    const validationResult = prescriptionSchemaZod.safeParse(req.body);
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
    const {
      appointmentId,
      appointmentTypeRef,
      patientId,
      symptoms,
      medicines,
      labTest,
      notes,
      nextAppointmentDate,
    } = validationResult.data;

    // doctor detail
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      res.status(400).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "addPrescription:doctor-not-found",
      });
      return;
    }

    // patient User detail
    const patient = await Patient.findById(patientId);
    if (!patient) {
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
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      res.status(400).json({
        success: false,
        message: "We couldn't find the appointment for the provided details.",
        action: "addPrescription:appointment-not-found",
      });
      return;
    }

    let savedPrescription;
    let successMessage: string;
    let successAction: string;
    // ***** prescription id already exist
    if (appointment.prescriptionId) {
      successMessage = "Prescription updated successfully.";
      successAction = "addPrescription:update-success";
      const existingPrescription = await Prescription.findById(
        appointment.prescriptionId
      );
      // update existing prescription
      if (existingPrescription) {
        existingPrescription.set({
          symptoms,
          medicines,
          labTest,
          notes,
          nextAppointmentDate,
        });
        savedPrescription = await existingPrescription.save();
      }
      // prescriptonId exist in appointment but related prescription document was deleted
      else {
        const newPrescription = new Prescription({
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
        savedPrescription = await newPrescription.save();
        appointment.prescriptionId = savedPrescription._id;
        await appointment.save();
      }
    }
    // ***** create new prescription
    else {
      console.log("Create new prescription")
      successMessage = "Prescription created successfully.";
      successAction = "addPrescription:create-success";
      const newPrescription = new Prescription({
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
      console.log("press ",newPrescription)
      savedPrescription = await newPrescription.save();

      appointment.prescriptionId = savedPrescription._id;
      console.log("Appointment..... ",appointment)
      await appointment.save();
      console.log("Appointment2..... ",appointment)
    }

    res.status(200).json({
      success: true,
      message: successMessage,
      action: successAction,
      data: savedPrescription,
    });
  } catch (error) {
    console.error("Error creating/updating prescription:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't save the prescription.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
