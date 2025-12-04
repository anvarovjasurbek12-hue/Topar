import { Router } from "express"
import { Deal, Listing } from "../db/mongodb.js"
import { authMiddleware } from "../middleware/auth.js"

const router = Router()

// Create safe deal
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { listingId, deliveryOption, amount } = req.body

    const listing = await Listing.findById(listingId)
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" })
    }

    if (!listing.isSafeDeal) {
      return res.status(400).json({ error: "Safe deal not available for this listing" })
    }

    if (listing.sellerId.toString() === req.user.id) {
      return res.status(400).json({ error: "Cannot buy your own listing" })
    }

    const deal = new Deal({
      listingId,
      buyerId: req.user.id,
      sellerId: listing.sellerId,
      amount: amount || listing.price,
      deliveryOption,
      status: "pending",
    })

    await deal.save()

    listing.status = "reserved"
    await listing.save()

    res.status(201).json({ ...deal.toObject(), id: deal._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user's deals
router.get("/", authMiddleware, async (req, res) => {
  try {
    const deals = await Deal.find({
      $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("listingId", "title images price")
      .populate("buyerId", "firstName username telegram")
      .populate("sellerId", "firstName username telegram")

    const enrichedDeals = deals.map((deal) => ({
      ...deal.toObject(),
      id: deal._id,
      listing: deal.listingId
        ? {
            id: deal.listingId._id,
            title: deal.listingId.title,
            images: deal.listingId.images,
            price: deal.listingId.price,
          }
        : null,
      buyer: deal.buyerId
        ? {
            id: deal.buyerId._id,
            firstName: deal.buyerId.firstName,
            username: deal.buyerId.username,
            telegram: deal.buyerId.telegram,
          }
        : null,
      seller: deal.sellerId
        ? {
            id: deal.sellerId._id,
            firstName: deal.sellerId.firstName,
            username: deal.sellerId.username,
            telegram: deal.sellerId.telegram,
          }
        : null,
      role: deal.buyerId._id.toString() === req.user.id ? "buyer" : "seller",
    }))

    res.json(enrichedDeals)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single deal
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("listingId")
      .populate("buyerId", "-password")
      .populate("sellerId", "-password")

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" })
    }

    if (deal.buyerId._id.toString() !== req.user.id && deal.sellerId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" })
    }

    res.json({
      ...deal.toObject(),
      id: deal._id,
      role: deal.buyerId._id.toString() === req.user.id ? "buyer" : "seller",
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Pay for deal
router.post("/:id/pay", authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" })
    }

    if (deal.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only buyer can pay" })
    }

    if (deal.status !== "pending") {
      return res.status(400).json({ error: "Deal already processed" })
    }

    deal.status = "paid"
    deal.updatedAt = new Date()
    await deal.save()

    res.json({ ...deal.toObject(), id: deal._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Mark as shipped (seller)
router.post("/:id/ship", authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" })
    }

    if (deal.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only seller can mark as shipped" })
    }

    if (deal.status !== "paid") {
      return res.status(400).json({ error: "Deal must be paid first" })
    }

    deal.status = "shipped"
    deal.updatedAt = new Date()
    await deal.save()

    res.json({ ...deal.toObject(), id: deal._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Confirm delivery (buyer)
router.post("/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" })
    }

    if (deal.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only buyer can confirm" })
    }

    if (deal.status !== "shipped") {
      return res.status(400).json({ error: "Deal must be shipped first" })
    }

    deal.status = "completed"
    deal.updatedAt = new Date()
    await deal.save()

    await Listing.findByIdAndUpdate(deal.listingId, { status: "sold" })

    res.json({ ...deal.toObject(), id: deal._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Dispute deal
router.post("/:id/dispute", authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body
    const deal = await Deal.findById(req.params.id)

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" })
    }

    if (deal.buyerId.toString() !== req.user.id && deal.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" })
    }

    deal.status = "disputed"
    deal.disputeReason = reason
    deal.disputedBy = req.user.id
    deal.updatedAt = new Date()
    await deal.save()

    res.json({ ...deal.toObject(), id: deal._id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
