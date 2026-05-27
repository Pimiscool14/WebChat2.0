import MessageBody from "./MessageBody.jsx"
import UserAvatar from "./UserAvatar.jsx"
import { displayLabel } from "./profileUtils.js"

function MutedUserStub({ username, profile, onUserContextMenu }) {
  const label = displayLabel(profile, username)
  return (
    <div
      className="message-row muted-stub"
      onContextMenu={(e) => {
        e.preventDefault()
        onUserContextMenu(e, username)
      }}
    >
      <UserAvatar profile={profile} username={username} className="msg-avatar" />
      <div className="msg-body">
        <div className="msg-header">
          <span className="msg-username">{label}</span>
        </div>
        <div className="msg-text muted-label">Messages hidden — right-click to unmute</div>
      </div>
    </div>
  )
}

export default function MessageList({
  messages,
  endRef,
  currentUsername,
  profiles = {},
  mutedUsers = [],
  shouldHideMessage,
  onUserContextMenu,
  onMessageContextMenu,
  editingMessageId,
  editingText,
  onEditingTextChange,
  onConfirmEdit,
  onCancelEdit,
  onImageClick
}) {
  return (
    <div className="message-list">
      {messages.map((m) => {
        if (m.kind === "system") {
          return (
            <div key={m.id} className="message-row system">
              <span>{m.text}</span>
            </div>
          )
        }

        if (shouldHideMessage?.(m.username)) {
          return null
        }

        const profile = profiles[m.username]
        const label = displayLabel(profile, m.username)
        const isOwn = m.username === currentUsername
        const isEditing = editingMessageId === m.id
        const hasContent = m.message?.trim() || (m.attachments?.length > 0)

        return (
          <div
            key={m.id}
            className="message-row"
            onContextMenu={(e) => {
              e.preventDefault()
              if (isOwn && onMessageContextMenu) {
                onMessageContextMenu(e, m)
              } else if (onUserContextMenu && m.username !== currentUsername) {
                onUserContextMenu(e, m.username)
              }
            }}
          >
            <UserAvatar profile={profile} username={m.username} className="msg-avatar" />
            <div className="msg-body">
              <div className="msg-header">
                <span className="msg-username">{label}</span>
              </div>
              {isEditing ? (
                <div className="msg-edit-row">
                  <input
                    className="msg-edit-input"
                    value={editingText}
                    onChange={(e) => onEditingTextChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        onConfirmEdit()
                      }
                      if (e.key === "Escape") onCancelEdit()
                    }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={onConfirmEdit}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelEdit}>
                    Cancel
                  </button>
                </div>
              ) : hasContent ? (
                <div className="msg-text">
                  <MessageBody
                    text={m.message}
                    attachments={m.attachments}
                    onImageClick={onImageClick}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}

      {mutedUsers.map((user) => (
        <MutedUserStub
          key={`muted-${user}`}
          username={user}
          profile={profiles[user]}
          onUserContextMenu={onUserContextMenu}
        />
      ))}

      <div ref={endRef} />
    </div>
  )
}
