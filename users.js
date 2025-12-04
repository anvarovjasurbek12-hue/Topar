import { Router } from "express"
import { User, Listing, Favorite } from "../db/mongodb.js"
import { authMiddleware, optionalAuth } from "../middleware/auth.js"

const router = Router()

// Get user profile
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const listings = await Listing.find({ sellerId: user._id, status: "active" }).limit(10)

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      telegram: user.telegram,
      avatar: user.avatar,
      isVerified: user.isVerified,
      rating: user.rating,
      reviewCount: user.reviewCount,
      location: user.location,
      createdAt: user.createdAt,
      listingsCount: listings.length,
      listings: listings.map((l) => ({ ...l.toObject(), id: l._id })),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, avatar, location } = req.body

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, avatar, location },
      { new: true },
    ).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ ...user.toObject(), id: user._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get favorites
router.get("/me/favorites", authMiddleware, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).populate({
      path: "listingId",
      populate: { path: "sellerId", select: "firstName username avatar isVerified rating telegram" },
    })

    const enrichedFavorites = favorites
      .filter((f) => f.listingId)
      .map((f) => ({
        ...f.listingId.toObject(),
        id: f.listingId._id,
        seller: f.listingId.sellerId
          ? {
              id: f.listingId.sellerId._id,
              firstName: f.listingId.sellerId.firstName,
              username: f.listingId.sellerId.username,
              avatar: f.listingId.sellerId.avatar,
              isVerified: f.listingId.sellerId.isVerified,
              rating: f.listingId.sellerId.rating,
              telegram: f.listingId.sellerId.telegram,
            }
          : null,
      }))

    res.json(enrichedFavorites)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user's listings
router.get("/:id/listings", async (req, res) => {
  try {
    const { status = "active" } = req.query

    const query = { sellerId: req.params.id }
    if (status !== "all") query.status = status

    const listings = await Listing.find(query).sort({ createdAt: -1 })

    res.json(listings.map((l) => ({ ...l.toObject(), id: l._id })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Request verification
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { selfieUrl } = req.body

    if (!selfieUrl) {
      return res.status(400).json({ error: "Selfie required" })
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isVerified: true, verifiedAt: new Date() },
      { new: true },
    ).select("-password")

    res.json({
      success: true,
      message: "Verification request submitted",
      user: { ...user.toObject(), id: user._id },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
