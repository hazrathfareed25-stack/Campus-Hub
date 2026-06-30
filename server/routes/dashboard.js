const express = require('express');
const db = require('../db/jsonDb');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/seller - seller analytics
router.get('/seller', authRequired, (req, res) => {
  const myListings = db.find('listings', l => l.sellerId === req.user.id);
  const sold = myListings.filter(l => l.status === 'sold');
  const active = myListings.filter(l => l.status === 'active');

  const totalRevenue = sold.reduce((sum, l) => sum + l.price, 0);
  const avgPrice = sold.length ? Math.round(totalRevenue / sold.length) : 0;
  const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);

  const wishlistAll = db.readAll('wishlist');
  const totalWishlistSaves = myListings.reduce((sum, l) => sum + wishlistAll.filter(w => w.listingId === l.id).length, 0);

  // category breakdown
  const byCategory = {};
  myListings.forEach(l => {
    byCategory[l.category] = (byCategory[l.category] || 0) + 1;
  });
  const bestCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const topSelling = [...myListings].sort((a, b) => (b.views || 0) - (a.views || 0))[0] || null;

  // last 7 days sales (by soldAt)
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const daySales = sold.filter(l => l.soldAt && l.soldAt.slice(0, 10) === dateStr);
    return { date: dateStr, revenue: daySales.reduce((s, l) => s + l.price, 0), count: daySales.length };
  });

  res.json({
    overview: {
      totalRevenue,
      avgPrice,
      productsSold: sold.length,
      productsListed: myListings.length,
      activeListings: active.length,
      totalViews,
      totalWishlistSaves
    },
    bestCategory,
    topSelling,
    salesGraph: last7,
    listings: myListings
  });
});

// GET /api/dashboard/buyer
router.get('/buyer', authRequired, (req, res) => {
  const wishlist = db.find('wishlist', w => w.userId === req.user.id);
  const listings = db.readAll('listings');
  const wishlistItems = wishlist.map(w => listings.find(l => l.id === w.listingId)).filter(Boolean);

  // "purchases" = conversations where this user is buyer and listing is sold to them (demo: just sold listings they chatted about)
  const myConvos = db.find('conversations', c => c.buyerId === req.user.id);
  const purchaseHistory = myConvos
    .map(c => listings.find(l => l.id === c.listingId && l.status === 'sold'))
    .filter(Boolean);

  res.json({
    wishlist: wishlistItems,
    purchaseHistory,
    activeChats: myConvos.length
  });
});

module.exports = router;
