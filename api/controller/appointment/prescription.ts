import { Request, Response } from "express";
import mongoose from "mongoose";
import { Prescription } from "../../models/appointment/prescription-model";
import { prescriptionSchemaZod } from "../../validation/validation";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import User from "../../models/user/user-model";
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
        message: "Invalid Prescription ID format",
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
        message: "Prescription not found",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Prescription fetched successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error fetching prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescription",
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
        message: "Validation failed",
        errors: validationResult.error.errors,
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
        message: "Doctor not found",
      });
      return;
    }

    // patient User detail
    const patientUser = await User.findById(patientId);
    if (!patientUser) {
      res.status(400).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const AppointmentModel = appointmentModels[appointmentTypeRef];
    if (!AppointmentModel) {
      res.status(400).json({
        success: false,
        message: "Invalid appointment type reference",
      });
      return;
    }

    // appointment detail
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      res.status(400).json({
        success: false,
        message: "Appointment not found for given ID and type",
      });
      return;
    }

    let savedPrescription, message;
    // ***** prescription id already exist
    if (appointment.prescriptionId) {
      message = "Prescription updated successfully";
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
      message = "Prescription created successfully";
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

    res.status(200).json({
      success: true,
      message: message,
      data: savedPrescription,
    });
  } catch (error) {
    console.error("Error creating/updating prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create or update prescription",
    });
  }
};
