export default function PendingModal({ show, pendingRequest, pendingDots, onClose }) {
  if (!show || !pendingRequest) return null

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <p className="pending-text">Pending request{pendingDots}</p>
      </div>
    </div>
  )
}
