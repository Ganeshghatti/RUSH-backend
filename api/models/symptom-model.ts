import mongoose, { Schema } from "mongoose";

const symptomRecordSchema = new Schema({
  symptom: {
    type: String,
    required: true,
    trim: true,
  },
  specialist: {
    type: String,
    required: true,
    trim: true,
  },
});

const SymptomRecord = mongoose.model("SymptomRecord", symptomRecordSchema);

export default SymptomRecord;
