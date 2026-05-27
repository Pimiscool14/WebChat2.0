const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, default: "" },
  friends: { type: [String], default: [] },
  bannedFrom: { type: [String], default: [] },
  lastPage: { type: String, default: "servers" },
  activeServerId: { type: String, default: null },
  activeChatId: { type: String, default: null },
  activeDm: { type: String, default: null },
  personalMutesByServer: { type: mongoose.Schema.Types.Mixed, default: {} },
  muteAllByServer: { type: mongoose.Schema.Types.Mixed, default: {} },
  mutedInByServer: { type: mongoose.Schema.Types.Mixed, default: {} },
  sessionToken: { type: String, default: null },
  displayName: { type: String, default: "" },
  bio: { type: String, default: "", maxlength: 500 },
  avatarUrl: { type: String, default: null }
})

module.exports = mongoose.model("User", userSchema)
