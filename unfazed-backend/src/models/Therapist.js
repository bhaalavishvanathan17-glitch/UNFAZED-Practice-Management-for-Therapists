const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    enum: [30, 45, 60, 90],
    default: 60,
  },
  priceInr: {
    type: Number,
    required: true,
    min: [0, 'Price must be positive'],
    default: 1500,
  },
  mode: {
    type: String,
    enum: ['video', 'in-person', 'both'],
    default: 'video',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

const therapistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password hash in regular queries
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  headline: {
    type: String,
    default: 'Licensed Clinical Psychologist & Counselor',
    trim: true,
  },
  bio: {
    type: String,
    default: '',
  },
  specializations: {
    type: [String],
    default: ['Anxiety & Depression', 'Cognitive Behavioral Therapy (CBT)', 'Relationship Counseling'],
  },
  languages: {
    type: [String],
    default: ['English', 'Hindi'],
  },
  experienceYears: {
    type: Number,
    default: 5,
    min: 0,
  },
  qualifications: {
    type: [String],
    default: ['M.Sc. Clinical Psychology', 'RCI Licensed'],
  },
  city: {
    type: String,
    default: 'New Delhi, India',
    trim: true,
  },
  contactPhone: {
    type: String,
    default: '',
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: '',
  },
  services: {
    type: [serviceSchema],
    default: [
      {
        title: 'Individual Therapy',
        description: 'One-on-one tailored counseling session targeting personal growth, stress, and anxiety.',
        durationMinutes: 60,
        priceInr: 1500,
        mode: 'video',
        isActive: true,
      },
      {
        title: 'Couples Consultation',
        description: 'Relationship guidance focusing on interpersonal dynamics and communication patterns.',
        durationMinutes: 60,
        priceInr: 2200,
        mode: 'video',
        isActive: true,
      }
    ],
  },
  subscriptionTier: {
    type: String,
    enum: ['starter', 'professional', 'clinic'],
    default: 'starter',
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  // Tier usage limits – values derived from the linked Subscription tier
  sessionQuota: {
    type: Number,
    default: 0, // 0 means no explicit cap; middleware can enforce based on tier
  },
  packageQuota: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Hash password before saving
therapistSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
therapistSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Return safe profile object without sensitive internals
therapistSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Therapist', therapistSchema);
