export default function MessageContextMenu({ x, y, onEdit, onDelete }) {
  return (
    <div
      className="user-context-menu message-context-menu"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button type="button" className="ctx-item" onClick={onEdit}>
        Edit message
      </button>
      <button type="button" className="ctx-item ctx-delete" onClick={onDelete}>
        Delete message
      </button>
    </div>
  )
}
