import UserAvatar from "./UserAvatar.jsx"

export default function FriendsSidebar({
  friends,
  pendingIncoming,
  pendingOutgoing,
  friendsTab,
  setFriendsTab,
  friendSearch,
  setFriendSearch,
  addFriendName,
  setAddFriendName,
  onSendFriendRequest,
  selectedFriend,
  onSelectFriend,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  profiles = {}
}) {
  const q = friendSearch.toLowerCase()
  const onlineFriends = friends.filter(f => f.online && f.username.includes(q))
  const allFriends = friends.filter(f => f.username.includes(q))
  const list =
    friendsTab === "online" ? onlineFriends
    : friendsTab === "all" ? allFriends
    : []

  return (
    <>
      <div className="sidebar-header">
        <span>Friends</span>
      </div>
      <div className="friends-tabs">
        <button
          type="button"
          className={friendsTab === "online" ? "active" : ""}
          onClick={() => setFriendsTab("online")}
        >
          Online — {friends.filter(f => f.online).length}
        </button>
        <button
          type="button"
          className={friendsTab === "all" ? "active" : ""}
          onClick={() => setFriendsTab("all")}
        >
          All — {friends.length}
        </button>
        <button
          type="button"
          className={friendsTab === "pending" ? "active" : ""}
          onClick={() => setFriendsTab("pending")}
        >
          Pending — {pendingIncoming.length}
        </button>
      </div>
      <div className="sidebar-section add-friend-section">
        <h3>Add friend</h3>
        <div className="add-friend-stack">
          <input
            placeholder="Username"
            value={addFriendName}
            onChange={(e) => setAddFriendName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSendFriendRequest()}
          />
          <button type="button" className="btn btn-primary" onClick={onSendFriendRequest}>
            Send friend request
          </button>
        </div>
      </div>
      {friendsTab !== "pending" && (
        <div className="sidebar-section" style={{ paddingTop: 0 }}>
          <input
            className="sidebar-input"
            placeholder="Search friends"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
          />
        </div>
      )}
      <div className="sidebar-scroll">
        {friendsTab === "pending" ? (
          <>
            {pendingIncoming.length > 0 && (
              <>
                <h3 className="friends-group-label">Incoming</h3>
                {pendingIncoming.map((p) => (
                  <div key={p.username} className="friend-row pending">
                    <UserAvatar
                      profile={profiles[p.username]}
                      username={p.username}
                      className="friend-avatar"
                      size={36}
                    />
                    <div className="friend-info">
                      <div className="friend-name">{p.username}</div>
                      <div className="friend-status">Incoming request</div>
                    </div>
                    <div className="friend-actions">
                      <button type="button" className="btn btn-sm btn-success" onClick={() => onAcceptRequest(p.username)}>
                        ✓
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => onDeclineRequest(p.username)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {pendingOutgoing.length > 0 && (
              <>
                <h3 className="friends-group-label">Outgoing</h3>
                {pendingOutgoing.map((p) => (
                  <div key={p.username} className="friend-row pending">
                    <UserAvatar
                      profile={profiles[p.username]}
                      username={p.username}
                      className="friend-avatar"
                      size={36}
                    />
                    <div className="friend-info">
                      <div className="friend-name">{p.username}</div>
                      <div className="friend-status">Pending</div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancelRequest(p.username)}>
                      Cancel
                    </button>
                  </div>
                ))}
              </>
            )}
            {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
              <div className="empty-state">No pending requests</div>
            )}
          </>
        ) : list.length === 0 ? (
          <div className="empty-state">
            {friendsTab === "online" ? "No friends online" : "No friends yet — add someone!"}
          </div>
        ) : (
          list.map((f) => (
            <div
              key={f.username}
              className={`friend-row ${selectedFriend === f.username ? "active" : ""}`}
              onClick={() => onSelectFriend(f)}
            >
              <div className="friend-avatar-wrap">
                <UserAvatar
                  profile={profiles[f.username]}
                  username={f.username}
                  className="friend-avatar"
                  size={36}
                />
                <span className={`status-dot ${f.online ? "online" : "offline"}`} />
              </div>
              <div className="friend-info">
                <div className="friend-name">{f.username}</div>
                <div className="friend-status">{f.online ? "Online" : "Offline"}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
