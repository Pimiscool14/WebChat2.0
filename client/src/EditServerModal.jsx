import { useEffect, useRef, useState } from "react"
import { resolveMediaUrl } from "./linkUtils.js"
import { uploadServerIcon } from "./api.js"

export default function EditServerModal({
  server,
  currentUsername,
  sessionToken,
  onClose,
  onSaved,
  onError
}) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const fileRef = useRef(null)
  const iconUrl = server?.iconUrl ? resolveMediaUrl(server.iconUrl) : ""

  useEffect(() => {
    return () => {
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl) } catch { /* ignore */ }
      }
    }
  }, [previewUrl])

  const hasPreview = !!previewUrl

  const save = async () => {
    if (!selectedFile || !sessionToken || !currentUsername || !server?.id) return
    setUploading(true)
    try {
      const result = await uploadServerIcon(selectedFile, currentUsername, sessionToken, server.id)
      onSaved?.(result)
    } catch (err) {
      onError?.(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-editor-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Edit server</h2>

        <div className="profile-editor-avatar-row">
          {hasPreview ? (
            <img src={previewUrl} alt="" className="server-icon-preview has-image" />
          ) : iconUrl ? (
            <img src={iconUrl} alt="" className="server-icon-preview has-image" />
          ) : (
            <div className="server-icon-preview">
              {(server?.name || "?").slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setSelectedFile(f)
                  try {
                    const next = URL.createObjectURL(f)
                    setPreviewUrl((cur) => {
                      if (cur) URL.revokeObjectURL(cur)
                      return next
                    })
                  } catch {
                    setPreviewUrl("")
                  }
                }
                e.target.value = ""
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Choose image
            </button>
            <p className="profile-hint">JPG/PNG — max 75 MB (auto-resized)</p>
          </div>
        </div>

        <div className="profile-editor-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={uploading || !selectedFile}
            onClick={save}
          >
            {uploading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

