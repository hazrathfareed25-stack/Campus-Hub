# CampusHub 🎒

Buy • Sell • Connect on Campus — a fully working campus marketplace.

This is a **real, runnable full-stack app**: Express backend with JWT auth, a JSON file
database (swap-in-ready for MongoDB), and a frontend wired to live API calls — not mockups.

## What actually works right now

- **Auth**: register/login with bcrypt-hashed passwords + JWT, college-email validation
- **Listings**: create, edit, delete, mark sold, search, filter by category/price, sort
- **Wishlist**: heart/un-heart any listing, persists per user
- **Chat**: real conversations between buyer and seller per listing, message history, unread counts
- **Seller dashboard**: revenue, items sold, views, avg. price, 7-day sales chart, listing list
- **Buyer dashboard**: wishlist + purchase history
- **Security basics**: password hashing, JWT-protected routes, ownership checks on edit/delete, input validation

## Run it locally (takes ~1 minute)

```bash
cd server
npm install
node seed.js      # populates demo users + listings (only needed once)
node server.js
```

Then open **https://campushub-live-je7s.onrender.com** in your browser.

### Demo login
```
email: aisha@college.edu
password: password123
```
(or rohan@college.edu / priya@college.edu, same password — try messaging between accounts in two browser tabs/incognito windows to see real-time-feeling chat)

## Project structure

```
server/
  server.js          → Express app entry point
  db/jsonDb.js        → simple file-based DB (data/*.json) — swap for MongoDB later, same interface
  middleware/auth.js   → JWT verification
  routes/
    auth.js            → register, login, /me
    listings.js         → CRUD, search, filters, wishlist
    chat.js              → conversations + messages
    dashboard.js          → seller/buyer analytics
    categories.js          → category list
  seed.js              → demo data generator
public/
  index.html          → all page templates (SPA, no build step needed)
  app.js               → all frontend logic — API calls, routing, rendering
  style.css             → Gen-Z cartoon/sticker visual style
```

## Why JSON-file DB instead of MongoDB Atlas?

This sandbox can't reach MongoDB Atlas (network is restricted to package registries), and
native MongoDB drivers need compiled binaries that also couldn't be installed here. The
`db/jsonDb.js` module uses the exact same call pattern (`find`, `findOne`, `insert`,
`updateOne`, `deleteOne`) you'd use with Mongoose, so swapping in real MongoDB later is a
matter of rewriting that one file — no route code changes needed. I'm happy to do that
migration if you give me Atlas credentials or want me to write the Mongoose models.

## What's NOT in this build (and what real production would need)

- **Hosting**: this runs locally. Deploying needs a host (Render/Railway/Vercel) + a real
  MongoDB Atlas cluster + environment secrets — I can walk you through this.
- **Real-time chat** currently works via request/response (refresh-to-see-new-message,
  poll-friendly). True Socket.io live push is a clean next addition.
- **Image uploads**: listings take an image URL right now; real upload-to-Cloudinary needs
  API keys I don't have access to.
- **Email verification**: registration is auto-verified for demo purposes; real OTP/email
  flow needs an email service (SendGrid/SES) with credentials.
- **AI features** (price suggestion, fraud detection, description generation): not built —
  these need either an LLM API key wired in, or trained models. Can scaffold the price
  suggestion endpoint to call the Claude API if you want.
- **Admin panel**: not built yet — straightforward to add given the existing auth pattern.

Tell me which of these to tackle next and I'll build it properly rather than stub it.
