const path = require("path")
const fs = require("fs")
const multer = require("multer")

const uploadDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const MIME_TO_TYPE = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "audio/mp3": "audio"
}

const EXT_TO_TYPE = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".mp4": "video",
  ".mp3": "audio",
  ".mpeg": "audio"
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ""
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})

// 500 MB — high for self-hosted use, below 1 GB for stability (timeouts, disk, memory)
const MAX_UPLOAD_MB = 500
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, _file, cb) => cb(null, true)
})

function mediaTypeFromFile(mimetype, filename) {
  if (MIME_TO_TYPE[mimetype]) return MIME_TO_TYPE[mimetype]
  const ext = path.extname(filename || "").toLowerCase()
  if (EXT_TO_TYPE[ext]) return EXT_TO_TYPE[ext]
  return "file"
}

module.exports = {
  upload,
  uploadDir,
  MIME_TO_TYPE,
  mediaTypeFromFile,
  MAX_UPLOAD_MB
}
