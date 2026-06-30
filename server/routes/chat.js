const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/jsonDb');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function getOrCreateConversation(listingId, buyerId, sellerId) {
  let convo = db.findOne('conversations', c => c.listingId === listingId && c.buyerId === buyerId && c.sellerId === sellerId);
  if (!convo) {
    convo = {
      id: uuidv4(),
      listingId,
      buyerId,
      sellerId,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    };
    db.insert('conversations', convo);
  }
  return convo;
}

// GET /api/chat/conversations - all conversations for logged in user
router.get('/conversations', authRequired, (req, res) => {
  const all = db.find('conversations', c => c.buyerId === req.user.id || c.sellerId === req.user.id);
  const users = db.readAll('users');
  const listings = db.readAll('listings');
  const messages = db.readAll('messages');

  const enriched = all.map(c => {
    const otherUserId = c.buyerId === req.user.id ? c.sellerId : c.buyerId;
    const otherUser = users.find(u => u.id === otherUserId);
    const listing = listings.find(l => l.id === c.listingId);
    const convoMessages = messages.filter(m => m.conversationId === c.id);
    const lastMsg = convoMessages[convoMessages.length - 1];
    const unread = convoMessages.filter(m => m.senderId !== req.user.id && !m.read).length;
    return {
      ...c,
      otherUserName: otherUser?.name || 'Unknown',
      listingTitle: listing?.title || 'Listing removed',
      listingImage: listing?.images?.[0],
      lastMessage: lastMsg?.text || '',
      unreadCount: unread
    };
  }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

  res.json({ conversations: enriched });
});

// POST /api/chat/start - start or get conversation for a listing
router.post('/start', authRequired, (req, res) => {
  const { listingId } = req.body;
  const listing = db.findOne('listings', l => l.id === listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.sellerId === req.user.id) return res.status(400).json({ error: "You can't message yourself about your own listing." });

  const convo = getOrCreateConversation(listingId, req.user.id, listing.sellerId);
  res.json({ conversation: convo });
});

// GET /api/chat/:conversationId/messages
router.get('/:conversationId/messages', authRequired, (req, res) => {
  const convo = db.findOne('conversations', c => c.id === req.params.conversationId);
  if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
  if (convo.buyerId !== req.user.id && convo.sellerId !== req.user.id) {
    return res.status(403).json({ error: 'Not your conversation.' });
  }

  // mark messages as read
  const all = db.readAll('messages');
  const updated = all.map(m => m.conversationId === req.params.conversationId && m.senderId !== req.user.id ? { ...m, read: true } : m);
  db.writeAll('messages', updated);

  const messages = db.find('messages', m => m.conversationId === req.params.conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ messages });
});

// POST /api/chat/:conversationId/messages
router.post('/:conversationId/messages', authRequired, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

  const convo = db.findOne('conversations', c => c.id === req.params.conversationId);
  if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
  if (convo.buyerId !== req.user.id && convo.sellerId !== req.user.id) {
    return res.status(403).json({ error: 'Not your conversation.' });
  }

  const message = {
    id: uuidv4(),
    conversationId: req.params.conversationId,
    senderId: req.user.id,
    text: text.trim(),
    read: false,
    createdAt: new Date().toISOString()
  };
  db.insert('messages', message);
  db.updateOne('conversations', c => c.id === req.params.conversationId, c => ({ ...c, lastMessageAt: message.createdAt }));

  res.status(201).json({ message });
});

module.exports = router;
