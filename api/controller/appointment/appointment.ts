import { Request, Response } from "express";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import Doctor from "../../models/user/doctor-model";
import Patient from "../../models/user/patient-model";

/**
 * Shared appointment controller for routes that aggregate all 4 appointment types
 * (online, emergency, clinic, home visit). Used by GET /appointment/doctor,
 * GET /appointment/patient, POST /appointment/doctor/by-date.
 */

/** GET all appointments for the logged-in doctor (all 4 types) */
export const getDoctorAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorUserId = req.user.id;

    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "getDoctorAppointments:doctor-not-found",
      });
      return;
    }
    const doctorId = doctor._id;

    const onlineAppointments = await OnlineAppointment.find({ doctorId })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .sort({ "slot.day": 1, "slot.time.start": 1 });

    const emergencyAppointments = await EmergencyAppointment.find({ doctorId })
      .populate({
        path: "patientId",
        select: "userId healthMetrics insurance mapLocation",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .sort({ createdAt: -1 });

    const clinicAppointments = await ClinicAppointment.find({ doctorId })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "userId specialization clinicVisit",
        populate: {
          path: "userId",
          select: "firstName lastName profilePic",
        },
      })
      .sort({ "slot.day": -1, "slot.time.start": -1 });

    const homeVisitAppointments = await HomeVisitAppointment.find({ doctorId })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId homeVisit",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .sort({ "slot.day": -1, "slot.time.start": -1 });

    res.status(200).json({
      success: true,
      message: "Doctor appointments retrieved successfully.",
      action: "getDoctorAppointments:success",
      data: {
        onlineAppointments,
        emergencyAppointments,
        clinicAppointments,
        homeVisitAppointments,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting doctor appointments:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the doctor appointments. Please try again.",
      action: "getDoctorAppointments:error",
    });
  }
};

/** GET all appointments for the logged-in patient (all 4 types) */
export const getPatientAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "getPatientAppointments:patient-not-found",
      });
      return;
    }
    const patientId = patient._id;

    const onlineAppointments = await OnlineAppointment.find({ patientId })
      .select(
        "-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning"
      )
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({ path: "ratingId", select: "rating review updatedAt" })
      .sort({ "slot.day": 1, "slot.time.start": 1 });

    const emergencyAppointments = await EmergencyAppointment.find({ patientId })
      .select(
        "-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning"
      )
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({ path: "ratingId", select: "rating review updatedAt" })
      .sort({ createdAt: -1 });

    const clinicAppointments = await ClinicAppointment.find({ patientId })
      .select(
        "-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning"
      )
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId clinicVisit",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({ path: "ratingId", select: "rating review updatedAt" })
      .sort({ "slot.day": 1, "slot.time.start": 1 });

    const homeVisitAppointments = await HomeVisitAppointment.find({ patientId })
      .select(
        "-paymentDetails.doctorPlatformFee -paymentDetails.doctorOpsExpense -paymentDetails.doctorEarning"
      )
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId homeVisit",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({ path: "ratingId", select: "rating review updatedAt" })
      .sort({ "slot.day": -1, "slot.time.start": -1 });

    res.status(200).json({
      success: true,
      message: "Patient appointments retrieved successfully.",
      action: "getPatientAppointments:success",
      data: {
        onlineAppointments,
        emergencyAppointments,
        clinicAppointments,
        homeVisitAppointments,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting patient appointments:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the patient appointments. Please try again.",
      action: "getPatientAppointments:error",
    });
  }
};

/** POST get doctor's appointments for a given date (body: { date: "YYYY-MM-DD" }). Currently returns online appointments only. */
export const getDoctorAppointmentByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date } = req.body;

    if (!date) {
      res.status(400).json({
        success: false,
        message: "Date is required in request body.",
        action: "getDoctorAppointmentByDate:missing-date",
      });
      return;
    }

    const doctorUserId = req.user.id;
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "getDoctorAppointmentByDate:doctor-not-found",
      });
      return;
    }

    const startDate = new Date(date as string);
    const endDate = new Date(date as string);
    endDate.setDate(endDate.getDate() + 1);

    const appointments = await OnlineAppointment.find({
      doctorId: doctor._id,
      "slot.day": {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .populate({
        path: "doctorId",
        select: "qualifications specialization userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode gender email profilePic",
        },
      })
      .sort({ "slot.time.start": 1 });

    res.status(200).json({
      success: true,
      message: `Appointments for ${date} retrieved successfully.`,
      action: "getDoctorAppointmentByDate:success",
      data: {
        appointments,
        count: appointments.length,
      },
    });
  } catch (error: unknown) {
    console.error("Error getting doctor appointments by date:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't retrieve appointments for that date. Please try again.",
      action: "getDoctorAppointmentByDate:error",
    });
  }
};
