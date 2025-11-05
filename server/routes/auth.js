import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const uid = (new (await import('mongoose')).default.Types.ObjectId()).toString();
    const user = await User.create({ uid, email, displayName: name, passwordHash });
    const token = signToken({ uid: user.uid, email: user.email });
    res.status(201).json({ token, user: { uid: user.uid, email: user.email, displayName: user.displayName } });
  } catch (e) {
    res.status(400).json({ error: 'Signup failed', details: e?.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = signToken({ uid: user.uid, email: user.email });
    res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL } });
  } catch (e) {
    res.status(400).json({ error: 'Login failed', details: e?.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ uid: payload.uid }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
