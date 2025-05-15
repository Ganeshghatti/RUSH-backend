import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import { generateSignedUrlsForDoctor } from "../../utils/signed-url";
import { Types, Document } from "mongoose";
import User from "../../models/user/user-model";

interface DoctorDocument {
  _id: Types.ObjectId;
  userId: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone: string;
    profileImage?: string;
  };
  specialization: string[];
  toObject(): any;
}

export const searchDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      res.status(400).json({
        success: false,
        message: "Search query is required"
      });
      return;
    }

    // Create case-insensitive regex pattern for partial matching
    const queryRegex = new RegExp(String(query), 'i');
    
    // Search in both collections simultaneously
    const [doctorUsers, doctorsBySpecialization] = await Promise.all([
      // Search users who are doctors by name
      User.find({
        roles: "doctor",
        firstName: { $regex: queryRegex }
      }).select('_id firstName lastName email phone profileImage'),

      // Search doctors by specialization
      Doctor.find({
        specialization: { $regex: queryRegex }
      })
      .populate('userId')
      .limit(Number(limit))
    ]);

    // Get IDs of doctors found by name search
    const doctorUserIds = doctorUsers.map(user => user._id);

    // If we found doctors by name, get their doctor records
    const doctorsByName = doctorUserIds.length > 0 ? 
      await Doctor.find({
        userId: { $in: doctorUserIds }
      })
      .populate('userId')
      .limit(Number(limit)) : 
      [];

    // Combine results, removing duplicates
    const combinedDoctors = [...doctorsBySpecialization];
    doctorsByName.forEach(doctor => {
      const isDuplicate = combinedDoctors.some(
        existingDoctor => existingDoctor._id.toString() === doctor._id.toString()
      );
      if (!isDuplicate) {
        combinedDoctors.push(doctor);
      }
    });

    // Limit the final results
    const limitedDoctors = combinedDoctors.slice(0, Number(limit));

    // Generate signed URLs for each doctor
    const doctorsWithSignedUrls = await Promise.all(
      limitedDoctors.map(async (doctor) => {
        if (!doctor) return null;
        
        const doctorObj = doctor.toObject();
        const processedDoctor = await generateSignedUrlsForDoctor(doctorObj);
        
        // Ensure we have the basic user info
        if (doctorObj?.userId) {
          return {
            ...processedDoctor,
            name: (doctorObj.userId as any).name,
            email: (doctorObj.userId as any).email, 
            phone: (doctorObj.userId as any).phone,
            profileImage: (doctorObj.userId as any).profileImage
          };
        }
        
        return processedDoctor;
      })
    );

    const validDoctors = doctorsWithSignedUrls.filter((doctor): doctor is NonNullable<typeof doctor> => 
      doctor !== null && doctor._id !== undefined && (doctor.userId !== undefined || doctor.email !== undefined)
    );

    res.status(200).json({
      success: true,
      data: validDoctors,
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