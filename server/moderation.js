const ServerModel = require("./models/Server")
const { addUserBan, setUserMutedIn } = require("./userState")

function findUserSocket(io, username) {
  return [...io.sockets.sockets.values()].find(s => s.username === username)
}

function broadcastModState(io, group, serverId) {
  io.to(group.chatId).emit("serverModUpdate", {
    serverId,
    mutedForAll: group.mutedForAll || []
  })
}

async function removeFromServer(io, group, serverId, targetUsername) {
  group.members = group.members.filter(m => m.username !== targetUsername)

  const targetSocket = findUserSocket(io, targetUsername)
  if (targetSocket && targetSocket.serverId === serverId) {
    targetSocket.leave(group.chatId)
    if (targetSocket.chatId === group.chatId) {
      targetSocket.chatId = null
    }
    targetSocket.serverId = null
  }

  return targetSocket
}

async function kickMember(io, groups, serverId, targetUsername, actorUsername) {
  const group = groups[serverId]
  if (!group) return { error: "Server not found" }
  if (actorUsername !== group.owner) return { error: "Only the owner can kick" }
  if (targetUsername === group.owner) return { error: "Cannot kick the owner" }

  const targetSocket = await removeFromServer(io, group, serverId, targetUsername)
  if (targetSocket) {
    targetSocket.emit("kicked", { serverId, serverName: group.name })
  }

  io.emit("serversList", Object.entries(groups).map(([id, g]) => ({
    id,
    chatId: g.chatId,
    name: g.name,
    members: g.members.length,
    type: g.type,
    owner: g.owner
  })))

  return { success: true }
}

async function banMember(io, groups, serverId, targetUsername, actorUsername) {
  const group = groups[serverId]
  if (!group) return { error: "Server not found" }
  if (actorUsername !== group.owner) return { error: "Only the owner can ban" }
  if (targetUsername === group.owner) return { error: "Cannot ban the owner" }

  if (!group.bannedUsers.includes(targetUsername)) {
    group.bannedUsers.push(targetUsername)
    await ServerModel.updateOne(
      { id: serverId },
      { $addToSet: { bannedUsers: targetUsername } }
    )
  }

  group.approvedUsers = group.approvedUsers.filter(u => u !== targetUsername)
  group.pendingRequests = group.pendingRequests.filter(
    r => r.username !== targetUsername
  )
  await ServerModel.updateOne(
    { id: serverId },
    {
      $pull: { approvedUsers: targetUsername }
    }
  )

  await addUserBan(targetUsername, serverId)

  const targetSocket = await removeFromServer(io, group, serverId, targetUsername)
  if (targetSocket) {
    targetSocket.emit("banned", { serverId, serverName: group.name })
  }

  io.emit("serversList", Object.entries(groups).map(([id, g]) => ({
    id,
    chatId: g.chatId,
    name: g.name,
    members: g.members.length,
    type: g.type,
    owner: g.owner
  })))

  return { success: true }
}

async function setMuteForAll(io, groups, serverId, targetUsername, actorUsername, muted) {
  const group = groups[serverId]
  if (!group) return { error: "Server not found" }
  if (actorUsername !== group.owner) return { error: "Only the owner can do this" }
  if (targetUsername === group.owner) return { error: "Cannot mute the owner" }

  if (muted) {
    if (!group.mutedForAll.includes(targetUsername)) {
      group.mutedForAll.push(targetUsername)
    }
    await ServerModel.updateOne(
      { id: serverId },
      { $addToSet: { mutedForAll: targetUsername } }
    )
    await setUserMutedIn(targetUsername, serverId, "forAll")
  } else {
    group.mutedForAll = group.mutedForAll.filter(u => u !== targetUsername)
    await ServerModel.updateOne(
      { id: serverId },
      { $pull: { mutedForAll: targetUsername } }
    )
    await setUserMutedIn(targetUsername, serverId, null)
  }

  broadcastModState(io, group, serverId)
  return { success: true, mutedForAll: group.mutedForAll }
}

module.exports = {
  kickMember,
  banMember,
  setMuteForAll,
  findUserSocket
}
