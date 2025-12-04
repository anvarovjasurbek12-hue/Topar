import mongoose from "mongoose"

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://gamingalexuz_db_user:diHgU6uiLuDEt9mO@topar.gdx3kqr.mongodb.net/topar?retryWrites=true&w=majority&appName=Topar"

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("MongoDB connected successfully")
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  telegram: { type: String, required: true },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  avatar: { type: String, default: "" },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  location: {
    city: { type: String, default: "Ташкент" },
    lat: { type: Number, default: 41.2995 },
    lng: { type: Number, default: 69.2401 },
  },
  createdAt: { type: Date, default: Date.now },
})

// Listing Schema
const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, enum: ["UZS", "USD"], default: "UZS" },
  category: { type: String, required: true },
  subcategory: { type: String },
  images: [{ type: String }],
  videoUrl: { type: String },
  videoThumbnail: { type: String },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  location: {
    city: { type: String, default: "Ташкент" },
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  isUrgent: { type: Boolean, default: false },
  isVip: { type: Boolean, default: false },
  isSafeDeal: { type: Boolean, default: false },
  hasVideoVerification: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  aiSuggestedPrice: { type: Number },
  deliveryOptions: [
    {
      type: { type: String, enum: ["pickup", "courier", "pickup_point"] },
      price: { type: Number },
      description: { type: String },
    },
  ],
  status: { type: String, enum: ["active", "sold", "reserved", "expired"], default: "active" },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
})

// Deal Schema
const dealSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "shipped", "delivered", "completed", "disputed", "refunded"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// Favorite Schema
const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  createdAt: { type: Date, default: Date.now },
})

favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true })

export const User = mongoose.model("User", userSchema)
export const Listing = mongoose.model("Listing", listingSchema)
export const Deal = mongoose.model("Deal", dealSchema)
export const Message = mongoose.model("Message", messageSchema)
export const Favorite = mongoose.model("Favorite", favoriteSchema)
