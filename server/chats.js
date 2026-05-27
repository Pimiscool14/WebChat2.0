const mongoose = require("mongoose")
const Message = require("./models/Message")
const ServerModel = require("./models/Server")

async function isChatIdUsed(chatId) {
  const hasMessage = await Message.exists({
    $or: [{ chatId }, { groupId: chatId }]
  })
  if (hasMessage) return true
  const hasServer = await ServerModel.exists({
    $or: [{ chatId }, { id: chatId }]
  })
  return !!hasServer
}

async function allocateServerIds(desiredName, groupsInMemory) {
  const base = desiredName.toLowerCase().trim().replace(/\s+/g, "-")
  let n = 1
  let serverId = base

  while (true) {
    const serverTaken =
      groupsInMemory[serverId] ||
      await ServerModel.exists({ id: serverId })

    const chatTaken = await isChatIdUsed(serverId)

    if (!serverTaken && !chatTaken) {
      return { serverId, chatId: serverId, name: desiredName }
    }

    n += 1
    serverId = `${base}-${n}`
  }
}

async function findChatMessages(chatId) {
  return Message.find({
    $or: [{ chatId }, { groupId: chatId }]
  })
    .sort({ createdAt: 1 })
    .lean()
}

async function saveChatMessage({ chatId, serverId, username, message, attachments }) {
  const text = (message || "").trim()
  const files = attachments || []
  if (!text && !files.length) return null

  return new Message({
    chatId,
    serverId: serverId || null,
    username,
    message: text,
    attachments: files
  }).save()
}

async function updateChatMessage(messageId, username, newText) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return { error: "This message cannot be edited" }
  }
  const doc = await Message.findById(messageId)
  if (!doc) return { error: "Message not found" }
  if (doc.username !== username) return { error: "You can only edit your own messages" }
  const text = newText.trim()
  if (!text && !(doc.attachments?.length)) return { error: "Message cannot be empty" }
  doc.message = text
  await doc.save()
  return { doc }
}

async function deleteChatMessage(messageId, username) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return { error: "This message cannot be deleted" }
  }
  const doc = await Message.findById(messageId)
  if (!doc) return { error: "Message not found" }
  if (doc.username !== username) return { error: "You can only delete your own messages" }
  const chatId = doc.chatId || doc.groupId
  await doc.deleteOne()
  return { chatId }
}

module.exports = {
  allocateServerIds,
  findChatMessages,
  saveChatMessage,
  updateChatMessage,
  deleteChatMessage,
  isChatIdUsed
}
