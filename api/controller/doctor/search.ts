import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import { generateSignedUrlsForDoctor } from "../../utils/signed-url";
import mongoose from "mongoose";

export const searchDoctor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      userId,
      query,
      limit = 10,
      gender,
      appointmentType,
      specialization,
    } = req.query;

    const parsedLimit = Number(limit);
    const loggedInUserId = (req as any).userId;

    // Parse appointments into an array
    const appointmentTypes = appointmentType
      ? String(appointmentType)
          .split(",")
          .map((t) => t.trim().toLowerCase().replace(/\s+/g, ""))
      : [];

    // ***** Step 1 : Only getting approved doctors & have active subscriptions ***** \\
    const now = new Date();
    const doctorFilter: any = {
      status: "approved",
      subscriptions: {
        $elemMatch: {
          endDate: { $gt: now },
        },
      },
    };

    if (loggedInUserId) {
      doctorFilter.userId = {
        $ne: new mongoose.Types.ObjectId(loggedInUserId),
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

    let doctorsBySpecialization: any[] = [];
    if (query && !specialization) {
      const queryRegex = new RegExp(String(query), "i");

      const filter: any = { ...doctorFilter };
      if (!specialization) {
        filter.specialization = { $regex: queryRegex };
      }
      doctorsBySpecialization = await Doctor.find(filter)
        .select("-password")
        .populate({
          path: "userId",
          match: { isDocumentVerified: true, ...(gender ? { gender } : {}) },
          select: "firstName lastName email phone profilePic gender",
        })
        .limit(parsedLimit);
    }
    // Step 4: If no specialization match, search by name
    let finalDoctors: any[] = doctorsBySpecialization.filter(
      (doc) => doc.userId
    );
    if (finalDoctors.length === 0 && query) {
      const queryRegex = new RegExp(String(query), "i");
      const doctorsByName = await Doctor.find(doctorFilter)
        .select("-password")
        .populate({
          path: "userId",
          match: {
            isDocumentVerified: true,
            ...(gender ? { gender } : {}),
            $or: [{ firstName: queryRegex }, { lastName: queryRegex }],
          },
          select: "firstName lastName email phone profilePic gender",
        })
        .limit(parsedLimit);

      finalDoctors = doctorsByName.filter((doc) => doc.userId);
    }
    if (!query) {
      finalDoctors = await Doctor.find(doctorFilter)
        .select("-password")
        .populate({
          path: "userId",
          match: { isDocumentVerified: true, ...(gender ? { gender } : {}) },
          select: "firstName lastName email phone profilePic gender",
        })
        .limit(parsedLimit);

      finalDoctors = finalDoctors.filter((doc) => doc.userId);
    }

    // Step 6: Format response
    const doctorsWithSignedUrls = await Promise.all(
      finalDoctors.map(async (doctor) => {
        const doctorObj = doctor.toObject();
        const processed = await generateSignedUrlsForDoctor(doctorObj);

        const user = doctorObj.userId as any;
        return {
          ...processed,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          profilePic: user.profilePic,
          gender: user.gender,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: doctorsWithSignedUrls,
      message: "Doctors fetched successfully",
    });
  } catch (error: any) {
    console.error("Error while searching doctors:", error);
    res.status(500).json({
      success: false,
      message: "Error while searching doctors",
    });
  }
};
