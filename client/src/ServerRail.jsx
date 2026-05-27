export default function ServerRail({
  page,
  accessList,
  servers,
  activeServerId,
  onHome,
  onFriends,
  onJoinServer,
  onServerContextMenu
}) {
  const base = (import.meta.env.VITE_SOCKET_URL || "http://localhost:3000").replace(/\/$/, "")
  return (
    <nav className="server-rail" aria-label="Servers">
      <button
        type="button"
        className={`rail-pill home ${page === "servers" ? "active" : ""}`}
        title="Home"
        onClick={onHome}
      >
        W
      </button>
      <button
        type="button"
        className={`rail-pill friends-pill ${page === "friends" ? "active" : ""}`}
        title="Friends"
        onClick={onFriends}
      >
        👥
      </button>
      <div className="rail-divider" />
      {accessList.slice(0, 8).map(id => {
        const s = servers.find(x => x.id === id)
        const label = s?.name?.[0]?.toUpperCase() || id[0]?.toUpperCase()
        return (
          <button
            key={id}
            type="button"
            className={`rail-pill ${page === "chat" && activeServerId === id ? "active" : ""}`}
            title={s?.name || id}
            onClick={() => onJoinServer(id)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (onServerContextMenu && s) onServerContextMenu(e, s)
            }}
          >
            {s?.iconUrl ? (
              <img className="rail-icon" src={s.iconUrl.startsWith("/") ? `${base}${s.iconUrl}` : s.iconUrl} alt="" />
            ) : (
              label
            )}
          </button>
        )
      })}
    </nav>
  )
}
