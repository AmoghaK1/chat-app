import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema(
  {
    userIds: { type: [String], required: true, index: true },
    users: [
      {
        displayName: String,
        photoURL: String
      }
    ],
    lastMessage: { type: String },
    lastMessageDate: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('Chat', ChatSchema);
