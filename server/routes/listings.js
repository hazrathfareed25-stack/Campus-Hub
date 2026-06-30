const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/jsonDb');
const { authRequired, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/listings  - search + filter + sort
router.get('/', optionalAuth, (req, res) => {
  const { q, category, minPrice, maxPrice, condition, sort } = req.query;
  let listings = db.find('listings', l => l.status !== 'deleted');

  if (q) {
    const term = q.toLowerCase();
    listings = listings.filter(l =>
      l.title.toLowerCase().includes(term) || l.description.toLowerCase().includes(term)
    );
  }
  if (category) listings = listings.filter(l => l.category === category);
  if (condition) listings = listings.filter(l => l.condition === condition);
  if (minPrice) listings = listings.filter(l => l.price >= Number(minPrice));
  if (maxPrice) listings = listings.filter(l => l.price <= Number(maxPrice));

  switch (sort) {
    case 'price_low': listings.sort((a, b) => a.price - b.price); break;
    case 'price_high': listings.sort((a, b) => b.price - a.price); break;
    case 'oldest': listings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'popular': listings.sort((a, b) => b.views - a.views); break;
    default: listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest
  }

  // attach seller name + wishlist flag
  const users = db.readAll('users');
  const wishlist = req.user ? db.find('wishlist', w => w.userId === req.user.id).map(w => w.listingId) : [];

  const enriched = listings.map(l => {
    const seller = users.find(u => u.id === l.sellerId);
    return {
      ...l,
      sellerName: seller ? seller.name : 'Unknown',
      sellerTrust: seller ? seller.trustScore : null,
      wishlisted: wishlist.includes(l.id)
    };
  });

  res.json({ listings: enriched, total: enriched.length });
});

// GET /api/listings/:id
router.get('/:id', optionalAuth, (req, res) => {
  const listing = db.findOne('listings', l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  // increment views (skip if seller views own listing)
  if (!req.user || req.user.id !== listing.sellerId) {
    db.updateOne('listings', l => l.id === listing.id, l => ({ ...l, views: (l.views || 0) + 1 }));
  }

  const updated = db.findOne('listings', l => l.id === req.params.id);
  const seller = db.findOne('users', u => u.id === updated.sellerId);
  const related = db.find('listings', l => l.category === updated.category && l.id !== updated.id).slice(0, 4);

  res.json({
    listing: { ...updated, sellerName: seller?.name, sellerTrust: seller?.trustScore, sellerHostel: seller?.hostel },
    related
  });
});

// POST /api/listings - create (auth required)
router.post('/', authRequired, (req, res) => {
  const { title, description, price, category, condition, negotiable, location, images } = req.body;

  if (!title || !price || !category) {
    return res.status(400).json({ error: 'Title, price and category are required.' });
  }
  if (Number(price) <= 0) {
    return res.status(400).json({ error: 'Price must be greater than 0.' });
  }

  const listing = {
    id: uuidv4(),
    sellerId: req.user.id,
    title,
    description: description || '',
    price: Number(price),
    category,
    condition: condition || 'good',
    negotiable: !!negotiable,
    location: location || '',
    images: images && images.length ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=60'],
    views: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  db.insert('listings', listing);
  res.status(201).json({ listing });
});

// PUT /api/listings/:id - update (only owner)
router.put('/:id', authRequired, (req, res) => {
  const listing = db.findOne('listings', l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.sellerId !== req.user.id) return res.status(403).json({ error: 'You can only edit your own listings.' });

  const updated = db.updateOne('listings', l => l.id === req.params.id, l => ({
    ...l,
    ...req.body,
    id: l.id,
    sellerId: l.sellerId,
    updatedAt: new Date().toISOString()
  }));
  res.json({ listing: updated });
});

// DELETE /api/listings/:id - only owner
router.delete('/:id', authRequired, (req, res) => {
  const listing = db.findOne('listings', l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.sellerId !== req.user.id) return res.status(403).json({ error: 'You can only delete your own listings.' });

  db.deleteOne('listings', l => l.id === req.params.id);
  res.json({ success: true });
});

// POST /api/listings/:id/mark-sold
router.post('/:id/mark-sold', authRequired, (req, res) => {
  const listing = db.findOne('listings', l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });

  const updated = db.updateOne('listings', l => l.id === req.params.id, l => ({ ...l, status: 'sold', soldAt: new Date().toISOString() }));
  res.json({ listing: updated });
});

// ----- WISHLIST -----
router.post('/:id/wishlist', authRequired, (req, res) => {
  const listing = db.findOne('listings', l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  const existing = db.findOne('wishlist', w => w.userId === req.user.id && w.listingId === req.params.id);
  if (existing) {
    db.deleteOne('wishlist', w => w.userId === req.user.id && w.listingId === req.params.id);
    return res.json({ wishlisted: false });
  }
  db.insert('wishlist', { id: uuidv4(), userId: req.user.id, listingId: req.params.id, createdAt: new Date().toISOString() });
  res.json({ wishlisted: true });
});

module.exports = router;
