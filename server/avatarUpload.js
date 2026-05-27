const path = require("path")
const fs = require("fs")
const multer = require("multer")
const sharp = require("sharp")

const avatarDir = path.join(__dirname, "uploads", "avatars")
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true })
}

const AVATAR_MAX_MB = 75
const AVATAR_MAX_BYTES = AVATAR_MAX_MB * 1024 * 1024
const OUTPUT_SIZE = 256

const storage = multer.diskStorage({
  destination: avatarDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    const safe = [".jpg", ".jpeg", ".png"].includes(ext) ? ext : ".jpg"
    cb(null, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${safe}`)
  }
})

const avatarUpload = multer({
  storage,
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok =
      ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype) ||
      /\.(jpe?g|png)$/i.test(file.originalname)
    if (ok) cb(null, true)
    else cb(new Error("Avatar must be JPG, JPEG, or PNG"))
  }
})

async function processAvatar(tempPath, username) {
  const outName = `${username}-${Date.now()}.jpg`
  const outPath = path.join(avatarDir, outName)

  await sharp(tempPath)
    .rotate()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "centre" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath)

  try {
    fs.unlinkSync(tempPath)
  } catch {
    /* ignore */
  }

  return `/uploads/avatars/${outName}`
}

module.exports = { avatarUpload, processAvatar, avatarDir }
