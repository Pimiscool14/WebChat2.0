import { useEffect, useRef } from "react"
import { resolveMediaUrl } from "./linkUtils.js"

export default function ChatComposer({
  placeholder,
  value,
  onChange,
  onSend,
  pendingAttachments = [],
  onRemoveAttachment,
  onFilesSelected,
  uploading = false
}) {
  const fileRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!uploading) {
      inputRef.current?.focus()
    }
  }, [uploading, pendingAttachments.length])

  const handleEnter = (e) => {
    if (e.key !== "Enter" || e.shiftKey || uploading) return
    e.preventDefault()
    onSend()
  }

  return (
    <div className="message-composer">
      {pendingAttachments.length > 0 && (
        <div className="composer-attachments">
          {pendingAttachments.map((att, i) => (
            <div key={`${att.url}-${i}`} className="composer-attachment">
              {att.type === "image" ? (
                <img src={resolveMediaUrl(att.url)} alt="" />
              ) : att.type === "video" ? (
                <span className="att-label">🎬 {att.filename || "Video"}</span>
              ) : att.type === "audio" ? (
                <span className="att-label">🎵 {att.filename || "Audio"}</span>
              ) : (
                <span className="att-label att-file">📎 {att.filename || "File"}</span>
              )}
              <button
                type="button"
                className="att-remove"
                onClick={() => onRemoveAttachment(i)}
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="composer-inner">
        <button
          type="button"
          className="composer-plus"
          title="Attach any file"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          +
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onFilesSelected(e.target.files)
            e.target.value = ""
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={uploading ? "Uploading…" : placeholder}
          value={value}
          onChange={onChange}
          disabled={uploading}
          onKeyDown={handleEnter}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSend}
          disabled={uploading}
        >
          Send
        </button>
      </div>
    </div>
  )
}
