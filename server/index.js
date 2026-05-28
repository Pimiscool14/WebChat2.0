require("dotenv").config()

const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const User = require("./models/User")
const Message = require("./models/Message")
const ServerModel = require("./models/Server")
const Friendship = require("./models/Friendship")
const { buildFriendsPayload, sendFriendRequest } = require("./friends")
const { dmChatId, areFriends } = require("./dm")
const {
  allocateServerIds,
  findChatMessages,
  saveChatMessage,
  updateChatMessage,
  deleteChatMessage
} = require("./chats")
const { kickMember, banMember, setMuteForAll } = require("./moderation")
const {
  buildUserLoginPayload,
  saveUserSession,
  savePersonalMutes,
  syncFriendsToUser,
  issueSessionToken,
  validateSessionToken
} = require("./userState")

const express = require("express")
const http = require("http")
const path = require("path")
const cors = require("cors")
const { Server } = require("socket.io")
const { upload, mediaTypeFromFile } = require("./uploads")
const { avatarUpload, processAvatar } = require("./avatarUpload")
const { serverIconUpload, processServerIcon, ICON_MAX_MB } = require("./serverIconUpload")
const { toPublicProfile, validateDisplayName, validateBio } = require("./profile")

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || [
  "http://localhost:5173",
  "https://web--chat.vercel.app"
]

const app = express()
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://web--chat.vercel.app"
  ]
}))
app.use(express.json())
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.get("/api/health", (_req, res) => res.json({ ok: true }))

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    const username = (req.headers["x-username"] || "").toLowerCase().trim()
    if (!(await validateSessionToken(username, token))) {
      return res.status(401).json({ error: "Not logged in" })
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }
    const type = mediaTypeFromFile(req.file.mimetype, req.file.originalname)
    res.json({
      url: `/uploads/${req.file.filename}`,
      type,
      filename: req.file.originalname
    })
  } catch (err) {
    res.status(400).json({ error: err.message || "Upload failed" })
  }
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://web--chat.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
})

app.post("/api/upload-avatar", avatarUpload.single("avatar"), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    const username = (req.headers["x-username"] || "").toLowerCase().trim()
    if (!(await validateSessionToken(username, token))) {
      return res.status(401).json({ error: "Not logged in" })
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" })
    }
    const avatarUrl = await processAvatar(req.file.path, username)
    await User.updateOne({ username }, { $set: { avatarUrl } })
    const user = await User.findOne({ username }).lean()
    const profile = toPublicProfile(user)
    io.emit("profileUpdate", profile)
    res.json({ avatarUrl, profile })
  } catch (err) {
    res.status(400).json({ error: err.message || "Avatar upload failed" })
  }
})

const groups = {}
const declinedUsers = {}
const onlineUsers = new Set()

app.post("/api/upload-server-icon", serverIconUpload.single("icon"), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    const username = (req.headers["x-username"] || "").toLowerCase().trim()
    const serverId = (req.headers["x-server-id"] || "").toLowerCase().trim()

    if (!(await validateSessionToken(username, token))) {
      return res.status(401).json({ error: "Not logged in" })
    }
    if (!serverId) {
      return res.status(400).json({ error: "Missing server id" })
    }
    const group = groups[serverId]
    if (!group) {
      return res.status(404).json({ error: "Server not found" })
    }
    if (group.owner !== username) {
      return res.status(403).json({ error: "Only the server owner can edit this server" })
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" })
    }

    const iconUrl = await processServerIcon(req.file.path, serverId)
    group.iconUrl = iconUrl
    await ServerModel.updateOne({ id: serverId }, { $set: { iconUrl } })
    io.emit("serversList", getServerList())

    res.json({ iconUrl, serverId })
  } catch (err) {
    const msg =
      err?.code === "LIMIT_FILE_SIZE"
        ? `Image too large (max ${ICON_MAX_MB}MB)`
        : (err.message || "Server icon upload failed")
    res.status(400).json({ error: msg })
  }
})

app.delete("/api/server/:serverId", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    const username = (req.headers["x-username"] || "").toLowerCase().trim()
    const serverId = (req.params.serverId || "").toLowerCase().trim()

    if (!(await validateSessionToken(username, token))) {
      return res.status(401).json({ error: "Not logged in" })
    }

    const group = groups[serverId]
    if (!group) {
      return res.status(404).json({ error: "Server not found" })
    }
    if (group.owner !== username) {
      return res.status(403).json({ error: "Only the server owner can delete this server" })
    }

    const chatId = group.chatId
    delete groups[serverId]
    await ServerModel.deleteOne({ id: serverId })
    await Message.deleteMany({ $or: [{ chatId }, { serverId }] })

    io.emit("serversList", getServerList())
    io.emit("serverDeleted", { serverId, chatId })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message || "Delete failed" })
  }
})

function emitToUser(username, event, data) {
  const target = [...io.sockets.sockets.values()].find(
    s => s.username === username
  )
  if (target) target.emit(event, data)
}

async function pushFriendsUpdate(username) {
  if (!username) return
  const payload = await buildFriendsPayload(username, onlineUsers)
  emitToUser(username, "friendsList", payload)
}

function notifyFriendsPresence(username, online) {
  Friendship.find({
    status: "accepted",
    $or: [{ from: username }, { to: username }]
  }).lean().then(rows => {
    for (const row of rows) {
      const friend = row.from === username ? row.to : row.from
      pushFriendsUpdate(friend)
    }
  })
}

function setUserOnline(socket, username) {
  if (!username) return
  socket.username = username
  onlineUsers.add(username)
  notifyFriendsPresence(username, true)
}

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

function getServerList() {
  return Object.entries(groups).map(([id, g]) => ({
    id,
    chatId: g.chatId,
    name: g.name,
    members: g.members.length,
    type: g.type,
    owner: g.owner,
    iconUrl: g.iconUrl || null
  }))
}

function leaveChatRoom(socket) {
  if (socket.chatId) {
    socket.leave(socket.chatId)
    socket.chatId = null
  }
}

function leaveServerMembership(socket, nextServerId) {
  const prevServerId = socket.serverId
  if (!prevServerId || prevServerId === nextServerId) return
  const prev = groups[prevServerId]
  if (!prev) return
  prev.members = prev.members.filter(m => m.id !== socket.id && m.username !== socket.username)
  io.emit("serversList", getServerList())
}

async function completeServerJoin(socket, serverId, username) {
  const group = groups[serverId]
  if (!group) return false

  const alreadyIn = group.members.find(m => m.username === username)
  if (alreadyIn) {
    leaveServerMembership(socket, serverId)
    leaveChatRoom(socket)
    socket.join(group.chatId)
    socket.chatId = group.chatId
    socket.serverId = serverId
    socket.username = username
    const history = await findChatMessages(group.chatId)
    socket.emit("chatHistory", { chatId: group.chatId, serverId, history })
    socket.emit("joinSuccess", {
      id: serverId,
      chatId: group.chatId,
      name: group.name,
      type: group.type,
      owner: group.owner,
      inviteCode: group.inviteCode,
      mutedForAll: group.mutedForAll || []
    })
    return true
  }

  leaveServerMembership(socket, serverId)
  leaveChatRoom(socket)
  socket.join(group.chatId)
  socket.username = username
  socket.serverId = serverId
  socket.chatId = group.chatId

  group.members.push({ id: socket.id, username })

  const history = await findChatMessages(group.chatId)
  socket.emit("chatHistory", { chatId: group.chatId, serverId, history })

  const alreadyJoined = await Message.findOne({
    $or: [{ chatId: group.chatId }, { groupId: group.chatId }],
    username: "",
    message: `${username} joined`
  })

  if (!alreadyJoined) {
    await saveChatMessage({
      chatId: group.chatId,
      serverId,
      username: "",
      message: `${username} joined`
    })
    io.to(group.chatId).emit("newMessage", {
      chatId: group.chatId,
      serverId,
      username: "",
      message: `${username} joined`
    })
  }

  socket.emit("joinSuccess", {
    id: serverId,
    chatId: group.chatId,
    name: group.name,
    type: group.type,
    owner: group.owner,
    inviteCode: group.inviteCode,
    mutedForAll: group.mutedForAll || []
  })
  io.emit("serversList", getServerList())
  return true
}

async function loadServers() {
  const saved = await ServerModel.find().lean()
  for (const s of saved) {
    groups[s.id] = {
      name: s.name,
      chatId: s.chatId || s.id,
      type: s.type,
      owner: s.owner,
      iconUrl: s.iconUrl || null,
      inviteCode: s.inviteCode,
      approvedUsers: s.approvedUsers || [],
      bannedUsers: s.bannedUsers || [],
      mutedForAll: s.mutedForAll || [],
      members: [],
      pendingRequests: []
    }
  }
  console.log(`Loaded ${saved.length} servers from MongoDB`)
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected")
    await loadServers()
  })
  .catch(console.log)

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("register", async ({ username, password, email }) => {
    try {
      if (password.length < 6) {
        socket.emit("authError", "Password must be at least 6 characters")
        return
      }

      const fixedUsername = username.toLowerCase().trim()

      const exists = await User.findOne({ username: fixedUsername })
      if (exists) {
        socket.emit("authError", "User already exists")
        return
      }

      const hashed = await bcrypt.hash(password, 10)
      await new User({ username: fixedUsername, password: hashed, email }).save()
      socket.emit("registerSuccess")
    } catch (err) {
      console.log(err)
      socket.emit("authError", "Register failed")
    }
  })

  socket.on("login", async ({ username, password }) => {
    try {
      const fixedUsername = username.toLowerCase().trim()

      const user = await User.findOne({ username: fixedUsername })
      if (!user) {
        socket.emit("authError", "Account not found")
        return
      }

      const valid = await bcrypt.compare(password, user.password)
      if (!valid) {
        socket.emit("authError", "Wrong password")
        return
      }

      setUserOnline(socket, fixedUsername)

      const token = await issueSessionToken(fixedUsername)
      const payload = await buildUserLoginPayload(fixedUsername, onlineUsers)

      socket.emit("loginSuccess", { ...payload, username: fixedUsername, token })
    } catch (err) {
      console.log(err)
      socket.emit("authError", "Login failed")
    }
  })

  socket.on("getFriends", async () => {
    if (!socket.username) return
    const payload = await buildFriendsPayload(socket.username, onlineUsers)
    socket.emit("friendsList", payload)
  })

  socket.on("sendFriendRequest", async ({ toUsername }) => {
    if (!socket.username) {
      socket.emit("friendError", "Not logged in")
      return
    }
    const result = await sendFriendRequest(
      socket.username,
      toUsername,
      io,
      onlineUsers,
      emitToUser,
      pushFriendsUpdate
    )
    if (result.error) {
      socket.emit("friendError", result.error)
    } else {
      socket.emit("friendSuccess", result.message)
    }
  })

  socket.on("acceptFriendRequest", async ({ fromUsername }) => {
    if (!socket.username) return
    const from = fromUsername.toLowerCase().trim()
    const row = await Friendship.findOne({
      from,
      to: socket.username,
      status: "pending"
    })
    if (!row) {
      socket.emit("friendError", "No pending request")
      return
    }
    row.status = "accepted"
    await row.save()
    await syncFriendsToUser(socket.username)
    await syncFriendsToUser(from)
    emitToUser(from, "friendSuccess", `${socket.username} accepted your friend request`)
    socket.emit("friendSuccess", "Friend added")
    await pushFriendsUpdate(socket.username)
    await pushFriendsUpdate(from)
  })

  socket.on("declineFriendRequest", async ({ fromUsername }) => {
    if (!socket.username) return
    const from = fromUsername.toLowerCase().trim()
    await Friendship.deleteOne({ from, to: socket.username, status: "pending" })
    socket.emit("friendSuccess", "Request declined")
    await pushFriendsUpdate(socket.username)
    await pushFriendsUpdate(from)
  })

  socket.on("removeFriend", async ({ friendUsername }) => {
    if (!socket.username) return
    const friend = friendUsername.toLowerCase().trim()
    await Friendship.deleteOne({
      status: "accepted",
      $or: [
        { from: socket.username, to: friend },
        { from: friend, to: socket.username }
      ]
    })
    await syncFriendsToUser(socket.username)
    await syncFriendsToUser(friend)
    socket.emit("friendSuccess", "Friend removed")
    await pushFriendsUpdate(socket.username)
    await pushFriendsUpdate(friend)
  })

  socket.on("cancelFriendRequest", async ({ toUsername }) => {
    if (!socket.username) return
    const to = toUsername.toLowerCase().trim()
    await Friendship.deleteOne({
      from: socket.username,
      to,
      status: "pending"
    })
    socket.emit("friendSuccess", "Request cancelled")
    await pushFriendsUpdate(socket.username)
    await pushFriendsUpdate(to)
  })

  socket.on("createGroup", async ({ groupId, groupName, type, owner }) => {
    const displayName = (groupName || groupId || "").trim()
    if (!displayName) {
      socket.emit("errorMessage", "Missing server name")
      return
    }

    const { serverId, chatId, name } = await allocateServerIds(displayName, groups)

    const newGroup = {
      name,
      chatId,
      type: type || "open",
      owner,
      iconUrl: null,
      members: [],
      inviteCode: null,
      approvedUsers: [owner],
      bannedUsers: [],
      mutedForAll: [],
      pendingRequests: []
    }

    if (type === "private" || type === "locked") {
      newGroup.inviteCode = generateCode()
    }

    groups[serverId] = newGroup

    try {
      await new ServerModel({
        id: serverId,
        chatId,
        name,
        type: type || "open",
        owner,
        iconUrl: null,
        inviteCode: newGroup.inviteCode,
        approvedUsers: [owner],
        bannedUsers: [],
        mutedForAll: []
      }).save()
    } catch (err) {
      console.log("Error saving server:", err)
    }

    leaveServerMembership(socket, serverId)
    leaveChatRoom(socket)
    socket.join(chatId)
    socket.username = owner
    socket.serverId = serverId
    socket.chatId = chatId

    newGroup.members.push({ id: socket.id, username: owner })

    const history = await findChatMessages(chatId)
    socket.emit("chatHistory", { chatId, serverId, history })

    const alreadyJoined = await Message.findOne({
      $or: [{ chatId }, { groupId: chatId }],
      username: "",
      message: `${owner} joined`
    })

    if (!alreadyJoined) {
      await saveChatMessage({
        chatId,
        serverId,
        username: "",
        message: `${owner} joined`
      })
      io.to(chatId).emit("newMessage", {
        chatId,
        serverId,
        username: "",
        message: `${owner} joined`
      })
    }

    if (serverId !== displayName.toLowerCase().replace(/\s+/g, "-")) {
      socket.emit("friendSuccess", `Server created as "${name}" (id: ${serverId})`)
    }

    socket.emit("groupCreated", { id: serverId, chatId, ...newGroup })
    io.emit("serversList", getServerList())
  })

  socket.on("getServers", () => {
    socket.emit("serversList", getServerList())
  })

  socket.on("resumeSession", async ({ username, token }) => {
    try {
      const fixedUsername = (username || "").toLowerCase().trim()
      const user = await validateSessionToken(fixedUsername, token)
      if (!user) {
        socket.emit("sessionExpired")
        return
      }

      setUserOnline(socket, fixedUsername)
      const payload = await buildUserLoginPayload(fixedUsername, onlineUsers)
      socket.emit("sessionRestored", {
        ...payload,
        username: fixedUsername,
        token
      })
    } catch (err) {
      console.log(err)
      socket.emit("sessionExpired")
    }
  })

  socket.on("saveSession", async (data) => {
    if (!socket.username) return
    await saveUserSession(socket.username, data)
  })

  socket.on("savePersonalMutes", async ({ serverId, personalMutes }) => {
    if (!socket.username || !serverId) return
    await savePersonalMutes(socket.username, serverId, personalMutes || {})
  })

  socket.on("getProfile", async ({ username: who }) => {
    const target = (who || "").toLowerCase().trim()
    if (!target) return
    const user = await User.findOne({ username: target }).lean()
    if (!user) {
      socket.emit("profileError", "User not found")
      return
    }
    socket.emit("profileData", toPublicProfile(user))
  })

  socket.on("updateProfile", async ({ displayName, bio }) => {
    if (!socket.username) return
    const dn = validateDisplayName(displayName)
    if (dn.error) {
      socket.emit("profileError", dn.error)
      return
    }
    const b = validateBio(bio)
    if (b.error) {
      socket.emit("profileError", b.error)
      return
    }
    await User.updateOne(
      { username: socket.username },
      { $set: { displayName: dn.value, bio: b.value } }
    )
    const user = await User.findOne({ username: socket.username }).lean()
    const profile = toPublicProfile(user)
    io.emit("profileUpdate", profile)
    socket.emit("profileSaved", profile)
  })

  socket.on("checkJoinStatus", async ({ serverId, username }) => {
    const fixedId = (serverId || "").toLowerCase()
    const group = groups[fixedId]

    if (!group) {
      socket.emit("joinStatus", { status: "notFound", serverId: fixedId })
      return
    }

    const userDoc = await User.findOne({ username }).lean()
    const bannedOnUser = userDoc?.bannedFrom?.includes(fixedId)
    if (group.bannedUsers.includes(username) || bannedOnUser) {
      socket.emit("joinStatus", { status: "banned", serverId: fixedId })
      return
    }

    if (group.members.some(m => m.username === username)) {
      socket.emit("joinStatus", { status: "member", serverId: fixedId })
      return
    }

    if (username === group.owner || group.approvedUsers.includes(username)) {
      socket.emit("joinStatus", { status: "approved", serverId: fixedId })
      return
    }

    if (group.type === "open") {
      socket.emit("joinStatus", { status: "approved", serverId: fixedId })
      return
    }

    if (group.pendingRequests.some(r => r.username === username)) {
      socket.emit("joinStatus", { status: "pending", serverId: fixedId })
      return
    }

    const cooldownKey = `${fixedId}:${username}`
    const declinedAt = declinedUsers[cooldownKey]
    if (declinedAt) {
      const remaining = 24 * 60 * 60 * 1000 - (Date.now() - declinedAt)
      if (remaining > 0) {
        socket.emit("joinStatus", { status: "cooldown", serverId: fixedId, remaining })
        return
      }
      delete declinedUsers[cooldownKey]
    }

    socket.emit("joinStatus", {
      status: "needsInvite",
      serverId: fixedId,
      serverType: group.type
    })
  })

  socket.on("joinGroup", async ({ groupId, username, code }) => {
    const fixedId = groupId.toLowerCase()
    const group = groups[fixedId]

    if (!group) {
      socket.emit("errorMessage", "Server not found")
      return
    }

    const userDoc = await User.findOne({ username }).lean()
    const bannedOnUser = userDoc?.bannedFrom?.includes(fixedId)
    if (group.bannedUsers.includes(username) || bannedOnUser) {
      socket.emit("errorMessage", "You are banned from this server")
      return
    }

    const isOwner = username === group.owner
    const isApproved = group.approvedUsers.includes(username)

    const alreadyIn = group.members.find(m => m.username === username)
    if (alreadyIn) {
      await completeServerJoin(socket, fixedId, username)
      return
    }

    if (!isOwner && !isApproved) {
      if (group.type === "private") {
        if (code !== group.inviteCode) {
          socket.emit("errorMessage", "Wrong invite code")
          return
        }
        group.approvedUsers.push(username)
        await ServerModel.updateOne(
          { id: fixedId },
          { $addToSet: { approvedUsers: username } }
        )
      }

      if (group.type === "locked") {
        if (code !== group.inviteCode) {
          socket.emit("errorMessage", "Wrong invite code")
          return
        }

        const cooldownKey = `${fixedId}:${username}`
        const declinedAt = declinedUsers[cooldownKey]
        if (declinedAt) {
          const elapsed = Date.now() - declinedAt
          const remaining = 24 * 60 * 60 * 1000 - elapsed
          if (remaining > 0) {
            socket.emit("declineCooldown", { remaining })
            return
          }
          delete declinedUsers[cooldownKey]
        }

        if (isApproved) {
          group.pendingRequests = group.pendingRequests.filter(
            r => r.username !== username
          )
          await completeServerJoin(socket, fixedId, username)
          return
        }

        const alreadyPending = group.pendingRequests.find(
          r => r.username === username
        )
        if (alreadyPending) {
          socket.emit("pendingRequest")
          return
        }

        group.pendingRequests.push({ username, socketId: socket.id })

        const ownerSocket = [...io.sockets.sockets.values()].find(
          s => s.username === group.owner
        )
        if (ownerSocket) {
          ownerSocket.emit("lockedRequest", {
            server: group.name,
            serverId: fixedId,
            username
          })
        }

        socket.emit("pendingRequest")
        return
      }
    }

    await completeServerJoin(socket, fixedId, username)
  })

  socket.on("leaveServer", async ({ serverId }) => {
    if (!socket.username) return
    if (!serverId) return

    const fixedId = (serverId || "").toLowerCase()
    const group = groups[fixedId]
    if (!group) return

    if (group.owner === socket.username) return // owner has no leave option

    // Remove membership from in-memory state for this server
    group.members = (group.members || []).filter(m => m.username !== socket.username)

    // For private/locked servers, users may be in approvedUsers. Remove them so reload won't re-add.
    group.approvedUsers = (group.approvedUsers || []).filter(u => u !== socket.username)
    group.pendingRequests = (group.pendingRequests || []).filter(r => r.username !== socket.username)
    await ServerModel.updateOne(
      { id: fixedId },
      { $pull: { approvedUsers: socket.username } }
    )

    // Kick all of this user's active sockets from this server.
    const socketsToKick = [...io.sockets.sockets.values()].filter(
      s => s.username === socket.username && s.serverId === fixedId
    )
    for (const s of socketsToKick) {
      leaveChatRoom(s)
      s.serverId = null
      s.chatId = null
      s.emit("leftServer", { serverId: fixedId, serverName: group.name })
    }

    io.emit("serversList", getServerList())
  })

  socket.on("acceptRequest", async ({ serverId, username }) => {
    const group = groups[serverId]
    if (!group) return

    group.approvedUsers.push(username)
    await ServerModel.updateOne(
      { id: serverId },
      { $addToSet: { approvedUsers: username } }
    )

    group.pendingRequests = group.pendingRequests.filter(
      r => r.username !== username
    )

    const userSocket = [...io.sockets.sockets.values()].find(
      s => s.username === username
    )
    if (userSocket) {
      await completeServerJoin(userSocket, serverId, username)
      userSocket.emit("requestAccepted", { serverId, serverName: group.name })
    }
  })

  socket.on("getAccess", async ({ username }) => {
    const approved = await ServerModel.find({
      approvedUsers: username
    }).lean()

    socket.emit("accessList", approved.map(s => s.id))
  })

  socket.on("declineRequest", ({ serverId, username }) => {
    const group = groups[serverId]
    if (!group) return

    group.pendingRequests = group.pendingRequests.filter(
      r => r.username !== username
    )

    const cooldownKey = `${serverId}:${username}`
    declinedUsers[cooldownKey] = Date.now()

    const userSocket = [...io.sockets.sockets.values()].find(
      s => s.username === username
    )
    if (userSocket) {
      userSocket.emit("requestDeclined", {
        serverId,
        remaining: 24 * 60 * 60 * 1000
      })
    }
  })

  socket.on("kickMember", async ({ serverId, targetUsername }) => {
    if (!socket.username) return
    const result = await kickMember(
      io,
      groups,
      serverId,
      targetUsername.toLowerCase().trim(),
      socket.username
    )
    if (result.error) socket.emit("modError", result.error)
    else socket.emit("modSuccess", `Kicked ${targetUsername}`)
  })

  socket.on("banMember", async ({ serverId, targetUsername }) => {
    if (!socket.username) return
    const result = await banMember(
      io,
      groups,
      serverId,
      targetUsername.toLowerCase().trim(),
      socket.username
    )
    if (result.error) socket.emit("modError", result.error)
    else socket.emit("modSuccess", `Banned ${targetUsername}`)
  })

  socket.on("muteForAll", async ({ serverId, targetUsername, muted }) => {
    if (!socket.username) return
    const result = await setMuteForAll(
      io,
      groups,
      serverId,
      targetUsername.toLowerCase().trim(),
      socket.username,
      muted
    )
    if (result.error) socket.emit("modError", result.error)
    else {
      socket.emit("modSuccess", muted ? "Muted for everyone" : "Unmuted for everyone")
    }
  })

  socket.on("sendMessage", async ({ chatId, serverId, username, message, attachments }) => {
    if (!chatId || !socket.username || socket.username !== username) return
    const saved = await saveChatMessage({
      chatId,
      serverId: serverId || null,
      username,
      message,
      attachments
    })
    if (!saved) return
    io.to(chatId).emit("newMessage", {
      messageId: saved._id.toString(),
      chatId,
      serverId: serverId || null,
      username,
      message: saved.message,
      attachments: saved.attachments || []
    })
  })

  socket.on("logout", async () => {
    if (socket.username) {
      await User.updateOne(
        { username: socket.username },
        { $set: { sessionToken: null } }
      )
    }
    socket.username = null
  })

  socket.on("editMessage", async ({ messageId, newText }) => {
    if (!socket.username || !messageId || !newText?.trim()) return
    const result = await updateChatMessage(
      messageId,
      socket.username,
      newText
    )
    if (result.error) {
      socket.emit("messageError", result.error)
      return
    }
    const chatId = result.doc.chatId || result.doc.groupId
    io.to(chatId).emit("messageUpdated", {
      messageId,
      chatId,
      message: result.doc.message
    })
  })

  socket.on("deleteMessage", async ({ messageId }) => {
    if (!socket.username || !messageId) return
    const result = await deleteChatMessage(messageId, socket.username)
    if (result.error) {
      socket.emit("messageError", result.error)
      return
    }
    io.to(result.chatId).emit("messageDeleted", { messageId, chatId: result.chatId })
  })

  socket.on("openDm", async ({ friendUsername }) => {
    if (!socket.username) return
    const friend = friendUsername.toLowerCase().trim()
    if (!(await areFriends(socket.username, friend))) {
      socket.emit("friendError", "You can only message friends")
      return
    }
    const chatId = dmChatId(socket.username, friend)
    leaveChatRoom(socket)
    socket.join(chatId)
    socket.chatId = chatId
    socket.serverId = null
    const history = await findChatMessages(chatId)
    socket.emit("chatHistory", { chatId, serverId: null, friendUsername: friend, history })
  })

  socket.on("sendDm", async ({ toUsername, message, attachments }) => {
    if (!socket.username) return
    const to = toUsername.toLowerCase().trim()
    if (!(await areFriends(socket.username, to))) {
      socket.emit("friendError", "You can only message friends")
      return
    }
    const chatId = dmChatId(socket.username, to)
    const saved = await saveChatMessage({
      chatId,
      serverId: null,
      username: socket.username,
      message,
      attachments
    })
    if (!saved) return
    io.to(chatId).emit("newMessage", {
      messageId: saved._id.toString(),
      chatId,
      serverId: null,
      username: socket.username,
      message: saved.message,
      attachments: saved.attachments || [],
      with: to
    })
  })

  socket.on("disconnect", async () => {
    const serverId = socket.serverId
    const who = socket.username

    if (serverId && groups[serverId]) {
      groups[serverId].members = groups[serverId].members.filter(
        m => m.id !== socket.id
      )
      io.emit("serversList", getServerList())
    }

    leaveChatRoom(socket)

    if (who) {
      const stillOnline = [...io.sockets.sockets.values()].some(
        s => s.id !== socket.id && s.username === who
      )
      if (!stillOnline) {
        onlineUsers.delete(who)
        notifyFriendsPresence(who, false)
      }
    }

    console.log("User disconnected:", socket.id)
  })
})

app.get("/", (req, res) => res.send("WebChat running"))

server.listen(3000, () => console.log("Server running on port 3000"))
