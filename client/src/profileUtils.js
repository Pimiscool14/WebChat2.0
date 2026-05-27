import { resolveMediaUrl } from "./linkUtils.js"

export function displayLabel(profile, username) {
  const dn = profile?.displayName?.trim()
  return dn || username
}

export function avatarSrc(profile) {
  if (!profile?.avatarUrl) return null
  return resolveMediaUrl(profile.avatarUrl)
}

export function initialsFrom(label) {
  return (label || "?").slice(0, 2).toUpperCase()
}
