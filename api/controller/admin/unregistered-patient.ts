import { Request, Response } from "express";
import UnregisteredPatient from "../../models/user/unregistered-patient-model";

interface UnregisteredPatientRow {
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  age?: number | string;
  address?: string;
  locality?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  disease?: string;
}

export const addUnregisteredPatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const patientsData = req.body;

    if (!Array.isArray(patientsData) || patientsData.length === 0) {
      res.status(400).json({
        success: false,
        message: "No patient data provided or empty array",
      });
      return;
    }

    const patients = patientsData
      .map((row: UnregisteredPatientRow) => {
        const phoneVal = row.phone || "";
        const genderVal = row.gender || null;

        return {
          // basic details
          name: (row.name || "").toString().trim() || null,
          phone: phoneVal.toString().trim() || null,
          email:
            (row.email || "").toString().trim().toLowerCase() ||
            null,
          gender: genderVal
            ? genderVal.charAt(0).toUpperCase() +
              genderVal.slice(1).toLowerCase()
            : null,
          age:
            row.age !== undefined && row.age !== null
              ? Number(row.age) || null
              : null,

          // location details
          address: (row.address || "").toString().trim() || null,
          locality:
            (row.locality || "").toString().trim() || null,
          pincode: (row.pincode || "").toString().trim() || null,
          city: (row.city || "").toString().trim() || null,
          state: (row.state || "").toString().trim() || null,
          country:
            (row.country || "India").toString().trim() ||
            "India",

          // medical details
          disease: (row.disease || "").toString().trim() || null,
        };
      })
      .filter((patient) => patient.name && patient.email && patient.phone);

    console.log("Patients ", patients);

    if (patients.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid patient records with required fields found",
      });
      return;
    }

    await UnregisteredPatient.insertMany(patients);

    res.status(201).json({
      success: true,
      message: `${patients.length} unregistered patients added successfully`,
    });
  } catch (err) {
    console.error("Error adding unregistered patients:", err);
    res.status(500).json({
      success: false,
      message: "Failed to add unregistered patients",
    });
  }
};

export const getUnregisteredPatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const patients = await UnregisteredPatient.find();

    res.status(200).json({
      success: true,
      data: patients,
    });
  } catch (err) {
    console.error("Error getting unregistered patients:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get unregistered patients",
    });
  }
};
