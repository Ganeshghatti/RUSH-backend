import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import { generateSignedUrlsForDoctor } from "../../utils/signed-url";
import { Types } from "mongoose";

interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
}

interface IDoctor {
  _id: Types.ObjectId;
  userId?: IUser;
  qualifications: Array<{
    degree: string;
    college: string;
    year: number;
    degreePost: string;
    degreeImage?: string;
  }>;
  registration: Array<{
    regNumber: string;
    council: string;
    isVerified: boolean;
    licenseImage?: string;
    specialization: string;
  }>;
  specialization: string[];
  signatureImage?: string;
  experience: Array<{
    experienceName: string;
    institution: string;
    fromYear: number;
    toYear?: number;
    isCurrent: boolean;
  }>;
}

export const searchDoctor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { specialist, limit = 10 } = req.query;
    
    if (!specialist) {
      res.status(400).json({
        success: false,
        message: "Specialist parameter is required"
      });
      return;
    }

    // Create case-insensitive regex pattern for partial matching
    const specialistRegex = new RegExp(String(specialist), 'i');
    
    const query = {
      specialization: { $regex: specialistRegex }
    };

    const doctors = await Doctor.find(query)
      .limit(Number(limit))
      .populate<{ userId: IUser }>({
        path: 'userId',
        select: 'name email phone profileImage'
      });

    // Generate signed URLs for each doctor
    const doctorsWithSignedUrls = await Promise.all(
      doctors.map(async (doctor) => {
        if (!doctor) return null;
        
        const doctorObj = doctor.toObject() as IDoctor;
        const processedDoctor = await generateSignedUrlsForDoctor(doctorObj);
        
        // Ensure we have the basic user info even if userId is populated
        if (doctorObj?.userId) {
          return {
            ...processedDoctor,
            name: doctorObj.userId.name,
            email: doctorObj.userId.email,
            phone: doctorObj.userId.phone,
            profileImage: doctorObj.userId.profileImage
          };
        }
        
        return processedDoctor;
      })
    );

    // Filter out any null values and invalid entries
    const validDoctors = doctorsWithSignedUrls.filter((doctor): doctor is NonNullable<typeof doctor> => 
      doctor !== null && doctor._id !== undefined && (doctor.userId !== undefined || doctor.email !== undefined)
    );

    res.status(200).json({
      success: true,
      data: validDoctors,
      message: "Doctors fetched successfully"
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error while searching doctors",
      error: error.message
    });
  }
};

