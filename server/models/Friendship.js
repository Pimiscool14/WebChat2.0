const mongoose = require("mongoose")

const friendshipSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  status: { type: String, enum: ["pending", "accepted"], default: "pending" }
}, { timestamps: true })

friendshipSchema.index({ from: 1, to: 1 }, { unique: true })

module.exports = mongoose.model("Friendship", friendshipSchema)
