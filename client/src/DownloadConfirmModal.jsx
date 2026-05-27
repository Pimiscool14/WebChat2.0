export default function DownloadConfirmModal({ filename, onCancel, onConfirm }) {
  if (!filename) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card download-confirm" onClick={(e) => e.stopPropagation()}>
        <h3>Download file?</h3>
        <p>
          Are you sure? This file could be a malicious file.
        </p>
        <p className="download-filename">{filename}</p>
        <div className="download-confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Download anyway
          </button>
        </div>
      </div>
    </div>
  )
}
