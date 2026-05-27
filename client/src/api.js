const API_BASE = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"

export async function uploadChatFile(file, username, token) {
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Username": username
    },
    body: form
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Upload failed")
  return {
    type: data.type,
    url: data.url,
    filename: data.filename
  }
}

export async function uploadAvatar(file, username, token) {
  const form = new FormData()
  form.append("avatar", file)

  const res = await fetch(`${API_BASE}/api/upload-avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Username": username
    },
    body: form
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Avatar upload failed")
  return data
}

export async function uploadServerIcon(file, username, token, serverId) {
  const form = new FormData()
  form.append("icon", file)

  const res = await fetch(`${API_BASE}/api/upload-server-icon`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Username": username,
      "X-Server-Id": serverId
    },
    body: form
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Server icon upload failed")
  return data
}

export async function deleteServer(username, token, serverId) {
  const res = await fetch(`${API_BASE}/api/server/${encodeURIComponent(serverId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Username": username
    }
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Delete server failed")
  return data
}
