import type { VercelRequest, VercelResponse } from "@vercel/node";
import connectDB from "./config/db";

import { updateAppointmentExpiredStatus } from "./controller/appointment/online-appointment";
import { updateClinicAppointmentExpiredStatus } from "./controller/appointment/clinic-appointment";
import { updateHomeVisitAppointmentExpiredStatus } from "./controller/appointment/homevisit-appointment";
import { updateEmergencyAppointmentExpiredStatus } from "./controller/appointment/emergency-appointment";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDB(); 

    const results = await Promise.all([
      updateAppointmentExpiredStatus(),
      updateClinicAppointmentExpiredStatus(),
      updateHomeVisitAppointmentExpiredStatus(),
      updateEmergencyAppointmentExpiredStatus(),
    ]);

    console.log("Results " ,results);

    return res.status(200).json({
      success: true,
      message: "Expired appointments updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Cron job error:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to update expired appointments",
      details: err.message,
    });
  }
}
