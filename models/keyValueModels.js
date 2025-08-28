import mongoose from "mongoose";


const KeyValueModel = mongoose.model("KeyValuePair", new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },  dataPair:{
    type: mongoose.Schema.Types.Mixed, // Allows any type, including objects
    required: false,
  }
}, { timestamps: true }));
export default KeyValueModel; 