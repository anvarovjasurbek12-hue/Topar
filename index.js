import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"

import { connectDB } from "./db/mongodb.js"

import authRoutes from "./routes/auth.js"
import listingsRoutes from "./routes/listings.js"
import usersRoutes from "./routes/users.js"
import dealsRoutes from "./routes/deals.js"
import messagesRoutes from "./routes/messages.js"
import uploadRoutes from "./routes/upload.js"
import aiRoutes from "./routes/ai.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

connectDB()

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
)
app.use(morgan("combined"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "Topar API",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/listings", listingsRoutes)
app.use("/api/users", usersRoutes)
app.use("/api/deals", dealsRoutes)
app.use("/api/messages", messagesRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/ai", aiRoutes)

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" })
})

app.listen(PORT, () => {
  console.log(`🚀 Topar API running on port ${PORT}`)
})
