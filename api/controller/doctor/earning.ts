import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";

export const getDoctorEarnings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorUserId = req.user.id;
    const month = req.query.month as string | undefined;

    const doctor = await Doctor.findOne({ userId: doctorUserId });
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

    const [online, emergency, home, clinic] = await Promise.all([
      OnlineAppointment.find({ doctorId, ...dateFilter }),
      EmergencyAppointment.find({ doctorId, ...dateFilter }),
      HomeVisitAppointment.find({ doctorId, ...dateFilter }),
      ClinicAppointment.find({ doctorId, ...dateFilter }),
    ]);

    const extractEarning = (appt: any) =>
      appt.paymentDetails?.doctorEarning || 0;

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
  } catch (error: any) {
    console.error("Error getting doctor earnings:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the doctor earnings.",
      action: error.message,
    });
  }
};
