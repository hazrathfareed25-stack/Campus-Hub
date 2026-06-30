const express = require('express');
const router = express.Router();

const CATEGORIES = [
  { id: 'books', label: 'Books & Notes', emoji: '📚' },
  { id: 'lab', label: 'Lab Equipment', emoji: '🧪' },
  { id: 'calculators', label: 'Calculators', emoji: '🧮' },
  { id: 'cycles', label: 'Cycles', emoji: '🚲' },
  { id: 'hostel', label: 'Hostel Items', emoji: '🛏️' },
  { id: 'electronics', label: 'Electronics', emoji: '🎧' },
  { id: 'furniture', label: 'Furniture', emoji: '🪑' },
  { id: 'sports', label: 'Sports Equipment', emoji: '⚽' },
  { id: 'clothing', label: 'Clothing', emoji: '👕' },
  { id: 'accessories', label: 'Accessories', emoji: '🎒' },
  { id: 'stationery', label: 'Stationery', emoji: '✏️' },
  { id: 'merch', label: 'College Merch', emoji: '🏅' },
  { id: 'projects', label: 'Project Kits', emoji: '🔧' },
  { id: 'other', label: 'Other', emoji: '📦' }
];

router.get('/', (req, res) => res.json({ categories: CATEGORIES }));

module.exports = router;
