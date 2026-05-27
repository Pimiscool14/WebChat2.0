import UserAvatar from "./UserAvatar.jsx"
import { displayLabel } from "./profileUtils.js"

export default function ViewProfileModal({ profile, loading, onBack }) {
  const username = profile?.username || ""
  const name = displayLabel(profile, username)
  const bioText = profile?.bio?.trim()

  return (
    <div className="profile-overlay" onClick={onBack}>
      <div className="view-profile-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="view-profile-back btn btn-ghost btn-sm" onClick={onBack}>
          ← Back
        </button>

        {loading && !profile ? (
          <p className="profile-hint">Loading profile…</p>
        ) : (
          <>
            <UserAvatar
              profile={profile}
              username={username}
              className="view-profile-avatar"
              size={120}
            />
            <h2 className="view-profile-display">{name}</h2>
            <p className="view-profile-username">@{username}</p>

            <h3 className="view-profile-bio-label">Bio</h3>
            <p className="view-profile-bio">
              {bioText || "This person doesnt have a bio yet"}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
