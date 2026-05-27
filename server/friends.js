const Friendship = require("./models/Friendship")
const User = require("./models/User")
const { syncFriendsToUser } = require("./userState")

function friendUsername(doc, self) {
  return doc.from === self ? doc.to : doc.from
}

async function buildFriendsPayload(username, onlineUsers) {
  const user = await User.findOne({ username }).lean()
  let friendNames = user?.friends || []

  if (!friendNames.length) {
    friendNames = await syncFriendsToUser(username)
  }

  const rows = await Friendship.find({
    $or: [{ from: username }, { to: username }]
  }).lean()

  const friends = []
  const pendingIncoming = []
  const pendingOutgoing = []

  for (const row of rows) {
    if (row.status === "accepted") {
      const name = friendUsername(row, username)
      friends.push({
        username: name,
        online: onlineUsers.has(name)
      })
    } else if (row.status === "pending") {
      if (row.to === username) {
        pendingIncoming.push({ username: row.from })
      } else if (row.from === username) {
        pendingOutgoing.push({ username: row.to })
      }
    }
  }

  for (const name of friendNames) {
    if (!friends.some((f) => f.username === name)) {
      friends.push({ username: name, online: onlineUsers.has(name) })
    }
  }

  friends.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1
    return a.username.localeCompare(b.username)
  })

  return { friends, pendingIncoming, pendingOutgoing }
}

async function sendFriendRequest(from, to, io, onlineUsers, emitToUser, pushFriendsUpdate) {
  const target = to.toLowerCase().trim()
  const sender = from.toLowerCase().trim()

  if (target === sender) {
    return { error: "You cannot add yourself" }
  }

  const userExists = await User.findOne({ username: target })
  if (!userExists) {
    return { error: "User not found" }
  }

  const existing = await Friendship.findOne({
    $or: [
      { from: sender, to: target },
      { from: target, to: sender }
    ]
  })

  if (existing) {
    if (existing.status === "accepted") {
      return { error: "Already friends" }
    }
    if (existing.from === sender) {
      return { error: "Friend request already sent" }
    }
    existing.status = "accepted"
    await existing.save()
    await syncFriendsToUser(sender)
    await syncFriendsToUser(target)
    await pushFriendsUpdate(sender)
    await pushFriendsUpdate(target)
    return { success: true, message: "Friend request accepted (they already sent you one)" }
  }

  await Friendship.create({ from: sender, to: target, status: "pending" })
  emitToUser(target, "friendRequestReceived", { username: sender })
  await pushFriendsUpdate(sender)
  await pushFriendsUpdate(target)
  return { success: true, message: "Friend request sent" }
}

module.exports = {
  buildFriendsPayload,
  sendFriendRequest,
  friendUsername
}
