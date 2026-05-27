export default function InviteModal({
  show,
  pendingServer,
  cooldowns,
  pendingRequest,
  pendingDots,
  inviteInput,
  setInviteInput,
  onClose,
  onSubmit,
  formatCooldown
}) {
  if (!show || !pendingServer) return null

  const onCooldown =
    cooldowns[pendingServer.id] && Date.now() < cooldowns[pendingServer.id]

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        {onCooldown ? (
          <>
            <h3>Try again later</h3>
            <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
              Your request was declined.
            </p>
            <div className="cooldown-display">
              {formatCooldown(cooldowns[pendingServer.id])}
            </div>
          </>
        ) : pendingRequest ? (
          <p className="pending-text">Pending request{pendingDots}</p>
        ) : (
          <>
            <h3>Invite required</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
              Enter the invite code for <b>{pendingServer.name}</b>
            </p>
            <div className="field">
              <input
                placeholder="Invite code"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              />
            </div>
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={onSubmit}>
              Join server
            </button>
          </>
        )}
      </div>
    </div>
  )
}
