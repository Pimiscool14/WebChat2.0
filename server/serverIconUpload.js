const path = require("path")
const fs = require("fs")
const multer = require("multer")
const sharp = require("sharp")

const iconDir = path.join(__dirname, "uploads", "server-icons")
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true })
}

const ICON_MAX_MB = 75
const ICON_MAX_BYTES = ICON_MAX_MB * 1024 * 1024
const OUTPUT_SIZE = 256

const storage = multer.diskStorage({
  destination: iconDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    const safe = [".jpg", ".jpeg", ".png"].includes(ext) ? ext : ".jpg"
    cb(null, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${safe}`)
  }
})

const serverIconUpload = multer({
  storage,
  limits: { fileSize: ICON_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok =
      ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype) ||
      /\.(jpe?g|png)$/i.test(file.originalname)
    if (ok) cb(null, true)
    else cb(new Error("Server icon must be JPG, JPEG, or PNG"))
  }
})

async function processServerIcon(tempPath, serverId) {
  const outName = `${serverId}-${Date.now()}.jpg`
  const outPath = path.join(iconDir, outName)

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

  return `/uploads/server-icons/${outName}`
}

module.exports = { serverIconUpload, processServerIcon, iconDir, ICON_MAX_MB }

