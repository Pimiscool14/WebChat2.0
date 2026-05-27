import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import FriendsSidebar from "./FriendsSidebar.jsx"
import ServerRail from "./ServerRail.jsx"
import ServerDiscoverSidebar from "./ServerDiscoverSidebar.jsx"
import InviteModal from "./InviteModal.jsx"
import PendingModal from "./PendingModal.jsx"
import UserBar from "./UserBar.jsx"
import ChatComposer from "./ChatComposer.jsx"
import MessageList from "./MessageList.jsx"
import UserContextMenu from "./UserContextMenu.jsx"
import MessageContextMenu from "./MessageContextMenu.jsx"
import ImageLightbox from "./ImageLightbox.jsx"
import ProfileEditorModal from "./ProfileEditorModal.jsx"
import ViewProfileModal from "./ViewProfileModal.jsx"
import ServerContextMenu from "./ServerContextMenu.jsx"
import EditServerModal from "./EditServerModal.jsx"
import DeleteServerModal from "./DeleteServerModal.jsx"
import { uploadChatFile } from "./api.js"
import { displayLabel } from "./profileUtils.js"
import "./App.css"

function historyToMessages(history) {
  return (history || []).map((m) => {
    const id = m._id?.toString() || `legacy-${Math.random().toString(36).slice(2)}`
    if (!m.username) {
      return { id, kind: "system", text: m.message }
    }
    return {
      id,
      kind: "chat",
      username: m.username,
      message: m.message || "",
      attachments: m.attachments || []
    }
  })
}

function newMessageToItem(data) {
  const id = data.messageId || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
  if (!data.username) {
    return { id, kind: "system", text: data.message }
  }
  return {
    id,
    kind: "chat",
    username: data.username,
    message: data.message || "",
    attachments: data.attachments || []
  }
}

const socket = io()

function readSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistSession(username, token) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ username: username.toLowerCase().trim(), token })
  )
}

export default function App() {
  const [page, setPage] = useState("login")

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")

  const [servers, setServers] = useState([])
  const [search, setSearch] = useState("")
  const [serverNameInput, setServerNameInput] = useState("")
  const [activeServerId, setActiveServerId] = useState(null)
  const [activeChatId, setActiveChatId] = useState(null)
  const [serverType, setServerType] = useState("")

  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [inviteCode, setInviteCode] = useState(null)

  const [showInvitePopup, setShowInvitePopup] = useState(false)
  const [pendingServer, setPendingServer] = useState(null)
  const [inviteInput, setInviteInput] = useState("")

  const [accessList, setAccessList] = useState([])

  const [friends, setFriends] = useState([])
  const [pendingIncoming, setPendingIncoming] = useState([])
  const [pendingOutgoing, setPendingOutgoing] = useState([])
  const [friendSearch, setFriendSearch] = useState("")
  const [addFriendName, setAddFriendName] = useState("")
  const [friendsTab, setFriendsTab] = useState("online")
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [activeDm, setActiveDm] = useState(null)

  const [pendingRequest, setPendingRequest] = useState(false)
  const [pendingDots, setPendingDots] = useState(".")
  const [showPendingPopup, setShowPendingPopup] = useState(false)

  const [cooldowns, setCooldowns] = useState({})
  const [pendingServers, setPendingServers] = useState({})

  const [lockedNotifications, setLockedNotifications] = useState([])

  const [contextMenu, setContextMenu] = useState(null)
  const [messageContextMenu, setMessageContextMenu] = useState(null)
  const [serverContextMenu, setServerContextMenu] = useState(null)
  const [editingServer, setEditingServer] = useState(null)
  const [deletingServer, setDeletingServer] = useState(null)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState("")
  const [personalMutes, setPersonalMutes] = useState({})
  const [muteAllActive, setMuteAllActive] = useState(false)
  const [serverMutedForAll, setServerMutedForAll] = useState([])
  const [bannedFrom, setBannedFrom] = useState([])
  const [mutedIn, setMutedIn] = useState(null)
  const [restoring, setRestoring] = useState(true)
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [viewProfileUser, setViewProfileUser] = useState(null)
  const [viewProfileLoading, setViewProfileLoading] = useState(false)
  const profilesRef = useRef({})
  const viewProfileUserRef = useRef(null)

  const [notification, setNotification] = useState(null)
  const [fade, setFade] = useState(false)

  const [, setTick] = useState(0)
  const messagesEndRef = useRef(null)
  const activeChatIdRef = useRef(null)
  const activeServerIdRef = useRef(null)
  const pendingServerRef = useRef(null)
  const applyLoginPayloadRef = useRef(null)

  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

  useEffect(() => {
    viewProfileUserRef.current = viewProfileUser
  }, [viewProfileUser])

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    const names = new Set()
    for (const m of messages) {
      if (m.kind === "chat" && m.username) names.add(m.username)
    }
    for (const u of names) {
      if (!profilesRef.current[u]) {
        socket.emit("getProfile", { username: u })
      }
    }
  }, [messages])

  useEffect(() => {
    activeServerIdRef.current = activeServerId
  }, [activeServerId])

  useEffect(() => {
    pendingServerRef.current = pendingServer
  }, [pendingServer])

  useEffect(() => {
    if (!activeServerId) {
      setPersonalMutes({})
      setMuteAllActive(false)
      setServerMutedForAll([])
      setMutedIn(null)
      return
    }
    try {
      const raw = localStorage.getItem(`webchat-mutes-${activeServerId}`)
      setPersonalMutes(raw ? JSON.parse(raw) : {})
    } catch {
      setPersonalMutes({})
    }
  }, [activeServerId])

  useEffect(() => {
    if (restoring || !username || page === "login" || page === "register") return
    const timer = setTimeout(() => {
      socket.emit("saveSession", {
        lastPage: page,
        activeServerId,
        activeChatId,
        activeDm,
        personalMutes,
        muteAllActive
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [
    restoring,
    username,
    page,
    activeServerId,
    activeChatId,
    activeDm,
    personalMutes,
    muteAllActive
  ])

  useEffect(() => {
    const onSessionRestored = (payload) => {
      if (payload.username && payload.token) {
        persistSession(payload.username, payload.token)
      }
      applyLoginPayloadRef.current?.(payload, payload.username)
      setRestoring(false)
    }
    const onSessionExpired = () => {
      localStorage.removeItem(SESSION_KEY)
      setRestoring(false)
      setPage("login")
    }
    socket.on("sessionRestored", onSessionRestored)
    socket.on("sessionExpired", onSessionExpired)
    return () => {
      socket.off("sessionRestored", onSessionRestored)
      socket.off("sessionExpired", onSessionExpired)
    }
  }, [])

  useEffect(() => {
    const saved = readSavedSession()
    if (!saved?.username || !saved?.token) {
      setRestoring(false)
      return
    }

    setUsername(saved.username)
    const resume = () =>
      socket.emit("resumeSession", {
        username: saved.username,
        token: saved.token
      })
    if (socket.connected) resume()
    else socket.once("connect", resume)

    const timeout = setTimeout(() => {
      setRestoring((r) => {
        if (r) localStorage.removeItem(SESSION_KEY)
        return false
      })
    }, 10000)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!contextMenu && !messageContextMenu && !serverContextMenu) return
    const close = (e) => {
      if (e.target.closest?.(".user-context-menu")) return
      if (e.target.closest?.(".server-context-menu")) return
      setContextMenu(null)
      setMessageContextMenu(null)
      setServerContextMenu(null)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [contextMenu, messageContextMenu, serverContextMenu])

  const mergeProfile = (profile) => {
    if (!profile?.username) return
    setProfiles((prev) => ({ ...prev, [profile.username]: profile }))
  }

  const showNotification = (text, type = "normal") => {
    setFade(false)
    setNotification({ text, type })
    setTimeout(() => setFade(true), 2000)
    setTimeout(() => {
      setNotification(null)
      setFade(false)
    }, 2750)
  }

  const leaveServer = (serverId) => {
    if (!serverId) return
    socket.emit("leaveServer", { serverId })
    setServerContextMenu(null)
    setEditingServer(null)
    setDeletingServer(null)
  }

  const copyInviteToClipboard = async () => {
    const code = inviteCode || ""
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      showNotification("Invite code copied", "success")
    } catch {
      // Fallback for environments without clipboard permissions.
      const el = document.createElement("textarea")
      el.value = code
      el.style.position = "fixed"
      el.style.left = "-9999px"
      document.body.appendChild(el)
      el.focus()
      el.select()
      try {
        document.execCommand("copy")
        showNotification("Invite code copied", "success")
      } catch {
        showNotification("Could not copy invite code", "error")
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!pendingRequest) return
    const interval = setInterval(() => {
      setPendingDots(prev =>
        prev === "." ? ".." : prev === ".." ? "..." : "."
      )
    }, 500)
    return () => clearInterval(interval)
  }, [pendingRequest])

  useEffect(() => {
    const needsTick = pendingRequest || Object.values(cooldowns).some(t => t > Date.now())
    if (!needsTick) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [pendingRequest, cooldowns])

  useEffect(() => {
    socket.off("loginSuccess")
    socket.on("loginSuccess", (payload) => {
      showNotification("Login successful", "success")
      if (payload.username && payload.token) {
        persistSession(payload.username, payload.token)
        setUsername(payload.username)
      }
      applyLoginPayloadRef.current?.(payload, payload.username)
    })

    socket.off("friendsList")
    socket.on("friendsList", (data) => applyFriendsList(data))

    socket.off("profileData")
    socket.on("profileData", (profile) => {
      mergeProfile(profile)
      if (viewProfileUserRef.current === profile.username) {
        setViewProfileLoading(false)
      }
    })

    socket.off("profileUpdate")
    socket.on("profileUpdate", (profile) => mergeProfile(profile))

    socket.off("profileSaved")
    socket.on("profileSaved", (profile) => {
      mergeProfile(profile)
      setShowProfileEditor(false)
      showNotification("Profile saved", "success")
    })

    socket.off("profileError")
    socket.on("profileError", (msg) => showNotification(msg, "error"))

    socket.off("friendRequestReceived")
    socket.on("friendRequestReceived", ({ username: from }) => {
      showNotification(`${from} sent you a friend request`, "normal")
      socket.emit("getFriends")
    })

    socket.off("friendSuccess")
    socket.on("friendSuccess", (msg) => showNotification(msg, "success"))

    socket.off("friendError")
    socket.on("friendError", (msg) => showNotification(msg, "error"))

    socket.off("registerSuccess")
    socket.on("registerSuccess", () => {
      showNotification("Account created", "success")
      setPage("login")
    })

    socket.off("authError")
    socket.on("authError", (msg) => showNotification(msg, "error"))

    socket.off("newMessage")
    socket.on("newMessage", (data) => {
      if (data.chatId && data.chatId !== activeChatIdRef.current) return
      setMessages(prev => [...prev, newMessageToItem(data)])
    })

    socket.off("messageUpdated")
    socket.on("messageUpdated", ({ messageId, message }) => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId && m.kind === "chat" ? { ...m, message } : m))
      )
      setEditingMessageId(null)
      setEditingText("")
    })

    socket.off("messageDeleted")
    socket.on("messageDeleted", ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    })

    socket.off("messageError")
    socket.on("messageError", (msg) => showNotification(msg, "error"))

    socket.off("chatHistory")
    socket.on("chatHistory", ({ chatId, serverId, history, friendUsername }) => {
      setActiveChatId(chatId)
      activeChatIdRef.current = chatId
      setActiveServerId(serverId || null)
      if (friendUsername) {
        setActiveDm(friendUsername)
        setSelectedFriend(friendUsername)
      }
      setMessages(historyToMessages(history))
      setEditingMessageId(null)
      setEditingText("")
    })

    socket.off("serversList")
    socket.on("serversList", (data) => setServers(data))

    socket.off("serverDeleted")
    socket.on("serverDeleted", ({ serverId }) => {
      setServers(prev => prev.filter(s => s.id !== serverId))
      setAccessList(prev => prev.filter(id => id !== serverId))
      setBannedFrom(prev => prev.filter(id => id !== serverId))
      if (activeServerIdRef.current === serverId) {
        setActiveServerId(null)
        setActiveChatId(null)
        setPage("servers")
        setInviteCode(null)
        showNotification("Server was deleted", "error")
        socket.emit("getServers")
      }
    })

    socket.off("leftServer")
    socket.on("leftServer", ({ serverId, serverName }) => {
      setAccessList(prev => prev.filter(id => id !== serverId))
      setBannedFrom(prev => prev.filter(id => id !== serverId))

      if (activeServerIdRef.current === serverId) {
        setActiveServerId(null)
        setActiveChatId(null)
        setPage("servers")
        setMessages([])
        setInviteCode(null)
        showNotification(`Left ${serverName || "server"}`, "normal")
        socket.emit("getServers")
      } else {
        showNotification(`Left ${serverName || "server"}`, "normal")
      }

      setServerContextMenu(null)
      setEditingServer(null)
      setDeletingServer(null)
    })

    socket.off("groupCreated")
    socket.on("groupCreated", (group) => {
      setInviteCode(group.inviteCode || null)
      setActiveServerId(group.id)
      setActiveChatId(group.chatId)
      setServerMutedForAll(group.mutedForAll || [])
      setAccessList(prev => [...prev, group.id])
      setPage("chat")
      showNotification("Server created", "success")
    })

    socket.off("joinSuccess")
    socket.on("joinSuccess", (group) => {
      setInviteCode(group.inviteCode || null)
      setActiveServerId(group.id)
      setActiveChatId(group.chatId)
      setServerMutedForAll(group.mutedForAll || [])
      const u = username.toLowerCase().trim()
      setMutedIn(group.mutedForAll?.includes(u) ? "forAll" : null)
      setAccessList(prev =>
        prev.includes(group.id) ? prev : [...prev, group.id]
      )
      setShowInvitePopup(false)
      setShowPendingPopup(false)
      setInviteInput("")
      setPage("chat")
    })

    socket.off("serverModUpdate")
    socket.on("serverModUpdate", ({ serverId, mutedForAll }) => {
      if (serverId === activeServerIdRef.current) {
        setServerMutedForAll(mutedForAll || [])
        const u = username.toLowerCase().trim()
        if (mutedForAll?.includes(u)) setMutedIn("forAll")
        else setMutedIn(null)
      }
    })

    socket.off("kicked")
    socket.on("kicked", ({ serverName }) => {
      setActiveServerId(null)
      setActiveChatId(null)
      setPage("servers")
      showNotification(`You were kicked from ${serverName}`, "error")
    })

    socket.off("banned")
    socket.on("banned", ({ serverId, serverName }) => {
      if (serverId) {
        setBannedFrom(prev => prev.includes(serverId) ? prev : [...prev, serverId])
      }
      setActiveServerId(null)
      setActiveChatId(null)
      setPage("servers")
      showNotification(`You were banned from ${serverName}`, "error")
    })

    socket.off("modError")
    socket.on("modError", (msg) => showNotification(msg, "error"))

    socket.off("modSuccess")
    socket.on("modSuccess", (msg) => showNotification(msg, "success"))

    socket.off("errorMessage")
    socket.on("errorMessage", (msg) => {
      showNotification(msg, "error")
      setInviteInput("")
      setPendingRequest(false)
    })

    socket.off("pendingRequest")
    socket.on("pendingRequest", () => {
      const ps = pendingServerRef.current
      if (ps) {
        setPendingServers(prev => ({ ...prev, [ps.id]: true }))
      }
      setPendingRequest(true)
      setShowInvitePopup(true)
      setShowPendingPopup(true)
    })

    socket.off("lockedRequest")
    socket.on("lockedRequest", (data) => {
      setLockedNotifications(prev => [...prev, data])
    })

    socket.off("requestAccepted")
    socket.on("requestAccepted", ({ serverId }) => {
      setPendingServers(prev => {
        const next = { ...prev }
        delete next[serverId]
        return next
      })
      setAccessList(prev =>
        prev.includes(serverId) ? prev : [...prev, serverId]
      )
      setPendingRequest(false)
      setShowPendingPopup(false)
      setShowInvitePopup(false)
      showNotification("Request accepted — joining server", "success")
    })

    socket.off("requestDeclined")
    socket.on("requestDeclined", ({ serverId, remaining }) => {
      setPendingServers(prev => {
        const next = { ...prev }
        delete next[serverId]
        return next
      })
      setCooldowns(prev => ({
        ...prev,
        [serverId]: Date.now() + remaining
      }))
      setShowPendingPopup(false)
      setShowInvitePopup(false)
      setPendingRequest(false)
      showNotification("Your request was declined", "error")
    })

    socket.off("declineCooldown")
    socket.on("declineCooldown", ({ remaining }) => {
      const ps = pendingServerRef.current
      if (ps) {
        setCooldowns(prev => ({
          ...prev,
          [ps.id]: Date.now() + remaining
        }))
      }
    })

    socket.off("joinStatus")
    socket.on("joinStatus", ({ status, serverId, remaining }) => {
      const clearPending = () => {
        setPendingServers(prev => {
          const next = { ...prev }
          delete next[serverId]
          return next
        })
        setPendingRequest(false)
        setShowPendingPopup(false)
      }

      if (status === "member" || status === "approved") {
        clearPending()
        setShowInvitePopup(false)
        setAccessList(prev =>
          prev.includes(serverId) ? prev : [...prev, serverId]
        )
        socket.emit("joinGroup", { groupId: serverId, username, code: "" })
        return
      }

      if (status === "pending") {
        setPendingServers(prev => ({ ...prev, [serverId]: true }))
        setPendingRequest(true)
        setShowInvitePopup(true)
        setShowPendingPopup(true)
        return
      }

      if (status === "cooldown") {
        clearPending()
        setCooldowns(prev => ({
          ...prev,
          [serverId]: Date.now() + remaining
        }))
        setShowInvitePopup(true)
        return
      }

      if (status === "needsInvite") {
        clearPending()
        setPendingDots(".")
        setInviteInput("")
        setShowInvitePopup(true)
        return
      }

      if (status === "banned") {
        showNotification("You are banned from this server", "error")
        return
      }

      if (status === "notFound") {
        showNotification("Server not found", "error")
      }
    })
  }, [username])

  useEffect(() => {
    const onConnect = () => socket.emit("getServers")
    socket.on("connect", onConnect)
    if (socket.connected) onConnect()
    return () => socket.off("connect", onConnect)
  }, [])

  function applyFriendsList(data) {
    const nextFriends = data.friends || []
    const nextIncoming = data.pendingIncoming || []
    const nextOutgoing = data.pendingOutgoing || []
    setFriends(nextFriends)
    setPendingIncoming(nextIncoming)
    setPendingOutgoing(nextOutgoing)

    const usernames = new Set()
    for (const f of nextFriends) usernames.add(f.username)
    for (const p of nextIncoming) usernames.add(p.username)
    for (const p of nextOutgoing) usernames.add(p.username)
    for (const u of usernames) {
      socket.emit("getProfile", { username: u })
    }
  }

  function applyLoginPayload(payload, loginUsername) {
    const u = loginUsername || username
    setAccessList(payload.accessList || [])
    if (payload.friends) applyFriendsList(payload.friends)
    setBannedFrom(payload.bannedFrom || [])
    if (payload.myProfile) mergeProfile(payload.myProfile)

    // Keep server shortcuts populated on every page (friends/chat/servers).
    socket.emit("getServers")

    const session = payload.session
    if (session) {
      if (session.activeServerId) {
        try {
          localStorage.setItem(
            `webchat-mutes-${session.activeServerId}`,
            JSON.stringify(session.personalMutes || {})
          )
        } catch { /* ignore */ }
      }
      setPersonalMutes(session.personalMutes || {})
      setMuteAllActive(!!session.muteAllActive)
      setMutedIn(session.mutedIn || null)

      const targetPage = session.lastPage || "servers"
      const bannedOnServer =
        session.activeServerId && payload.bannedFrom?.includes(session.activeServerId)

      if (bannedOnServer) {
        setPage("servers")
        setActiveServerId(null)
        setActiveChatId(null)
        showNotification("You are banned from that server", "error")
        socket.emit("getServers")
        return
      }

      if (session.activeServerId && targetPage === "chat") {
        setPage("chat")
        setActiveServerId(session.activeServerId)
        socket.emit("joinGroup", { groupId: session.activeServerId, username: u, code: "" })
        return
      }

      if (session.activeDm && targetPage === "friends") {
        setPage("friends")
        setActiveDm(session.activeDm)
        setSelectedFriend(session.activeDm)
        socket.emit("getFriends")
        socket.emit("openDm", { friendUsername: session.activeDm })
        return
      }

      setPage(targetPage)
      if (targetPage === "servers") socket.emit("getServers")
      if (targetPage === "friends") socket.emit("getFriends")
      return
    }

    setPage("servers")
    socket.emit("getServers")
  }

  applyLoginPayloadRef.current = applyLoginPayload

  const sendFriendRequest = () => {
    const name = addFriendName.toLowerCase().trim()
    if (!name) return
    socket.emit("sendFriendRequest", { toUsername: name })
    setAddFriendName("")
  }

  const formatCooldown = (endsAt) => {
    const remaining = Math.max(0, endsAt - Date.now())
    const h = Math.floor(remaining / 3600000)
    const m = Math.floor((remaining % 3600000) / 60000)
    const s = Math.floor((remaining % 60000) / 1000)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const login = () => {
    const u = username.toLowerCase().trim()
    socket.emit("login", { username: u, password })
  }

  const register = () => socket.emit("register", {
    username: username.toLowerCase().trim(),
    password,
    email
  })

  const browseServers = () => socket.emit("getServers")

  const createServer = () => {
    if (!serverNameInput.trim() || !serverType) {
      showNotification("Fill server name and type", "error")
      return
    }
    socket.emit("createGroup", {
      groupName: serverNameInput.trim(),
      type: serverType,
      owner: username
    })
  }

  const joinServer = (server) => {
    if (bannedFrom.includes(server.id)) {
      showNotification(`You are banned from ${server.name}`, "error")
      return
    }
    setPendingServer(server)

    if (server.type === "open" || server.owner === username) {
      socket.emit("joinGroup", { groupId: server.id, username, code: "" })
      return
    }

    socket.emit("checkJoinStatus", { serverId: server.id, username })
  }

  const sendChat = () => {
    const text = message.trim()
    const attachments = pendingAttachments.map((a) => ({
      type: a.type,
      url: a.url,
      filename: a.filename || ""
    }))
    if ((!text && !attachments.length) || !activeChatId) return

    if (activeServerId) {
      socket.emit("sendMessage", {
        chatId: activeChatId,
        serverId: activeServerId,
        username,
        message: text,
        attachments
      })
    } else if (activeDm) {
      socket.emit("sendDm", { toUsername: activeDm, message: text, attachments })
    }
    setMessage("")
    setPendingAttachments([])
  }

  const handleFilesSelected = async (fileList) => {
    const session = readSavedSession()
    if (!session?.token || !username) {
      showNotification("Log in to upload files", "error")
      return
    }
    setUploading(true)
    try {
      for (const file of fileList) {
        const uploaded = await uploadChatFile(file, username, session.token)
        setPendingAttachments((prev) => [...prev, uploaded])
      }
    } catch (err) {
      showNotification(err.message || "Upload failed", "error")
    } finally {
      setUploading(false)
    }
  }

  const logout = () => {
    socket.emit("logout")
    localStorage.removeItem(SESSION_KEY)
    setPage("login")
    setUsername("")
    setPassword("")
    setActiveServerId(null)
    setActiveChatId(null)
    setActiveDm(null)
    setMessages([])
    setFriends([])
    setPendingAttachments([])
    setLightboxSrc(null)
    showNotification("Logged out", "normal")
  }

  const composerProps = {
    placeholder: activeDm
      ? `Message @${activeDm}`
      : activeServerId
        ? "Message #general"
        : "Message",
    value: message,
    onChange: (e) => setMessage(e.target.value),
    onSend: sendChat,
    pendingAttachments,
    onRemoveAttachment: (i) =>
      setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i)),
    onFilesSelected: handleFilesSelected,
    uploading
  }

  const openFriendChat = (friend) => {
    setSelectedFriend(friend.username)
    setActiveDm(friend.username)
    setActiveServerId(null)
    setMessages([])
    setMessage("")
    socket.emit("openDm", { friendUsername: friend.username })
  }

  const joinServerById = (id) => {
    const server = servers.find(x => x.id === id)
    if (server) joinServer(server)
    else socket.emit("joinGroup", { groupId: id, username, code: "" })
  }

  const railProps = {
    page,
    accessList,
    servers,
    activeServerId,
    onHome: () => { setPage("servers"); browseServers() },
    onFriends: () => {
      setPage("friends")
      setSelectedFriend(null)
      setActiveDm(null)
      setActiveChatId(null)
      setActiveServerId(null)
      setMessages([])
      socket.emit("getServers")
      socket.emit("getFriends")
    },
    onJoinServer: joinServerById,
    onServerContextMenu: (e, server) => {
      setContextMenu(null)
      setMessageContextMenu(null)
      setServerContextMenu({
        x: e.clientX,
        y: e.clientY,
        server
      })
    }
  }

  const filteredServers = servers
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.members - a.members)

  const activeServer = servers.find(s => s.id === activeServerId)
  const isServerOwner = activeServer?.owner === username

  const shouldHideMessage = (author) => {
    if (!author) return false
    if (author === username) return false
    if (serverMutedForAll.includes(author)) return true
    if (personalMutes[author]) return true
    if (muteAllActive && isServerOwner) return true
    return false
  }

  const getMutedUsers = () => {
    const muted = new Set()
    for (const [user, on] of Object.entries(personalMutes)) {
      if (on) muted.add(user)
    }
    for (const user of serverMutedForAll) muted.add(user)
    if (muteAllActive && isServerOwner) {
      for (const m of messages) {
        if (m.kind === "chat" && m.username && m.username !== username) {
          muted.add(m.username)
        }
      }
    }
    return [...muted]
  }

  const mutedUsers = getMutedUsers()

  const openUserMenu = (e, targetUser) => {
    if (!targetUser || targetUser === username) return
    setContextMenu({ x: e.clientX, y: e.clientY, targetUser })
  }

  const togglePersonalMute = (targetUser) => {
    setPersonalMutes((prev) => {
      const next = { ...prev }
      if (next[targetUser]) delete next[targetUser]
      else next[targetUser] = true
      if (activeServerId) {
        localStorage.setItem(`webchat-mutes-${activeServerId}`, JSON.stringify(next))
        socket.emit("savePersonalMutes", { serverId: activeServerId, personalMutes: next })
      }
      return next
    })
    setContextMenu(null)
  }

  const handleMuteForAll = (targetUser) => {
    const muted = serverMutedForAll.includes(targetUser)
    setServerMutedForAll((prev) =>
      muted ? prev.filter((u) => u !== targetUser) : [...prev, targetUser]
    )
    socket.emit("muteForAll", {
      serverId: activeServerId,
      targetUsername: targetUser,
      muted: !muted
    })
    setContextMenu(null)
  }

  const openMessageMenu = (e, msg) => {
    if (msg.kind !== "chat" || msg.username !== username) return
    setMessageContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId: msg.id,
      text: msg.message
    })
    setContextMenu(null)
  }

  const startEditMessage = () => {
    if (!messageContextMenu) return
    setEditingMessageId(messageContextMenu.messageId)
    setEditingText(messageContextMenu.text)
    setMessageContextMenu(null)
  }

  const confirmEditMessage = () => {
    if (!editingMessageId || !editingText.trim()) return
    socket.emit("editMessage", {
      messageId: editingMessageId,
      newText: editingText.trim()
    })
  }

  const cancelEditMessage = () => {
    setEditingMessageId(null)
    setEditingText("")
  }

  const deleteMessage = () => {
    if (!messageContextMenu) return
    socket.emit("deleteMessage", { messageId: messageContextMenu.messageId })
    setMessages(prev => prev.filter(m => m.id !== messageContextMenu.messageId))
    setMessageContextMenu(null)
  }

  const openViewProfile = (targetUser) => {
    setContextMenu(null)
    setViewProfileUser(targetUser)
    setViewProfileLoading(true)
    socket.emit("getProfile", { username: targetUser })
  }

  const myProfile = profiles[username] || { username, displayName: "", bio: "", avatarUrl: null }
  const sessionForProfile = readSavedSession()

  const profileModals = (
    <>
      {showProfileEditor && (
        <ProfileEditorModal
          username={username}
          profile={myProfile}
          sessionToken={sessionForProfile?.token}
          onClose={() => setShowProfileEditor(false)}
          onSave={({ displayName, bio }) =>
            socket.emit("updateProfile", { displayName, bio })
          }
          onAvatarUploaded={mergeProfile}
          onError={(msg) => showNotification(msg, "error")}
        />
      )}
      {viewProfileUser && (
        <ViewProfileModal
          profile={profiles[viewProfileUser]}
          loading={viewProfileLoading}
          onBack={() => {
            setViewProfileUser(null)
            setViewProfileLoading(false)
          }}
        />
      )}
    </>
  )

  const messageListProps = {
    messages,
    endRef: messagesEndRef,
    currentUsername: username,
    profiles,
    mutedUsers: activeServerId ? mutedUsers : [],
    shouldHideMessage: activeServerId ? shouldHideMessage : undefined,
    onUserContextMenu: (activeServerId || activeDm) ? openUserMenu : undefined,
    onMessageContextMenu: openMessageMenu,
    editingMessageId,
    editingText,
    onEditingTextChange: setEditingText,
    onConfirmEdit: confirmEditMessage,
    onCancelEdit: cancelEditMessage,
    onImageClick: (src) => setLightboxSrc((cur) => (cur === src ? null : src))
  }

  const handleKick = (targetUser) => {
    socket.emit("kickMember", { serverId: activeServerId, targetUsername: targetUser })
    setContextMenu(null)
  }

  const handleBan = (targetUser) => {
    socket.emit("banMember", { serverId: activeServerId, targetUsername: targetUser })
    setContextMenu(null)
  }

  const handleAddFriendFromMenu = (targetUser) => {
    socket.emit("sendFriendRequest", { toUsername: targetUser })
    setContextMenu(null)
  }

  function submitInvite() {
    socket.emit("joinGroup", {
      groupId: pendingServer.id,
      username,
      code: inviteInput
    })
    if (pendingServer.type === "locked") {
      setPendingServers(prev => ({ ...prev, [pendingServer.id]: true }))
      setPendingRequest(true)
    }
  }

  const userBarProps = {
    username,
    profile: myProfile,
    serverName: activeServer?.name || (activeDm ? `@${activeDm}` : null),
    mutedIn,
    bannedCount: bannedFrom.length,
    onOpenProfile: () => setShowProfileEditor(true),
    onLogout: logout
  }

  const savedSession = readSavedSession()
  const sessionToken = savedSession?.token

  if (restoring) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>WebChat</h1>
          <p className="auth-loading">
            {savedSession?.username
              ? `Logging back in as ${savedSession.username}…`
              : "Restoring your session…"}
          </p>
        </div>
      </div>
    )
  }

  if (page === "login") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="subtitle">We&apos;re so excited to see you again!</p>
          <div className="field">
            <label>Username</label>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
          </div>
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={login}>
            Log in
          </button>
          <div className="auth-switch">
            Need an account?{" "}
            <span onClick={() => setPage("register")}>Register</span>
          </div>
          {savedSession?.username && (
            <p className="auth-loading" style={{ marginTop: 16 }}>
              Tip: after you log in once, refresh will log you back in automatically.
            </p>
          )}
        </div>
        {renderNotification(notification, fade)}
      </div>
    )
  }

  if (page === "register") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Create an account</h1>
          <p className="subtitle">Join your friends on WebChat</p>
          <div className="field">
            <label>Username</label>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={register}>
            Continue
          </button>
          <div className="auth-switch">
            Already have an account?{" "}
            <span onClick={() => setPage("login")}>Log in</span>
          </div>
        </div>
        {renderNotification(notification, fade)}
      </div>
    )
  }

  if (page === "friends") {
    const friend = friends.find(f => f.username === activeDm)

    return (
      <div className="discord-app">
        <ServerRail {...railProps} />
        <aside className="channel-sidebar">
          <FriendsSidebar
            friends={friends}
            pendingIncoming={pendingIncoming}
            pendingOutgoing={pendingOutgoing}
            friendsTab={friendsTab}
            setFriendsTab={setFriendsTab}
            friendSearch={friendSearch}
            setFriendSearch={setFriendSearch}
            addFriendName={addFriendName}
            setAddFriendName={setAddFriendName}
            onSendFriendRequest={sendFriendRequest}
            selectedFriend={selectedFriend}
            onSelectFriend={openFriendChat}
            onAcceptRequest={(name) => socket.emit("acceptFriendRequest", { fromUsername: name })}
            onDeclineRequest={(name) => socket.emit("declineFriendRequest", { fromUsername: name })}
            onCancelRequest={(name) => socket.emit("cancelFriendRequest", { toUsername: name })}
            profiles={profiles}
          />
          <UserBar {...userBarProps} />
        </aside>
        {activeDm && friend && activeChatId ? (
          <section className="chat-panel">
            <header className="chat-toolbar">
              <span className="dm-at">@</span>
              <span>{displayLabel(profiles[friend.username], friend.username)}</span>
              <span className={`dm-status-pill ${friend.online ? "online" : ""}`}>
                {friend.online ? "Online" : "Offline"}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm dm-remove-btn"
                onClick={() => {
                  socket.emit("removeFriend", { friendUsername: friend.username })
                  setSelectedFriend(null)
                  setActiveDm(null)
                  setActiveChatId(null)
                  setMessages([])
                }}
              >
                Remove friend
              </button>
            </header>
            <MessageList {...messageListProps} mutedUsers={[]} />
            <ChatComposer {...composerProps} placeholder={`Message @${friend.username}`} />
          </section>
        ) : (
          <main className="chat-panel welcome-panel friends-main">
            <h1>Friends</h1>
            <p>
              Select a friend from the list to start a private chat, or add someone new above.
            </p>
          </main>
        )}
        {messageContextMenu && (
          <MessageContextMenu
            x={messageContextMenu.x}
            y={messageContextMenu.y}
            onEdit={startEditMessage}
            onDelete={deleteMessage}
          />
        )}
        {profileModals}
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        {contextMenu && (
          <UserContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            targetUser={contextMenu.targetUser}
            targetProfile={profiles[contextMenu.targetUser]}
            isOwner={false}
            isSelf={false}
            inDm
            personalMuted={false}
            muteAllActive={false}
            mutedForAll={[]}
            onViewProfile={() => openViewProfile(contextMenu.targetUser)}
            onMute={() => {}}
            onMuteAll={() => {}}
            onMuteForAll={() => {}}
            onKick={() => {}}
            onBan={() => {}}
            onAddFriend={() => handleAddFriendFromMenu(contextMenu.targetUser)}
          />
        )}
        {renderNotification(notification, fade)}
      </div>
    )
  }

  if (page === "servers") {
    return (
      <div className="discord-app">
        <ServerRail {...railProps} />
        <aside className="channel-sidebar">
          <ServerDiscoverSidebar
            search={search}
            setSearch={setSearch}
            serverName={serverNameInput}
            setServerName={setServerNameInput}
            serverType={serverType}
            setServerType={setServerType}
            onBrowse={browseServers}
            onCreate={createServer}
            filteredServers={filteredServers}
            bannedFrom={bannedFrom}
            onJoinServer={joinServer}
            lockedNotifications={lockedNotifications}
            onAcceptRequest={(n, i) => {
              socket.emit("acceptRequest", { serverId: n.serverId, username: n.username })
              setLockedNotifications(prev => prev.filter((_, idx) => idx !== i))
            }}
            onDeclineRequest={(n, i) => {
              socket.emit("declineRequest", { serverId: n.serverId, username: n.username })
              setLockedNotifications(prev => prev.filter((_, idx) => idx !== i))
            }}
            onServerContextMenu={(e, server) => {
              setContextMenu(null)
              setMessageContextMenu(null)
              setServerContextMenu({ x: e.clientX, y: e.clientY, server })
            }}
          />
          <UserBar {...userBarProps} />
        </aside>

        <main className="chat-panel welcome-panel">
          <h1>Welcome to WebChat</h1>
          <p>
            Pick a server from the sidebar to join, or create your own.
            Open servers let anyone in; private and locked servers need an invite code.
          </p>
        </main>

        <InviteModal
          show={showInvitePopup}
          pendingServer={pendingServer}
          cooldowns={cooldowns}
          pendingRequest={pendingRequest}
          pendingDots={pendingDots}
          inviteInput={inviteInput}
          setInviteInput={setInviteInput}
          onClose={() => { setShowInvitePopup(false); setInviteInput("") }}
          onSubmit={submitInvite}
          formatCooldown={formatCooldown}
        />
        <PendingModal
          show={showPendingPopup && !showInvitePopup}
          pendingRequest={pendingRequest}
          pendingDots={pendingDots}
          onClose={() => setShowPendingPopup(false)}
        />
        {profileModals}
        {serverContextMenu && (
          <ServerContextMenu
            x={serverContextMenu.x}
            y={serverContextMenu.y}
            server={serverContextMenu.server}
            isOwner={serverContextMenu.server?.owner === username}
            onEdit={() => {
              setEditingServer(serverContextMenu.server)
              setServerContextMenu(null)
            }}
            onDelete={() => {
              setDeletingServer(serverContextMenu.server)
              setServerContextMenu(null)
            }}
            onLeave={() => leaveServer(serverContextMenu.server?.id)}
            onClose={() => setServerContextMenu(null)}
          />
        )}
        {editingServer && (
          <EditServerModal
            server={editingServer}
            currentUsername={username}
            sessionToken={sessionToken}
            onClose={() => setEditingServer(null)}
            onSaved={() => {
              setEditingServer(null)
              showNotification("Server updated", "success")
              socket.emit("getServers")
            }}
            onError={(msg) => showNotification(msg, "error")}
          />
        )}
        {deletingServer && (
          <DeleteServerModal
            server={deletingServer}
            currentUsername={username}
            sessionToken={sessionToken}
            onClose={() => setDeletingServer(null)}
            onDeleted={() => {
              setDeletingServer(null)
              showNotification("Server deleted", "success")
              socket.emit("getServers")
            }}
            onError={(msg) => showNotification(msg, "error")}
          />
        )}
        {renderNotification(notification, fade)}
      </div>
    )
  }

  return (
    <div className="discord-app">
      <ServerRail {...railProps} />
      <aside className="channel-sidebar">
        <div className="sidebar-header">
          <span>{activeServer?.name || activeServerId}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage("servers")}>
            ← Back
          </button>
        </div>
        <div className="sidebar-section">
          <h3>Text channels</h3>
          <div className="channel-item active">
            <span className="hash" style={{ color: "var(--text-muted)", marginRight: 6 }}>#</span>
            <span className="channel-name">general</span>
          </div>
        </div>
        {inviteCode && (
          <div className="sidebar-section">
            <h3>Invite</h3>
            <div className="invite-code-row">
              <div
                className="invite-code-value"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key.toLowerCase() === "v") {
                    e.preventDefault()
                    copyInviteToClipboard()
                  }
                }}
                onClick={() => copyInviteToClipboard()}
              >
                {inviteCode}
              </div>
              <button type="button" className="btn btn-ghost btn-sm invite-copy-btn" onClick={copyInviteToClipboard}>
                Copy
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
              Share this code with friends
            </p>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <UserBar {...userBarProps} />
      </aside>

      <section className="chat-panel">
        <header className="chat-toolbar">
          <span className="hash">#</span>
          <span>general</span>
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 14 }}>
            — {activeServer?.name || activeServerId}
          </span>
        </header>

        <MessageList {...messageListProps} />

        <ChatComposer {...composerProps} placeholder="Message #general" />
      </section>

      {profileModals}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {messageContextMenu && (
        <MessageContextMenu
          x={messageContextMenu.x}
          y={messageContextMenu.y}
          onEdit={startEditMessage}
          onDelete={deleteMessage}
        />
      )}

      {contextMenu && (
        <UserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetUser={contextMenu.targetUser}
          targetProfile={profiles[contextMenu.targetUser]}
          isOwner={isServerOwner}
          isSelf={contextMenu.targetUser === username}
          personalMuted={!!personalMutes[contextMenu.targetUser]}
          muteAllActive={muteAllActive}
          mutedForAll={serverMutedForAll}
          onViewProfile={() => openViewProfile(contextMenu.targetUser)}
          onMute={() => togglePersonalMute(contextMenu.targetUser)}
          onMuteAll={() => {
            setMuteAllActive((v) => {
              const next = !v
              if (activeServerId) {
                socket.emit("saveSession", {
                  lastPage: page,
                  activeServerId,
                  activeChatId,
                  activeDm,
                  personalMutes,
                  muteAllActive: next
                })
              }
              return next
            })
            setContextMenu(null)
          }}
          onMuteForAll={() => handleMuteForAll(contextMenu.targetUser)}
          onKick={() => handleKick(contextMenu.targetUser)}
          onBan={() => handleBan(contextMenu.targetUser)}
          onAddFriend={() => handleAddFriendFromMenu(contextMenu.targetUser)}
        />
      )}

      {serverContextMenu && (
        <ServerContextMenu
          x={serverContextMenu.x}
          y={serverContextMenu.y}
          server={serverContextMenu.server}
          isOwner={serverContextMenu.server?.owner === username}
          onEdit={() => {
            setEditingServer(serverContextMenu.server)
            setServerContextMenu(null)
          }}
          onDelete={() => {
            setDeletingServer(serverContextMenu.server)
            setServerContextMenu(null)
          }}
          onLeave={() => leaveServer(serverContextMenu.server?.id)}
          onClose={() => setServerContextMenu(null)}
        />
      )}

      {editingServer && (
        <EditServerModal
          server={editingServer}
          currentUsername={username}
          sessionToken={sessionToken}
          onClose={() => setEditingServer(null)}
          onSaved={() => {
            setEditingServer(null)
            showNotification("Server updated", "success")
            socket.emit("getServers")
          }}
          onError={(msg) => showNotification(msg, "error")}
        />
      )}

      {deletingServer && (
        <DeleteServerModal
          server={deletingServer}
          currentUsername={username}
          sessionToken={sessionToken}
          onClose={() => setDeletingServer(null)}
          onDeleted={() => {
            setDeletingServer(null)
            showNotification("Server deleted", "success")
            socket.emit("getServers")
          }}
          onError={(msg) => showNotification(msg, "error")}
        />
      )}

      {renderNotification(notification, fade)}
    </div>
  )
}

function renderNotification(notification, fade) {
  if (!notification) return null
  return (
    <div
      className={`toast ${notification.type}`}
      style={{ opacity: fade ? 0 : 1 }}
    >
      {notification.text}
    </div>
  )
}
