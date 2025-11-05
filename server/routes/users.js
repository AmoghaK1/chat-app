import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

// GET /users -> list
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ displayName: 1 }).lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:uid -> one
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid }).select('-__v').lean();
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /users -> create
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    // Never allow direct passwordHash set via profile endpoint
    delete data.passwordHash;
    const updated = await User.findOneAndUpdate(
      { uid: data.uid },
      { $set: data },
      { upsert: true, new: true }
    ).lean();
    res.status(201).json({ uid: updated.uid });
  } catch (e) {
    res.status(400).json({ error: 'Failed to upsert user', details: e?.message });
  }
});

// PUT /users/:uid -> update
router.put('/:uid', async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate({ uid: req.params.uid }, req.body, { new: true, upsert: false });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update user', details: e?.message });
  }
});

export default router;
