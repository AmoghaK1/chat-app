import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    passwordHash: { type: String },
    displayName: { type: String },
    photoURL: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String },
    address: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
