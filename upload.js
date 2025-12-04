import { Router } from "express"
import multer from "multer"
import sharp from "sharp"
import { v4 as uuidv4 } from "uuid"
import { authMiddleware } from "../middleware/auth.js"

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true)
    } else {
      cb(new Error("Only images and videos are allowed"))
    }
  },
})

// Upload images
router.post("/images", authMiddleware, upload.array("images", 10), async (req, res) => {
  try {
    const uploadedFiles = []

    for (const file of req.files) {
      // Process image with sharp
      const processed = await sharp(file.buffer)
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()

      // In production, upload to cloud storage (S3, Cloudinary, etc.)
      // For demo, return a placeholder URL
      const filename = `${uuidv4()}.jpg`

      uploadedFiles.push({
        filename,
        url: `/uploads/${filename}`,
        size: processed.length,
      })
    }

    res.json({ files: uploadedFiles })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Upload video
router.post("/video", authMiddleware, upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" })
    }

    // In production, upload to cloud storage and process with FFmpeg
    const filename = `${uuidv4()}.mp4`

    res.json({
      filename,
      url: `/uploads/${filename}`,
      size: req.file.size,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Upload avatar
router.post("/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    const processed = await sharp(req.file.buffer).resize(200, 200, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer()

    const filename = `avatar_${req.user.id}.jpg`

    res.json({
      filename,
      url: `/uploads/avatars/${filename}`,
      size: processed.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
