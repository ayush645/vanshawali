const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String },
    surname: { type: String },
    village: { type: String },
    city: { type: String },
    caste: { type: String },
    bio: { type: String },
    profilePhoto: { type: String },
    preferredLanguage: { type: String, default: 'en' },
    privacySettings: {
      treeVisibility: { type: String, enum: ['public', 'community', 'family', 'private'], default: 'family' },
      profileVisibility: { type: String, enum: ['public', 'community', 'family', 'private'], default: 'community' },
      contactVisibility: { type: String, enum: ['public', 'community', 'family', 'private'], default: 'private' },
      memoryVisibility: { type: String, enum: ['public', 'community', 'family', 'private'], default: 'family' },
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
    profileCompletion: { type: Number, default: 0 },
    
    // Social login
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    authProvider: { type: String, enum: ['email', 'google', 'apple'], default: 'email' },
    
    // Referral
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralPoints: { type: Number, default: 0 },
    
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
    subscriptionTier: { type: String, enum: ['free', 'premium', 'premium_monthly', 'premium_yearly', 'lifetime'], default: 'free' },
    subscriptionPlatform: { type: String, enum: ['ios', 'android', 'web'], default: null },
    subscriptionProductId: { type: String, default: null },
    treeRootId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TreeMember',
        default: null,
    },
    
    // Tree settings
    treeName: { type: String, default: null },
    treeIsPublic: { type: Boolean, default: false },
    
    // Push notifications
    fcmToken: { type: String, default: null },
}, { timestamps: true });

const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '10m' } 
});

const CommunitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    rules: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
    
    // Enhanced fields for community detail
    state: { type: String },
    district: { type: String },
    gotra: { type: String },
    kuldevi: { type: String },
    
    // Content sections (expandable)
    originHistory: { type: String },
    kuldeviTraditions: { type: String },
    gotraList: { type: String },
    migrationNotes: { type: String },
    notablePersonalities: { type: String },
    
    // Stats
    totalMembers: { type: Number, default: 0 },
    totalContributors: { type: Number, default: 0 },
    
    // Visibility
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
}, { timestamps: true });

const TreeMemberSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 🔥 PARENTS
  father: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TreeMember',
    default: null
  },
  mother: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TreeMember',
    default: null
  },

  // 🔥 SPOUSE
  spouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TreeMember',
    default: null
  },

  // 🔥 BASIC INFO
  name: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  occupation: { type: String },
  bio: { type: String },

  // 🔥 SOFT DELETE (for UI placeholders)
  isAlive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }

}, { timestamps: true });

const MemorySchema = new mongoose.Schema({
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    imageUrl: { type: String, required: true },       // Cloudinary secure_url
     imagePublicId: { type: String, required: true }, // delete later

    personName: { type: String, required: true },
    whoIsThis: { type: String },
    description: { type: String },
}, { timestamps: true });

const SubscriptionPlanSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Premium Monthly"
    planId: { type: String, required: true, unique: true }, // e.g., "premium_monthly"
    price: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    interval: { type: String, enum: ['month', 'year', 'lifetime'], required: true },
    features: [{ type: String }], // Array of features
    description: { type: String },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    razorpayPlanId: { type: String }, // For Razorpay integration
}, { timestamps: true });

const SubscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planName: { type: String, default: 'Premium' },
    amount: { type: Number, required: true },
    
    // Razorpay (web payments)
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    
    // In-App Purchase fields
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
    productId: { type: String },
    transactionId: { type: String },
    receipt: { type: String },
    
    status: { type: String, enum: ['pending', 'active', 'cancelled', 'expired'], default: 'pending' },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    cancelledAt: { type: Date },
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['tree_update', 'memory_posted', 'community_join', 'community_update', 'referral_earned', 'correction_status', 'subscription', 'announcement', 'system'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    relatedModel: { type: String, enum: ['TreeMember', 'Memory', 'Community', 'User', 'CorrectionRequest'] },
}, { timestamps: true });

const AnnouncementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetAudience: { type: String, enum: ['all', 'free', 'premium'], default: 'all' },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
}, { timestamps: true });

const ReferralSchema = new mongoose.Schema({
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pointsEarned: { type: Number, default: 10 },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { timestamps: true });

const CorrectionRequestSchema = new mongoose.Schema({
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['community', 'profile', 'gotra', 'village'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetName: { type: String, required: true },
    
    // Fields being corrected
    fields: [{
        fieldName: { type: String, required: true },
        currentValue: { type: String },
        proposedValue: { type: String, required: true },
        reason: { type: String },
    }],
    
    // Attachments
    proofDocuments: [{ type: String }], // URLs to uploaded documents
    
    // Status tracking
    status: { type: String, enum: ['pending', 'need_info', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String },
    reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = {
    User: mongoose.model('User', UserSchema),
    OTP: mongoose.model('OTP', OTPSchema),
    Community: mongoose.model('Community', CommunitySchema),
    TreeMember: mongoose.model('TreeMember', TreeMemberSchema),
    Memory: mongoose.model('Memory', MemorySchema),
    SubscriptionPlan: mongoose.model('SubscriptionPlan', SubscriptionPlanSchema),
    Subscription: mongoose.model('Subscription', SubscriptionSchema),
    Notification: mongoose.model('Notification', NotificationSchema),
    Announcement: mongoose.model('Announcement', AnnouncementSchema),
    Referral: mongoose.model('Referral', ReferralSchema),
    CorrectionRequest: mongoose.model('CorrectionRequest', CorrectionRequestSchema),
};