import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { LANGUAGES, ROLE_VALUES } from './_shared.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false }, // absent for Google-only users
    googleId: { type: String, index: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ROLE_VALUES, required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' }, // org_admin + employee only
    avatar: { url: String, publicId: String },
    preferredLanguage: { type: String, enum: LANGUAGES, default: 'en' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ role: 1, organization: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password);
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
