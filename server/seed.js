const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/jsonDb');

const users = [
  { id: uuidv4(), name: 'Aisha Verma', email: 'aisha@college.edu', password: bcrypt.hashSync('password123', 10), hostel: 'Block C', verified: true, trustScore: 4.9, role: 'student', createdAt: new Date().toISOString() },
  { id: uuidv4(), name: 'Rohan Mehta', email: 'rohan@college.edu', password: bcrypt.hashSync('password123', 10), hostel: 'Block A', verified: true, trustScore: 4.7, role: 'student', createdAt: new Date().toISOString() },
  { id: uuidv4(), name: 'Priya Nair', email: 'priya@college.edu', password: bcrypt.hashSync('password123', 10), hostel: 'Girls Hostel 2', verified: true, trustScore: 5.0, role: 'student', createdAt: new Date().toISOString() }
];
db.writeAll('users', users);

const listings = [
  { id: uuidv4(), sellerId: users[0].id, title: 'Scientific Calculator fx-991', description: 'Barely used, all functions working perfectly. Great for engineering courses.', price: 650, category: 'calculators', condition: 'like-new', negotiable: true, location: 'Block C Hostel', images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=60'], views: 23, status: 'active', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: uuidv4(), sellerId: users[1].id, title: 'Study Desk Lamp', description: 'Adjustable LED lamp, 3 brightness modes. Moving out, must sell.', price: 300, category: 'hostel', condition: 'good', negotiable: true, location: 'Girls Hostel 2', images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=60'], views: 11, status: 'active', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: uuidv4(), sellerId: users[2].id, title: 'Mountain Bicycle', description: 'Used for 1 year, well maintained, gear shifting smooth. New tires.', price: 2200, category: 'cycles', condition: 'good', negotiable: true, location: 'Near Gate 2', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=60'], views: 45, status: 'active', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: uuidv4(), sellerId: users[0].id, title: 'Mini Fridge 45L', description: '1 year old, cools great, perfect for hostel rooms.', price: 3800, category: 'electronics', condition: 'good', negotiable: false, location: 'Block A', images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=60'], views: 67, status: 'active', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: uuidv4(), sellerId: users[1].id, title: 'Calculus II Textbook + Handwritten Notes', description: 'Complete notes from topper, highlighted important sections. Textbook in good condition.', price: 450, category: 'books', condition: 'good', negotiable: true, location: 'Block A', images: ['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500&q=60'], views: 88, status: 'sold', soldAt: new Date(Date.now() - 259200000).toISOString(), createdAt: new Date(Date.now() - 432000000).toISOString() },
  { id: uuidv4(), sellerId: users[2].id, title: 'Badminton Racket Set (2 rackets + shuttlecocks)', description: 'Yonex rackets, lightly used. Comes with a carry bag.', price: 800, category: 'sports', condition: 'like-new', negotiable: true, location: 'Girls Hostel 2', images: ['https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500&q=60'], views: 19, status: 'active', createdAt: new Date(Date.now() - 10800000).toISOString() }
];
db.writeAll('listings', listings);

db.writeAll('wishlist', []);
db.writeAll('conversations', []);
db.writeAll('messages', []);

console.log('✅ Seed data created:');
console.log(`   Users: ${users.length} (try login: aisha@college.edu / password123)`);
console.log(`   Listings: ${listings.length}`);
