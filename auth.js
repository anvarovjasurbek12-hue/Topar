import { Router } from "express"
import bcrypt from "bcryptjs"
import { User } from "../db/mongodb.js"
import { generateToken, authMiddleware } from "../middleware/auth.js"

const router = Router()

router.post("/register", async (req, res) => {
  try {
    const { email, password, username, phone, telegram } = req.body

    // Validation
    if (!email || !password || !username || !phone || !telegram) {
      return res.status(400).json({
        error: "Все поля обязательны: email, password, username, phone, telegram",
      })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Неверный формат email" })
    }

    // Validate phone format +998XXXXXXXXX
    if (!/^\+998\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "Номер телефона должен быть в формате +998XXXXXXXXX" })
    }

    // Validate telegram username @username
    if (!/^@[a-zA-Z0-9_]{5,32}$/.test(telegram)) {
      return res.status(400).json({ error: "Telegram должен быть в формате @username" })
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }],
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email уже зарегистрирован" })
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Username уже занят" })
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({ error: "Номер телефона уже зарегистрирован" })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      username,
      phone,
      telegram,
      firstName: username,
    })

    await user.save()

    // Generate token
    const token = generateToken({ id: user._id, email: user.email })

    res.status(201).json({
      success: true,
      message: "Регистрация успешна",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        telegram: user.telegram,
        firstName: user.firstName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        rating: user.rating,
        reviewCount: user.reviewCount,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: error.message })
  }
})

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" })
    }

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ error: "Пользователь не найден" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: "Неверный пароль" })
    }

    // Generate token
    const token = generateToken({ id: user._id, email: user.email })

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        telegram: user.telegram,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        rating: user.rating,
        reviewCount: user.reviewCount,
        location: user.location,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" })
    }

    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      telegram: user.telegram,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isVerified: user.isVerified,
      rating: user.rating,
      reviewCount: user.reviewCount,
      location: user.location,
      createdAt: user.createdAt,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Logout (client-side)
router.post("/logout", authMiddleware, (req, res) => {
  res.json({ success: true })
})

export default router
