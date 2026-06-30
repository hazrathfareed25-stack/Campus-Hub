const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/jsonDb');
const { authRequired, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Only allow college emails (configurable). For demo, require .edu / .ac.in style or any email containing "college"/"edu"
function isValidCollegeEmail(email) {
  return /^[^\s@]+@[^\s@]+\.(edu|ac\.in|edu\.in)$/i.test(email) || /college/i.test(email);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, hostel } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!isValidCollegeEmail(email)) {
    return res.status(400).json({ error: 'Please use a valid college email address (e.g. you@college.edu).' });
  }

  const existing = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    hostel: hostel || '',
    verified: true, // demo: auto-verified. In production this would require email OTP confirmation.
    trustScore: 4.8,
    role: 'student',
    createdAt: new Date().toISOString()
  };
  db.insert('users', user);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _pw, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'No account found with that email.' });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

module.exports = router;
