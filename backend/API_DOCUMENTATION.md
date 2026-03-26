# Family Tree App - Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### 1. Register with Email
**POST** `/auth/register`

Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "referralCode": "REF123ABC" // Optional
}
```

**Response:**
```json
{
  "message": "OTP sent to email"
}
```

---

### 2. Verify OTP
**POST** `/auth/verify-otp`

Verify email with OTP code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "isVerified": true,
    "referralCode": "REF123ABC"
  }
}
```

---

### 3. Resend OTP
**POST** `/auth/resend-otp`

Resend OTP to email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "OTP resent successfully"
}
```

---

### 4. Login with Email
**POST** `/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### 5. Social Login (Google/Apple)
**POST** `/auth/social-login`

Login or register with Google or Apple.

**Request Body:**
```json
{
  "provider": "google", // or "apple"
  "providerId": "google_user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "referralCode": "REF123ABC" // Optional
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "authProvider": "google"
  },
  "isNewUser": false
}
```

---

### 6. Complete Profile (Finish Signup)
**POST** `/auth/complete-profile`

Complete user profile after registration.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John",
  "surname": "Doe",
  "village": "Springfield",
  "city": "New York",
  "caste": "Community Name",
  "community": "community_id",
  "preferredLanguage": "English",
  "acceptedTerms": true
}
```

**Response:**
```json
{
  "message": "Profile completed successfully",
  "user": {
    "_id": "user_id",
    "name": "John",
    "surname": "Doe",
    "profileCompleted": true
  }
}
```

---

### 7. Get Current User
**GET** `/auth/me`

Get current authenticated user details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "_id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "profileCompletion": 85,
  "referralCode": "REF123ABC",
  "referralPoints": 30
}
```

---

## 🏠 Dashboard Endpoints

### 1. Get Dashboard Home
**GET** `/dashboard/home`

Get complete dashboard data including stats, notifications, and quick actions.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "name": "John Doe",
    "email": "user@example.com",
    "preferredLanguage": "English"
  },
  "profileCompletion": {
    "percentage": 85,
    "missingFields": ["surname", "village"]
  },
  "notifications": {
    "recent": [
      {
        "_id": "notif_id",
        "type": "tree_update",
        "title": "New Member Added",
        "message": "A new member was added to your family tree",
        "isRead": false,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "unreadCount": 5
  },
  "referral": {
    "code": "REF123ABC",
    "points": 30,
    "totalReferred": 3
  },
  "subscription": {
    "tier": "free",
    "isPremium": false,
    "features": ["Up to 3 levels", "Basic features"]
  },
  "announcements": [
    {
      "_id": "announce_id",
      "title": "New Feature Released!",
      "message": "Check out our new memory sharing feature",
      "targetAudience": "all"
    }
  ],
  "treeStats": {
    "hasTree": true,
    "rootId": "root_member_id",
    "totalMembers": 15
  },
  "quickActions": [
    {
      "id": "tree",
      "title": "Continue Family Tree",
      "icon": "tree",
      "route": "/tree"
    }
  ]
}
```

---

### 2. Get All Notifications
**GET** `/dashboard/notifications`

Get all notifications for current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "_id": "notif_id",
    "type": "tree_update",
    "title": "New Member Added",
    "message": "A new member was added to your family tree",
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### 3. Mark Notification as Read
**PATCH** `/dashboard/notifications/:id/read`

Mark a specific notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

---

### 4. Mark All Notifications as Read
**PATCH** `/dashboard/notifications/read-all`

Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "All notifications marked as read"
}
```

---

### 5. Get Referral Stats
**GET** `/dashboard/referrals`

Get referral statistics and history.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "code": "REF123ABC",
  "points": 30,
  "totalReferred": 3,
  "referrals": [
    {
      "_id": "referral_id",
      "referred": {
        "_id": "user_id",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "createdAt": "2024-01-10T08:00:00Z"
      },
      "pointsEarned": 10,
      "status": "completed"
    }
  ]
}
```

---

## 👥 Community Endpoints

### 1. Get All Communities
**GET** `/communities`

Get list of all active communities.

**Response:**
```json
[
  {
    "_id": "community_id",
    "name": "Smith Family",
    "description": "Smith family community",
    "admin": "admin_user_id",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

### 2. Join Community
**POST** `/communities/join`

Join a community.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "community_id": "community_id"
}
```

**Response:**
```json
{
  "message": "Joined successfully",
  "user": {
    "_id": "user_id",
    "community": "community_id"
  }
}
```

---

## 🌳 Family Tree Endpoints

### 1. Add Tree Member
**POST** `/tree/members`

Add a new member to the family tree.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Smith",
  "gender": "male",
  "dateOfBirth": "1980-05-15",
  "occupation": "Engineer",
  "bio": "Family patriarch",
  "isRoot": false,
  "relation": "child", // "spouse", "child", "parent"
  "targetId": "parent_member_id"
}
```

**Response:**
```json
{
  "_id": "member_id",
  "name": "John Smith",
  "gender": "male",
  "dob": "1980-05-15T00:00:00Z",
  "occupation": "Engineer",
  "bio": "Family patriarch"
}
```

---

### 2. Get Tree Structure
**GET** `/tree/focus/:id`

Get complete tree structure starting from a member.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "_id": "member_id",
  "name": "John Smith",
  "gender": "male",
  "spouse": {
    "_id": "spouse_id",
    "name": "Jane Smith"
  },
  "children": [
    {
      "_id": "child_id",
      "name": "Tom Smith",
      "children": []
    }
  ]
}
```

---

### 3. Get Member Details
**GET** `/tree/members/:id`

Get detailed information about a specific member.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "_id": "member_id",
  "name": "John Smith",
  "gender": "male",
  "dob": "1980-05-15T00:00:00Z",
  "occupation": "Engineer",
  "bio": "Family patriarch",
  "spouse": {
    "_id": "spouse_id",
    "name": "Jane Smith"
  },
  "father": {
    "_id": "father_id",
    "name": "Robert Smith"
  },
  "mother": {
    "_id": "mother_id",
    "name": "Mary Smith"
  },
  "children": [
    {
      "_id": "child_id",
      "name": "Tom Smith"
    }
  ]
}
```

---

### 4. Update Member
**PUT** `/tree/member/:id`

Update member information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Smith Jr.",
  "occupation": "Senior Engineer",
  "bio": "Updated bio"
}
```

**Response:**
```json
{
  "_id": "member_id",
  "name": "John Smith Jr.",
  "occupation": "Senior Engineer"
}
```

---

### 5. Delete Member
**DELETE** `/tree/member/:id`

Soft delete a member from the tree.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Member removed (soft delete)"
}
```

---

## 📸 Memory Endpoints

### 1. Post Memory
**POST** `/memories`

Upload a memory with image.

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
```
image: [file]
personName: "John Smith"
whoIsThis: "My grandfather"
description: "Family gathering 1985"
```

**Response:**
```json
{
  "_id": "memory_id",
  "imageUrl": "https://cloudinary.com/...",
  "personName": "John Smith",
  "whoIsThis": "My grandfather",
  "description": "Family gathering 1985",
  "postedBy": "user_id",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 2. Get All Memories
**GET** `/memories`

Get all memories for user's community.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "_id": "memory_id",
    "imageUrl": "https://cloudinary.com/...",
    "personName": "John Smith",
    "description": "Family gathering 1985",
    "postedBy": {
      "_id": "user_id",
      "name": "Jane Doe"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### 3. Delete Memory
**DELETE** `/memories/:id`

Delete a memory.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Memory deleted successfully"
}
```

---

## 💳 Subscription Endpoints

### 1. Get Subscription Plans
**GET** `/subscriptions/plans`

Get available subscription plans.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "free",
    "name": "Free",
    "price": 0,
    "features": ["Up to 3 levels", "Basic features"]
  },
  {
    "id": "premium",
    "name": "Premium",
    "price": 9.99,
    "features": ["Unlimited levels", "Advanced features", "Priority support"]
  },
  {
    "id": "lifetime",
    "name": "Lifetime",
    "price": 99.99,
    "features": ["All Premium features", "Lifetime access", "No recurring fees"]
  }
]
```

---

### 2. Subscribe
**POST** `/subscriptions/subscribe`

Subscribe to a plan.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "tier": "premium" // or "lifetime"
}
```

**Response:**
```json
{
  "message": "Subscription activated successfully"
}
```

---

## 🔧 Admin Endpoints

All admin endpoints require admin role.

### 1. Dashboard Stats
**GET** `/admin/dashboard`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "totalUsers": 150,
  "totalCommunities": 25,
  "premiumUsers": 30,
  "totalTreeMembers": 500,
  "totalMemories": 200,
  "totalReferrals": 45
}
```

---

### 2. Manage Users
- **GET** `/admin/users` - Get all users
- **GET** `/admin/users/:id` - Get user by ID
- **PATCH** `/admin/users/:id/block` - Block/unblock user
- **DELETE** `/admin/users/:id` - Soft delete user

---

### 3. Manage Communities
- **GET** `/admin/communities` - Get all communities
- **PUT** `/admin/communities/:id` - Update community
- **DELETE** `/admin/communities/:id` - Soft delete community
- **GET** `/admin/communities/:id/users` - Get community users

---

### 4. Manage Announcements
- **POST** `/admin/announcements` - Create announcement
- **GET** `/admin/announcements` - Get all announcements
- **PUT** `/admin/announcements/:id` - Update announcement
- **DELETE** `/admin/announcements/:id` - Delete announcement

**Create Announcement Body:**
```json
{
  "title": "New Feature!",
  "message": "Check out our new memory feature",
  "targetAudience": "all", // "all", "free", "premium"
  "expiresAt": "2024-12-31T23:59:59Z" // Optional
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
