export default function ImageLightbox({ src, onClose }) {
  if (!src) return null

  return (
    <div className="image-lightbox" onClick={onClose} role="presentation">
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
      <p className="lightbox-hint">Click anywhere to close</p>
    </div>
  )
}
