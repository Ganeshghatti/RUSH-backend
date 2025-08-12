import { Request, Response } from "express";
import XLSX from "xlsx";
import UnregisteredPatient from "../../models/user/unregistered-patient-model";

export const addUnregisteredPatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      res.status(400).json({
        success: false,
        message: "Uploaded sheet is empty",
      });
      return;
    }

    const patients = sheetData.map((row: any) => ({
      name: row.name || row.Name || null,
      phone: row.phone || row.Phone || null,
      email: row.email || row.Email || null,
      gender: row.gender || row.Gender || null,
      disease: row.disease || row.Disease || null,
    }))
    .filter(patient => patient.name && patient.email && patient.phone);

    await UnregisteredPatient.insertMany(patients);

    res.status(201).json({
      success: true,
      message: `${patients.length} unregistered patients added successfully`,
    });
  } catch (err) {
    console.error("Error uploading unregistered patients:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload unregistered patients",
    });
  }
};
