const mongoose = require("mongoose")

const serverSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  chatId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, default: "open" },
  owner: { type: String, required: true },
  iconUrl: { type: String, default: null },
  inviteCode: { type: String, default: null },
  approvedUsers: { type: [String], default: [] },
  bannedUsers: { type: [String], default: [] },
  mutedForAll: { type: [String], default: [] }
})

module.exports = mongoose.model("Server", serverSchema)
