import { Request, Response } from "express";
import SymptomRecord from "../../models/symptom-model";

export const searchSymptoms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query, limit } = req.query;
    const limitValue = limit ? parseInt(limit as string) : 10;
    
    let searchQuery = {};
    if (query) {
      searchQuery = { symptom: { $regex: query, $options: "i" } };
    }

    const symptoms = await SymptomRecord.find(searchQuery)
      .limit(limitValue);

    res.status(200).json({
      success: true,
      message: "Symptoms fetched successfully",
      data: symptoms,
    });
  } catch (error) {
    console.error("Error searching symptoms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search symptoms",
    });
  }
};