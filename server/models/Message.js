const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true, index: true },
    serverId: { type: String, default: null },
    username: { type: String, default: "" },
    message: { type: String, default: "" },
    attachments: {
      type: [
        {
          type: { type: String, required: true },
          url: { type: String, required: true },
          filename: { type: String, default: "" }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Message", messageSchema)
