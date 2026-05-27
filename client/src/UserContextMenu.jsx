import { displayLabel } from "./profileUtils.js"

export default function UserContextMenu({
  x,
  y,
  targetUser,
  targetProfile,
  isOwner,
  isSelf,
  personalMuted,
  muteAllActive,
  mutedForAll,
  inDm = false,
  onViewProfile,
  onMute,
  onMuteAll,
  onMuteForAll,
  onKick,
  onBan,
  onAddFriend
}) {
  if (!targetUser || isSelf) return null

  const globallyMuted = mutedForAll.includes(targetUser)
  const header = displayLabel(targetProfile, targetUser)

  return (
    <div
      className="user-context-menu"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ctx-header">{header}</div>

      <button type="button" className="ctx-item" onClick={onViewProfile}>
        View profile
      </button>

      {!inDm && (
        <button type="button" className="ctx-item" onClick={onMute}>
          {personalMuted ? "Unmute" : "Mute"}
        </button>
      )}

      <button type="button" className="ctx-item" onClick={onAddFriend}>
        Add friend
      </button>

      {!inDm && isOwner && (
        <>
          <div className="ctx-divider" />
          <button type="button" className="ctx-item ctx-kick" onClick={onKick}>
            Kick
          </button>
          <button type="button" className="ctx-item ctx-ban" onClick={onBan}>
            Ban
          </button>
          <button type="button" className="ctx-item" onClick={onMuteForAll}>
            {globallyMuted ? "Unmute for all" : "Mute for all"}
          </button>
          <button type="button" className="ctx-item" onClick={onMuteAll}>
            {muteAllActive ? "Unmute all" : "Mute all"}
          </button>
        </>
      )}
    </div>
  )
}
