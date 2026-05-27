export default function ServerContextMenu({
  x,
  y,
  server,
  isOwner,
  onEdit,
  onDelete,
  onLeave,
  onClose
}) {
  if (!server) return null

  return (
    <div
      className="server-context-menu"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="ctx-header">{server.name}</div>

      {isOwner ? (
        <>
          <button type="button" className="ctx-item" onClick={onEdit}>
            Edit
          </button>
          <div className="ctx-divider" />
          <button type="button" className="ctx-item ctx-delete" onClick={onDelete}>
            Delete server
          </button>
        </>
      ) : (
        <>
          <button type="button" className="ctx-item" onClick={onLeave}>
            Leave server
          </button>
        </>
      )}
    </div>
  )
}

