export default function ServerDiscoverSidebar({
  search,
  setSearch,
  serverName,
  setServerName,
  serverType,
  setServerType,
  onBrowse,
  onCreate,
  filteredServers,
  bannedFrom = [],
  onJoinServer,
  lockedNotifications = [],
  onAcceptRequest,
  onDeclineRequest,
  onServerContextMenu
}) {
  const canModerateRequests = typeof onAcceptRequest === "function" && typeof onDeclineRequest === "function"
  const base = (import.meta.env.VITE_SOCKET_URL || "http://localhost:3000").replace(/\/$/, "")
  return (
    <>
      <div className="sidebar-header">
        <span>Discover</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBrowse}>
          Refresh
        </button>
      </div>
      <div className="sidebar-section">
        <h3>Browse servers</h3>
        <div className="field" style={{ marginBottom: 8 }}>
          <input
            placeholder="Search servers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <h3 style={{ marginTop: 16 }}>Create server</h3>
        <div className="add-friend-stack">
          <input
            placeholder="Server name"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
          />
          <select value={serverType} onChange={(e) => setServerType(e.target.value)}>
            <option value="" disabled>Type</option>
            <option value="open">Open</option>
            <option value="private">Private</option>
            <option value="locked">Locked</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            Create server
          </button>
        </div>

        {canModerateRequests && (
          <div className="server-requests">
            <button
              type="button"
              className="server-requests-trigger"
              onClick={(e) => {
                const root = e.currentTarget.closest(".server-requests")
                root?.classList.toggle("open")
              }}
            >
              <span>Server requests</span>
              {lockedNotifications.length > 0 && (
                <span className="server-requests-badge">{lockedNotifications.length}</span>
              )}
              <span className="server-requests-caret">▾</span>
            </button>

            <div className="server-requests-dropdown">
              {lockedNotifications.length === 0 ? (
                <div className="empty-state" style={{ padding: 16 }}>
                  No requests
                </div>
              ) : (
                lockedNotifications.map((n, i) => (
                  <div key={`${n.serverId || n.server}-${n.username}-${i}`} className="server-requests-item">
                    <div className="server-requests-meta">{n.server}</div>
                    <div className="server-requests-text">
                      <b>{n.username}</b> wants to join
                    </div>
                    <div className="server-requests-actions">
                      <button type="button" className="btn btn-sm btn-success" onClick={() => onAcceptRequest(n, i)}>
                        Accept
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => onDeclineRequest(n, i)}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <div className="sidebar-scroll">
        {filteredServers.length === 0 ? (
          <div className="empty-state">Click Refresh to load servers</div>
        ) : (
          filteredServers.map((s) => {
            const banned = bannedFrom.includes(s.id)
            return (
              <div
                key={s.id}
                className={`channel-item ${banned ? "server-banned" : ""}`}
                onClick={() => !banned && onJoinServer(s)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (onServerContextMenu) onServerContextMenu(e, s)
                }}
              >
                {s.iconUrl ? (
                  <img
                    className="server-list-icon"
                    src={s.iconUrl.startsWith("/") ? `${base}${s.iconUrl}` : s.iconUrl}
                    alt=""
                  />
                ) : (
                  <div className="server-list-icon placeholder">
                    {(s.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="channel-meta">
                  <div className="channel-name">{s.name}</div>
                  <div className="channel-sub">
                    {banned ? "You are banned" : `${s.members} members`}
                  </div>
                </div>
                <span className={`type-badge ${s.type}`}>{s.type}</span>
                {banned ? (
                  <span className="banned-badge">Banned</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => { e.stopPropagation(); onJoinServer(s) }}
                  >
                    Join
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
