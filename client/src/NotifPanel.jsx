export default function NotifPanel({
  lockedNotifications,
  showNotifPanel,
  setShowNotifPanel,
  onAccept,
  onDecline
}) {
  return (
    <div className="notif-bell">
      <button
        type="button"
        className="notif-trigger"
        onClick={() => setShowNotifPanel(prev => !prev)}
      >
        🔔
        {lockedNotifications.length > 0 && (
          <span className="notif-badge">{lockedNotifications.length}</span>
        )}
        {showNotifPanel ? "▲" : "▼"}
      </button>
      <div className={`notif-dropdown ${showNotifPanel ? "" : "collapsed"}`}>
        <div className="notif-list">
          {lockedNotifications.length === 0 ? (
            <div className="empty-state">No notifications yet</div>
          ) : (
            lockedNotifications.map((n, i) => (
              <div key={i} className="notif-item">
                <div style={{ fontSize: 10, opacity: 0.6, textTransform: "uppercase" }}>
                  {n.server}
                </div>
                <div style={{ fontSize: 14, margin: "6px 0" }}>
                  <b>{n.username}</b> wants to join
                </div>
                <div className="notif-actions">
                  <button type="button" className="btn btn-sm btn-success" onClick={() => onAccept(n, i)}>
                    Accept
                  </button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => onDecline(n, i)}>
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
