import { useRef, useState } from "react"
import UserAvatar from "./UserAvatar.jsx"
import { uploadAvatar } from "./api.js"

export default function ProfileEditorModal({
  username,
  profile,
  sessionToken,
  onClose,
  onSave,
  onAvatarUploaded,
  onError
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const handleAvatar = async (file) => {
    if (!file || !sessionToken) return
    setUploading(true)
    try {
      const { profile: updated } = await uploadAvatar(file, username, sessionToken)
      onAvatarUploaded(updated)
    } catch (err) {
      onError(err.message || "Avatar upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    onSave({ displayName: displayName.trim(), bio })
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-editor-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Edit profile</h2>

        <div className="profile-editor-avatar-row">
          <UserAvatar
            profile={profile}
            username={username}
            className="profile-editor-avatar"
            size={96}
          />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleAvatar(f)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Edit"}
            </button>
            <p className="profile-hint">JPG, PNG or JPEG — max 75 MB (auto-resized)</p>
          </div>
        </div>

        <div className="field">
          <label>Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="3–12 letters (optional)"
            maxLength={12}
          />
          <p className="profile-hint">Shown instead of username. Letters A–Z only.</p>
        </div>

        <div className="field">
          <label>Username</label>
          <input value={username} disabled />
        </div>

        <div className="field">
          <label>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself"
            maxLength={500}
            rows={4}
          />
          <p className="profile-hint">{bio.length}/500</p>
        </div>

        <div className="profile-editor-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
