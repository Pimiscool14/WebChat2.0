import { useState } from "react"
import { parseMessageText, resolveMediaUrl } from "./linkUtils.js"
import DownloadConfirmModal from "./DownloadConfirmModal.jsx"

function FileAttachment({ att, onDownloadClick }) {
  const src = resolveMediaUrl(att.url)
  const name = att.filename || "Download file"

  return (
    <div className="msg-file-row">
      <span className="msg-file-link">{name}</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm msg-download-btn"
        onClick={() => onDownloadClick({ url: src, filename: name })}
      >
        Download
      </button>
    </div>
  )
}

function Attachment({ att, onImageClick, onDownloadClick }) {
  const src = resolveMediaUrl(att.url)

  if (att.type === "file") {
    return <FileAttachment att={att} onDownloadClick={onDownloadClick} />
  }
  if (att.type === "image") {
    return (
      <img
        src={src}
        alt={att.filename || "image"}
        className="msg-media msg-image"
        onClick={() => onImageClick(src)}
      />
    )
  }
  if (att.type === "video") {
    return (
      <video src={src} controls className="msg-media msg-video" />
    )
  }
  if (att.type === "audio") {
    return (
      <div className="msg-audio-wrap">
        <audio src={src} controls className="msg-media msg-audio" preload="metadata" />
      </div>
    )
  }
  return <FileAttachment att={att} onDownloadClick={onDownloadClick} />
}

export default function MessageBody({ text, attachments = [], onImageClick }) {
  const parts = parseMessageText(text)
  const [downloadTarget, setDownloadTarget] = useState(null)

  const startDownload = (target) => setDownloadTarget(target)

  const confirmDownload = () => {
    if (!downloadTarget) return
    const a = document.createElement("a")
    a.href = downloadTarget.url
    a.download = downloadTarget.filename
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    a.remove()
    setDownloadTarget(null)
  }

  return (
    <>
      <div className="msg-content">
        {parts.map((part, i) => {
          if (part.kind === "text") {
            return <span key={`t-${i}`}>{part.value}</span>
          }
          if (part.kind === "link") {
            return (
              <a
                key={`l-${i}`}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="msg-link"
              >
                {part.url}
              </a>
            )
          }
          if (part.kind === "image-url") {
            const src = resolveMediaUrl(part.url)
            return (
              <img
                key={`i-${i}`}
                src={src}
                alt=""
                className="msg-media msg-image"
                onClick={() => onImageClick(src)}
              />
            )
          }
          if (part.kind === "video-embed") {
            return (
              <div key={`v-${i}`} className="msg-embed-wrap">
                <iframe
                  src={part.embed.embedUrl}
                  title={`${part.embed.provider} embed`}
                  className="msg-embed"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            )
          }
          return null
        })}

        {attachments.map((att, i) => (
          <Attachment
            key={`a-${i}`}
            att={att}
            onImageClick={onImageClick}
            onDownloadClick={startDownload}
          />
        ))}
      </div>

      <DownloadConfirmModal
        filename={downloadTarget?.filename}
        onCancel={() => setDownloadTarget(null)}
        onConfirm={confirmDownload}
      />
    </>
  )
}
