import { Router } from "express"
import { authMiddleware } from "../middleware/auth.js"

const router = Router()

// Get conversations
router.get("/conversations", authMiddleware, (req, res) => {
  // In a real app, this would fetch from messages table
  // For demo, return mock conversations
  res.json([
    {
      id: "1",
      user: { id: "1", firstName: "Азиз", username: "aziz_seller" },
      lastMessage: "Да, товар ещё в наличии",
      time: new Date(),
      unread: 2,
      listingId: "1",
    },
  ])
})

// Get messages for a conversation
router.get("/:userId", authMiddleware, (req, res) => {
  // Mock messages
  res.json([
    {
      id: "1",
      senderId: req.params.userId,
      content: "Здравствуйте! Товар ещё в наличии?",
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      senderId: req.user.id,
      content: "Да, в наличии",
      createdAt: new Date(Date.now() - 3000000),
    },
  ])
})

// Send message
router.post("/:userId", authMiddleware, (req, res) => {
  const { content, listingId } = req.body

  // In production, save to database
  const message = {
    id: Date.now().toString(),
    senderId: req.user.id,
    receiverId: req.params.userId,
    content,
    listingId,
    createdAt: new Date(),
  }

  res.status(201).json(message)
})

export default router
