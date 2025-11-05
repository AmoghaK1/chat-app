import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    text: { type: String, required: true },
    senderId: { type: String, required: true, index: true },
    sentDate: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

export default mongoose.model('Message', MessageSchema);
