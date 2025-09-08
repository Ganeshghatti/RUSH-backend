import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import { generateSignedUrlsForDoctor } from "../../utils/signed-url";
import User from "../../models/user/user-model";

export const searchDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit = 10, gender, appointment } = req.query;

    const parsedLimit = Number(limit);
    const queryRegex = query ? new RegExp(String(query), 'i') : null;

    // Step 1: Build filters
    const userFilter: any = { roles: 'doctor', isDocumentVerified: true };
    if (queryRegex) userFilter.firstName = { $regex: queryRegex };
    if (gender) userFilter.gender = gender;

    const matchedUsers = await User.find(userFilter)
      .select('_id')
      .lean();

    const matchedUserIds = matchedUsers.map(user => user._id);

    // Step 2: Doctor filter for matched userIds
    const now = new Date();
    const doctorFilter: any = {
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
      ? await Doctor.find(doctorFilter)
          .select('-password')
          .populate({
            path: 'userId',
            match: gender ? { gender } : undefined, // Apply gender match at populate level
            select: 'firstName lastName email phone profilePic gender'
          })
          .limit(parsedLimit)
      : [];

    // Step 3: Doctor filter for specialization match
    const specializationFilter: any = {
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

    const doctorsBySpecialization = await Doctor.find(specializationFilter)
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
      finalDoctors = await Doctor.find({
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
    const doctorsWithSignedUrls = await Promise.all(
      finalDoctors
        .filter(doctor => doctor.userId) // Remove doctors with null user (gender mismatch)
        .slice(0, parsedLimit)
        .map(async (doctor) => {
          const doctorObj = doctor.toObject();
          const processed = await generateSignedUrlsForDoctor(doctorObj);

          const user = doctorObj.userId as any;
          return {
            ...processed,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone,
            profilePic: user.profilePic,
            gender: user.gender
          };
        })
    );

    res.status(200).json({
      success: true,
      data: doctorsWithSignedUrls,
      message: "Doctors fetched successfully"
    });

  } catch (error: any) {
    console.error("Error while searching doctors:", error);
    res.status(500).json({
      success: false,
      message: "Error while searching doctors"
    });
  }
};