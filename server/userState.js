const crypto = require("crypto")
const User = require("./models/User")
const ServerModel = require("./models/Server")
const Friendship = require("./models/Friendship")

function friendUsername(doc, self) {
  return doc.from === self ? doc.to : doc.from
}

async function syncFriendsToUser(username) {
  const rows = await Friendship.find({
    status: "accepted",
    $or: [{ from: username }, { to: username }]
  }).lean()

  const names = rows
    .map((row) => friendUsername(row, username))
    .sort((a, b) => a.localeCompare(b))

  await User.updateOne({ username }, { $set: { friends: names } })
  return names
}

async function syncBannedFromServers(username) {
  const servers = await ServerModel.find({ bannedUsers: username }).lean()
  const ids = servers.map((s) => s.id)
  await User.updateOne({ username }, { $set: { bannedFrom: ids } })
  return ids
}

function getSessionFromUser(user) {
  if (!user) return null
  const serverId = user.activeServerId || null
  const personalMutesByServer = user.personalMutesByServer || {}
  const muteAllByServer = user.muteAllByServer || {}
  const mutedInByServer = user.mutedInByServer || {}

  return {
    lastPage: user.lastPage || "servers",
    activeServerId: serverId,
    activeChatId: user.activeChatId || null,
    activeDm: user.activeDm || null,
    personalMutes: serverId ? personalMutesByServer[serverId] || {} : {},
    muteAllActive: serverId ? !!muteAllByServer[serverId] : false,
    mutedIn: serverId && mutedInByServer[serverId] ? mutedInByServer[serverId] : null
  }
}

async function issueSessionToken(username) {
  const token = crypto.randomBytes(24).toString("hex")
  await User.updateOne({ username }, { $set: { sessionToken: token } })
  return token
}

async function validateSessionToken(username, token) {
  if (!username || !token) return null
  const user = await User.findOne({ username, sessionToken: token }).lean()
  return user || null
}

async function buildUserLoginPayload(username, onlineUsers) {
  await syncFriendsToUser(username)
  const bannedFrom = await syncBannedFromServers(username)

  const user = await User.findOne({ username }).lean()
  const approved = await ServerModel.find({
    approvedUsers: username
  }).lean()

  const { buildFriendsPayload } = require("./friends")
  const friends = await buildFriendsPayload(username, onlineUsers)

  const { toPublicProfile } = require("./profile")

  return {
    accessList: approved.map((s) => s.id),
    friends,
    bannedFrom: user?.bannedFrom || bannedFrom,
    session: getSessionFromUser(user),
    myProfile: toPublicProfile(user)
  }
}

async function saveUserSession(username, data) {
  const user = await User.findOne({ username })
  if (!user) return

  const serverId = data.activeServerId || null
  user.lastPage = data.lastPage || user.lastPage || "servers"
  user.activeServerId = serverId
  user.activeChatId = data.activeChatId || null
  user.activeDm = data.activeDm || null

  if (serverId) {
    const mutes = user.personalMutesByServer || {}
    const muteAll = user.muteAllByServer || {}
    mutes[serverId] = data.personalMutes || {}
    muteAll[serverId] = !!data.muteAllActive
    user.personalMutesByServer = mutes
    user.muteAllByServer = muteAll
  }

  await user.save()
}

async function setUserMutedIn(username, serverId, type) {
  const user = await User.findOne({ username })
  if (!user) return

  const mutedInByServer = user.mutedInByServer || {}
  if (type) mutedInByServer[serverId] = type
  else delete mutedInByServer[serverId]
  user.mutedInByServer = mutedInByServer
  await user.save()
}

async function addUserBan(username, serverId) {
  await User.updateOne(
    { username },
    { $addToSet: { bannedFrom: serverId } }
  )
}

async function savePersonalMutes(username, serverId, personalMutes) {
  const user = await User.findOne({ username })
  if (!user) return

  const mutes = user.personalMutesByServer || {}
  mutes[serverId] = personalMutes
  user.personalMutesByServer = mutes
  await user.save()
}

module.exports = {
  syncFriendsToUser,
  syncBannedFromServers,
  getSessionFromUser,
  buildUserLoginPayload,
  saveUserSession,
  setUserMutedIn,
  addUserBan,
  savePersonalMutes,
  issueSessionToken,
  validateSessionToken
}
