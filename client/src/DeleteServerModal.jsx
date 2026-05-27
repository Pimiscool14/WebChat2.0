import { deleteServer } from "./api.js"

export default function DeleteServerModal({
  server,
  currentUsername,
  sessionToken,
  onClose,
  onDeleted,
  onError
}) {
  if (!server) return null

  const doDelete = async () => {
    if (!currentUsername || !sessionToken || !server.id) return
    try {
      await deleteServer(currentUsername, sessionToken, server.id)
      onDeleted?.(server.id)
    } catch (err) {
      onError?.(err.message || "Delete failed")
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete server?</h3>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.45, marginTop: -6 }}>
          Are you sure? This server will be permanently deleted forever.
        </p>

        <div className="download-confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={doDelete}>
            Delete server
          </button>
        </div>
      </div>
    </div>
  )
}

