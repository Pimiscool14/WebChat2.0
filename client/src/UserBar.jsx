import UserAvatar from "./UserAvatar.jsx"
import { displayLabel } from "./profileUtils.js"

export default function UserBar({
  username,
  profile,
  serverName,
  mutedIn,
  bannedCount,
  onOpenProfile,
  onLogout
}) {
  const label = displayLabel(profile, username)
  let status = "Online"
  if (mutedIn) status = `Muted (${mutedIn})`
  else if (serverName) status = serverName

  return (
    <div className="sidebar-footer">
      <button
        type="button"
        className="user-bar-main"
        onClick={onOpenProfile}
        title="Edit profile"
      >
        <UserAvatar profile={profile} username={username} className="user-avatar" size={32} />
        <div className="user-bar-info">
          <div style={{ fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{status}</div>
          {bannedCount > 0 && (
            <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>
              Banned from {bannedCount} server{bannedCount === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </button>
      {onLogout && (
        <button type="button" className="btn btn-ghost btn-sm logout-btn" onClick={onLogout}>
          Log out
        </button>
      )}
    </div>
  )
}
