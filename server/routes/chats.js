import { Router } from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

const router = Router();

// GET /chats?uid=<uid> -> chats for a user
router.get('/', async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: 'uid is required' });
  try {
    const chats = await Chat.find({ userIds: uid }).sort({ updatedAt: -1 }).lean();
    // Transform to include id field instead of _id
    const transformed = chats.map((c) => ({ ...c, id: c._id.toString() }));
    res.json(transformed);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// POST /chats -> create chat { userIds: [], users: [] }
router.post('/', async (req, res) => {
  try {
    const chat = await Chat.create(req.body);
    res.status(201).json({ id: chat._id.toString() });
  } catch (e) {
    res.status(400).json({ error: 'Failed to create chat', details: e?.message });
  }
});

// GET /chats/:id/messages -> list messages
router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.id }).sort({ sentDate: 1 }).lean();
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /chats/:id/messages -> add message { text, senderId }
router.post('/:id/messages', async (req, res) => {
  const { text, senderId } = req.body;
  if (!text || !senderId) return res.status(400).json({ error: 'text and senderId are required' });
  try {
    const msg = await Message.create({ chatId: req.params.id, text, senderId, sentDate: new Date() });
    // Update chat last message metadata
    await Chat.findByIdAndUpdate(req.params.id, { lastMessage: text, lastMessageDate: new Date() });
    res.status(201).json({ id: msg._id.toString() });
  } catch (e) {
    res.status(400).json({ error: 'Failed to add message', details: e?.message });
  }
});

export default router;
