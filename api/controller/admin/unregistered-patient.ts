import { Request, Response } from "express";
import UnregisteredPatient from "../../models/user/unregistered-patient-model";

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
      .map((row: any) => {
        const phoneVal = row.phone || row.Phone || "";
        const genderVal = row.gender || row.Gender || null;

        return {
          name: (row.name || row.Name || "").toString().trim() || null,
          phone:
            phoneVal !== null && phoneVal !== undefined
              ? phoneVal.toString().trim()
              : null,
          email:
            (row.email || row.Email || "").toString().trim().toLowerCase() ||
            null,
          gender: genderVal
            ? genderVal.charAt(0).toUpperCase() +
              genderVal.slice(1).toLowerCase()
            : null,
          disease: row.disease || row.Disease || null,
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
