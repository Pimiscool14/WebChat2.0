const URL_REGEX = /https?:\/\/[^\s<>"']+/gi
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?[^\s]*)?$/i

export function isImageUrl(url) {
  try {
    const u = new URL(url)
    if (IMAGE_EXT.test(u.pathname)) return true
    if (/\.(jpe?g|png|gif|webp)$/i.test(url.split("?")[0])) return true
  } catch {
    return IMAGE_EXT.test(url)
  }
  return false
}

export function getVideoEmbed(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, "")

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v")
      if (v) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${v}` }
      const shorts = u.pathname.match(/\/shorts\/([^/]+)/)
      if (shorts) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${shorts[1]}` }
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0]
      if (id) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` }
    }

    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop()
      if (id && /^\d+$/.test(id)) {
        return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` }
      }
    }

    if (host === "dailymotion.com") {
      const m = u.pathname.match(/\/video\/([^_]+)/)
      if (m) return { provider: "dailymotion", embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}` }
    }

    if (host === "dai.ly") {
      const id = u.pathname.slice(1)
      if (id) return { provider: "dailymotion", embedUrl: `https://www.dailymotion.com/embed/video/${id}` }
    }

    if (host === "twitch.tv") {
      const video = u.pathname.match(/\/videos\/(\d+)/)
      const parent = typeof window !== "undefined" ? window.location.hostname : "localhost"
      if (video) {
        return {
          provider: "twitch",
          embedUrl: `https://player.twitch.tv/?video=v${video[1]}&parent=${parent}`
        }
      }
    }

    if (host === "clips.twitch.tv") {
      const clip = u.pathname.slice(1)
      const parent = typeof window !== "undefined" ? window.location.hostname : "localhost"
      if (clip) {
        return {
          provider: "twitch",
          embedUrl: `https://clips.twitch.tv/embed?clip=${clip}&parent=${parent}`
        }
      }
    }

    if (host === "tiktok.com") {
      const m = u.pathname.match(/\/video\/(\d+)/)
      if (m) {
        return { provider: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}` }
      }
    }
  } catch {
    return null
  }
  return null
}

export function parseMessageText(text) {
  if (!text?.trim()) return []
  const parts = []
  let last = 0
  const re = new RegExp(URL_REGEX.source, "gi")
  let match

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", value: text.slice(last, match.index) })
    }
    const url = match[0].replace(/[.,;:!?)]+$/, "")
    const embed = getVideoEmbed(url)
    if (embed) {
      parts.push({ kind: "video-embed", url, embed })
    } else if (isImageUrl(url)) {
      parts.push({ kind: "image-url", url })
    } else {
      parts.push({ kind: "link", url })
    }
    last = match.index + match[0].length
  }

  if (last < text.length) {
    parts.push({ kind: "text", value: text.slice(last) })
  }

  return parts.length ? parts : [{ kind: "text", value: text }]
}

export function resolveMediaUrl(url) {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`
}
