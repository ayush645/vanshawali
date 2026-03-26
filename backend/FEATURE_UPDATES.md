# Backend Feature Updates

## Overview
This document outlines the new authentication and dashboard features added to the Family Tree App backend.

---

## ✅ New Features Implemented

### 1. Enhanced Authentication System

#### Email Authentication
- ✅ User registration with email and password
- ✅ OTP verification via email
- ✅ OTP resend functionality with cooldown
- ✅ Secure login with password hashing
- ✅ Email verification requirement before login
- ✅ Account blocking detection

#### Social Authentication
- ✅ Google OAuth integration
- ✅ Apple Sign-In integration (iOS)
- ✅ Automatic account linking for existing emails
- ✅ New user detection for social logins

#### Profile Completion (Finish Signup)
- ✅ Full name (required)
- ✅ Surname (optional)
- ✅ Village/City (optional)
- ✅ Community/Caste selection (optional)
- ✅ Preferred language selection (required, default: English)
- ✅ Terms and Privacy acceptance (required)
- ✅ Profile completion tracking

---

### 2. Dashboard Home Features

#### Welcome & Profile Section
- ✅ Personalized greeting with user name
- ✅ Profile completion progress indicator
- ✅ Missing profile fields display
- ✅ Profile completion percentage calculation

#### Quick Actions
- ✅ Create/Continue Family Tree action card
- ✅ Community Directory access
- ✅ Memories quick access
- ✅ Dynamic action titles based on user state

#### Notifications System
- ✅ Recent notifications display (last 5)
- ✅ Unread notification count
- ✅ Notification types:
  - Tree updates
  - Memory posts
  - Community joins
  - Referral earnings
  - System announcements
- ✅ Mark as read functionality
- ✅ Mark all as read functionality
- ✅ Full notification center

#### Referral System
- ✅ Unique referral code generation
- ✅ Referral code sharing
- ✅ Referral points tracking
- ✅ Referral history
- ✅ Automatic point awards (10 points per referral)
- ✅ Referral notifications

#### Subscription Status
- ✅ Current tier display (Free/Premium/Lifetime)
- ✅ Feature list per tier
- ✅ Upgrade prompt for free users
- ✅ Renewal status tracking

#### Announcements
- ✅ Admin-created announcements
- ✅ Target audience filtering (all/free/premium)
- ✅ Expiration date support
- ✅ Dismissible announcement cards
- ✅ Active announcement filtering

#### Tree Statistics
- ✅ Tree existence check
- ✅ Root member ID tracking
- ✅ Total members count
- ✅ Last active tree view

---

### 3. Enhanced User Model

#### New Fields Added
```javascript
{
  // Profile fields
  surname: String,
  village: String,
  city: String,
  caste: String,
  preferredLanguage: String (default: 'English'),
  profileCompleted: Boolean,
  
  // Social auth
  googleId: String (unique, sparse),
  appleId: String (unique, sparse),
  authProvider: Enum ['email', 'google', 'apple'],
  
  // Referral system
  referralCode: String (unique),
  referredBy: ObjectId (ref: User),
  referralPoints: Number (default: 0),
  
  // Account management
  isBlocked: Boolean (default: false),
  isDeleted: Boolean (default: false),
  subscriptionTier: Enum ['free', 'premium', 'lifetime']
}
```

---

### 4. New Database Models

#### Notification Model
```javascript
{
  user: ObjectId (ref: User),
  type: Enum ['tree_update', 'memory_posted', 'community_join', 'referral_earned', 'system'],
  title: String,
  message: String,
  isRead: Boolean (default: false),
  relatedId: ObjectId,
  relatedModel: Enum ['TreeMember', 'Memory', 'Community', 'User'],
  timestamps: true
}
```

#### Announcement Model
```javascript
{
  title: String,
  message: String,
  targetAudience: Enum ['all', 'free', 'premium'],
  isActive: Boolean (default: true),
  expiresAt: Date (optional),
  timestamps: true
}
```

#### Referral Model
```javascript
{
  referrer: ObjectId (ref: User),
  referred: ObjectId (ref: User),
  pointsEarned: Number (default: 10),
  status: Enum ['pending', 'completed'],
  timestamps: true
}
```

---

### 5. New API Endpoints

#### Authentication
- `POST /auth/register` - Email registration
- `POST /auth/verify-otp` - OTP verification
- `POST /auth/resend-otp` - Resend OTP
- `POST /auth/login` - Email login
- `POST /auth/social-login` - Google/Apple login
- `POST /auth/complete-profile` - Finish signup
- `GET /auth/me` - Get current user with profile completion

#### Dashboard
- `GET /dashboard/home` - Complete dashboard data
- `GET /dashboard/notifications` - All notifications
- `PATCH /dashboard/notifications/:id/read` - Mark notification read
- `PATCH /dashboard/notifications/read-all` - Mark all read
- `GET /dashboard/referrals` - Referral stats and history

#### Admin - Announcements
- `POST /admin/announcements` - Create announcement
- `GET /admin/announcements` - Get all announcements
- `PUT /admin/announcements/:id` - Update announcement
- `DELETE /admin/announcements/:id` - Delete announcement

---

## 🔧 Enhanced Existing Features

### Community Controller
- ✅ Added notification on community join
- ✅ Added soft delete support (isDeleted field)
- ✅ Filter deleted communities from listings

### Admin Controller
- ✅ Added referral count to dashboard stats
- ✅ Added announcement management
- ✅ Fixed soft delete queries (isDeleted: false)

---

## 📊 Business Logic Improvements

### Profile Completion Calculation
Tracks completion of 6 key fields:
1. Name
2. Surname
3. Village
4. City
5. Caste
6. Community

Percentage = (completed fields / 6) × 100

### Referral Flow
1. User A shares referral code
2. User B registers with referral code
3. User B verifies email/completes signup
4. User A receives 10 points automatically
5. Referral record created with status 'completed'
6. User A receives notification

### Notification Triggers
- Tree member added → Notify community members
- Memory posted → Notify community members
- Community joined → Welcome notification
- Referral completed → Points earned notification
- Admin announcements → Targeted notifications

---

## 🔒 Security Enhancements

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Email verification requirement
- ✅ Account blocking support
- ✅ Soft delete for data retention
- ✅ Admin role verification
- ✅ Terms and privacy acceptance tracking

---

## 📱 Frontend Integration Points

### Login/Signup Screens
```javascript
// Email registration
POST /auth/register
{ email, password, name, referralCode }

// Social login
POST /auth/social-login
{ provider, providerId, email, name, referralCode }

// Complete profile
POST /auth/complete-profile
{ name, surname, village, city, caste, community, preferredLanguage, acceptedTerms }
```

### Dashboard Screen
```javascript
// Get all dashboard data
GET /dashboard/home

Response includes:
- User info
- Profile completion
- Recent notifications
- Referral stats
- Subscription status
- Announcements
- Tree stats
- Quick actions
```

### Notification Center
```javascript
// Get all notifications
GET /dashboard/notifications

// Mark as read
PATCH /dashboard/notifications/:id/read

// Mark all as read
PATCH /dashboard/notifications/read-all
```

### Referral Screen
```javascript
// Get referral stats
GET /dashboard/referrals

Response includes:
- Referral code
- Total points
- Referral history
- Referred users list
```

---

## 🧪 Testing Checklist

### Authentication Flow
- [ ] Register with email
- [ ] Receive OTP email
- [ ] Verify OTP
- [ ] Resend OTP
- [ ] Login with email
- [ ] Login with Google
- [ ] Login with Apple (iOS)
- [ ] Complete profile
- [ ] Accept terms and privacy

### Dashboard
- [ ] View dashboard home
- [ ] Check profile completion
- [ ] View notifications
- [ ] Mark notification as read
- [ ] View referral stats
- [ ] Share referral code
- [ ] View announcements
- [ ] Dismiss announcement
- [ ] Access quick actions

### Referral System
- [ ] Generate referral code
- [ ] Register with referral code
- [ ] Verify referral points awarded
- [ ] View referral history
- [ ] Receive referral notification

### Admin Features
- [ ] Create announcement
- [ ] Target specific audience
- [ ] Set expiration date
- [ ] Update announcement
- [ ] Delete announcement
- [ ] View referral stats in admin dashboard

---

## 📝 Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/family-tree

# JWT
JWT_SECRET=your_jwt_secret_key

# Email (for OTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloudinary (for images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay (for payments)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple Sign-In (optional)
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
```

---

## 🚀 Deployment Notes

1. Update environment variables in production
2. Run database migrations if needed
3. Test OTP email delivery
4. Configure Google OAuth redirect URIs
5. Configure Apple Sign-In redirect URIs
6. Test payment gateway integration
7. Set up Cloudinary for image uploads
8. Configure CORS for frontend domain

---

## 📚 Additional Documentation

- See `API_DOCUMENTATION.md` for complete API reference
- See `../Design-Canvas/IMPLEMENTATION_GUIDE.md` for frontend integration
- See `../DEPLOYMENT_CHECKLIST.md` for deployment steps

---

## 🎯 Next Steps

1. Implement frontend screens for new features
2. Add push notification support
3. Implement email templates for OTP
4. Add social sharing for referral codes
5. Create admin dashboard UI for announcements
6. Add analytics tracking
7. Implement rate limiting for OTP requests
8. Add password reset functionality
9. Implement guest browse mode
10. Add multi-language support
