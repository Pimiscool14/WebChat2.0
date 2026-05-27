import { avatarSrc, initialsFrom } from "./profileUtils.js"

export default function UserAvatar({ profile, username, className = "msg-avatar", size }) {
  const label = profile?.displayName?.trim() || username
  const src = avatarSrc(profile)
  const style = size ? { width: size, height: size } : undefined

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${className} has-image`}
        style={style}
      />
    )
  }

  return (
    <div className={className} style={style}>
      {initialsFrom(label)}
    </div>
  )
}
