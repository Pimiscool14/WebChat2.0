function toPublicProfile(user) {
  if (!user) return null
  return {
    username: user.username,
    displayName: user.displayName || "",
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || null
  }
}

function validateDisplayName(displayName) {
  const t = (displayName || "").trim()
  if (!t) return { ok: true, value: "" }
  if (!/^[a-zA-Z]{3,12}$/.test(t)) {
    return { error: "Display name must be 3–12 letters (A–Z only)" }
  }
  return { ok: true, value: t }
}

function validateBio(bio) {
  const text = bio == null ? "" : String(bio)
  if (text.length > 500) {
    return { error: "Bio must be 500 characters or less" }
  }
  return { ok: true, value: text }
}

module.exports = { toPublicProfile, validateDisplayName, validateBio }
