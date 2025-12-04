import { Router } from "express"
import { Listing, Favorite } from "../db/mongodb.js"
import { authMiddleware, optionalAuth } from "../middleware/auth.js"

const router = Router()

// Get all listings (feed)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { category, minPrice, maxPrice, city, sort, isUrgent, page = 1, limit = 20 } = req.query

    const query = { status: "active" }

    if (category) query.category = category
    if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) }
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) }
    if (city) query["location.city"] = city
    if (isUrgent === "true") query.isUrgent = true

    let sortOption = { createdAt: -1 }
    if (sort === "price_asc") sortOption = { price: 1 }
    if (sort === "price_desc") sortOption = { price: -1 }
    if (sort === "views") sortOption = { views: -1 }

    const total = await Listing.countDocuments(query)
    const listings = await Listing.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("sellerId", "firstName username avatar isVerified rating reviewCount telegram")

    // Check favorites if user is logged in
    let favoriteIds = []
    if (req.user) {
      const favorites = await Favorite.find({ userId: req.user.id })
      favoriteIds = favorites.map((f) => f.listingId.toString())
    }

    const enrichedListings = listings.map((listing) => ({
      ...listing.toObject(),
      id: listing._id,
      seller: listing.sellerId
        ? {
            id: listing.sellerId._id,
            firstName: listing.sellerId.firstName,
            username: listing.sellerId.username,
            avatar: listing.sellerId.avatar,
            isVerified: listing.sellerId.isVerified,
            rating: listing.sellerId.rating,
            reviewCount: listing.sellerId.reviewCount,
            telegram: listing.sellerId.telegram,
          }
        : null,
      isFavorite: favoriteIds.includes(listing._id.toString()),
    }))

    res.json({
      listings: enrichedListings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single listing
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "sellerId",
      "firstName lastName username avatar isVerified rating reviewCount telegram location createdAt",
    )

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" })
    }

    // Increment views
    listing.views += 1
    await listing.save()

    let isFavorite = false
    if (req.user) {
      const fav = await Favorite.findOne({ userId: req.user.id, listingId: listing._id })
      isFavorite = !!fav
    }

    res.json({
      ...listing.toObject(),
      id: listing._id,
      seller: listing.sellerId
        ? {
            id: listing.sellerId._id,
            firstName: listing.sellerId.firstName,
            lastName: listing.sellerId.lastName,
            username: listing.sellerId.username,
            avatar: listing.sellerId.avatar,
            isVerified: listing.sellerId.isVerified,
            rating: listing.sellerId.rating,
            reviewCount: listing.sellerId.reviewCount,
            telegram: listing.sellerId.telegram,
            createdAt: listing.sellerId.createdAt,
            location: listing.sellerId.location,
          }
        : null,
      isFavorite,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create listing
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      currency,
      category,
      subcategory,
      images,
      videoUrl,
      location,
      isUrgent,
      isSafeDeal,
      deliveryOptions,
    } = req.body

    if (!title || !price || !category) {
      return res.status(400).json({ error: "Title, price and category required" })
    }

    const listing = new Listing({
      title,
      description,
      price: Number(price),
      currency: currency || "UZS",
      category,
      subcategory,
      images: images || [],
      videoUrl,
      sellerId: req.user.id,
      location,
      isUrgent: !!isUrgent,
      isVip: false,
      isSafeDeal: isSafeDeal !== false,
      hasVideoVerification: !!videoUrl,
      deliveryOptions: deliveryOptions || [{ type: "pickup", price: 0, description: "Самовывоз" }],
      expiresAt: isUrgent ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
    })

    await listing.save()
    res.status(201).json({ ...listing.toObject(), id: listing._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update listing
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" })
    }

    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" })
    }

    Object.assign(listing, req.body)
    await listing.save()

    res.json({ ...listing.toObject(), id: listing._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete listing
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" })
    }

    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" })
    }

    listing.status = "deleted"
    await listing.save()

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Toggle favorite
router.post("/:id/favorite", authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" })
    }

    const existingFav = await Favorite.findOne({ userId: req.user.id, listingId: req.params.id })

    if (existingFav) {
      await Favorite.deleteOne({ _id: existingFav._id })
      listing.likes = Math.max(0, listing.likes - 1)
      await listing.save()
      res.json({ isFavorite: false })
    } else {
      await Favorite.create({ userId: req.user.id, listingId: req.params.id })
      listing.likes += 1
      await listing.save()
      res.json({ isFavorite: true })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Boost listing (VIP)
router.post("/:id/boost", authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" })
    }

    if (listing.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" })
    }

    listing.isVip = true
    await listing.save()

    res.json({ ...listing.toObject(), id: listing._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
