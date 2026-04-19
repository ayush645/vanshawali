const express = require('express');
const { authMiddleware, adminMiddleware, checkLevelLimit } = require('../middleware/middleware');
const { authController, communityController, treeController, memoryController, paymentController, dashboardController, correctionController, enhancedCommunityController, userController } = require('../controllers/allControllers');
const { adminController } = require('../controllers/allControllers');

const upload = require('../middleware/upload');

const router = express.Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/register', authController.register);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/resend-otp', authController.resendOTP);
router.post('/auth/login', authController.login);
router.post('/auth/social-login', authController.socialLogin);
router.post('/auth/complete-profile', authMiddleware, authController.completeProfile);
router.get('/auth/me', authMiddleware, authController.getMe);

// ==================== FCM TOKEN ROUTES ====================
router.post('/fcm/token', authMiddleware, userController.updateFCMToken);
router.post('/test-notification', authMiddleware, userController.testNotification);

// ==================== DASHBOARD ROUTES ====================
router.get('/dashboard/home', authMiddleware, dashboardController.getHome);
router.get('/dashboard/notifications', authMiddleware, dashboardController.getNotifications);
router.patch('/dashboard/notifications/:id/read', authMiddleware, dashboardController.markNotificationRead);
router.patch('/dashboard/notifications/read-all', authMiddleware, dashboardController.markAllNotificationsRead);
router.delete('/dashboard/notifications/:id', authMiddleware, dashboardController.deleteNotification);
router.get('/dashboard/referrals', authMiddleware, dashboardController.getReferralStats);

// ==================== COMMUNITY ROUTES ====================
router.get('/communities', communityController.getAll);
router.post('/communities/join', authMiddleware, communityController.join);
router.post('/communities/leave', authMiddleware, communityController.leave);
router.post('/admin/communities', authMiddleware, adminMiddleware, communityController.create);

// ==================== TREE ROUTES ====================
router.post('/tree/members', authMiddleware, checkLevelLimit, treeController.add);
router.get('/tree/members/:id', authMiddleware, treeController.getMemberById);
router.put('/tree/member/:id', authMiddleware, treeController.update);
router.put('/tree/members/:id', authMiddleware, treeController.update); // Plural version
router.get('/tree/focus/:id', authMiddleware, treeController.getTreeForUI);
router.delete('/tree/member/:id', authMiddleware, treeController.delete);
router.delete('/tree/members/:id', authMiddleware, treeController.delete); // Plural version

// Tree settings and public trees
router.patch('/tree/settings', authMiddleware, treeController.updateTreeSettings);
router.get('/tree/public', authMiddleware, treeController.getPublicTrees);
router.get('/tree/public/:userId', authMiddleware, treeController.getPublicTreeByUserId);

// ==================== MEMORY ROUTES ====================
router.post('/memories', authMiddleware, upload.single('image'), memoryController.post);
router.get('/memories', authMiddleware, memoryController.getAll);
router.delete('/memories/:id', authMiddleware, memoryController.delete);

// ==================== PAYMENT & SUBSCRIPTION ROUTES ====================
router.get('/subscriptions/plans', authMiddleware, paymentController.getPlans);
router.post('/subscription/order', authMiddleware, paymentController.createOrder);
router.post('/subscription/verify', authMiddleware, paymentController.verify);
router.post('/subscriptions/subscribe', authMiddleware, paymentController.subscribe);
router.post('/subscriptions/verify-iap', authMiddleware, paymentController.verifyIAP);
router.get('/subscriptions/status', authMiddleware, paymentController.getSubscriptionStatus);
router.post('/subscriptions/cancel', authMiddleware, paymentController.cancelSubscription);

// ==================== USER SETTINGS ROUTES ====================
router.patch('/user/update-language', authMiddleware, userController.updateLanguage);
router.patch('/user/change-password', authMiddleware, userController.changePassword);
router.get('/user/privacy-settings', authMiddleware, userController.getPrivacySettings);
router.patch('/user/privacy-settings', authMiddleware, userController.updatePrivacySettings);
router.patch('/user/update-profile', authMiddleware, upload.single('profilePhoto'), userController.updateProfile);

// ==================== ADMIN ROUTES ====================

// Dashboard
router.get('/admin/dashboard', authMiddleware, adminMiddleware, adminController.dashboardStats);

// Users
router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getAllUsers);
router.get('/admin/users/:id', authMiddleware, adminMiddleware, adminController.getUserById);
router.patch('/admin/users/:id/block', authMiddleware, adminMiddleware, adminController.toggleUserBlock);
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, adminController.deleteUser);

// Communities
router.get('/admin/communities', authMiddleware, adminMiddleware, adminController.getAllCommunities);
router.put('/admin/communities/:id', authMiddleware, adminMiddleware, adminController.updateCommunity);
router.delete('/admin/communities/:id', authMiddleware, adminMiddleware, adminController.deleteCommunity);
router.post('/admin/communities/sync-members', authMiddleware, adminMiddleware, adminController.syncCommunityMembers);
router.get('/admin/communities/:id/users', authMiddleware, adminMiddleware, adminController.getCommunityUsers);

// Subscription Plans Management
router.get('/admin/plans', authMiddleware, adminMiddleware, adminController.getAllPlans);
router.post('/admin/plans', authMiddleware, adminMiddleware, adminController.createPlan);
router.put('/admin/plans/:id', authMiddleware, adminMiddleware, adminController.updatePlan);
router.delete('/admin/plans/:id', authMiddleware, adminMiddleware, adminController.deletePlan);
router.get('/admin/plans/:planId/subscribers', authMiddleware, adminMiddleware, adminController.getPlanSubscribers);

// User Subscriptions Management
router.get('/admin/subscriptions', authMiddleware, adminMiddleware, adminController.getAllSubscriptions);
router.post('/admin/subscriptions', authMiddleware, adminMiddleware, adminController.createSubscription);
router.put('/admin/subscriptions/:id', authMiddleware, adminMiddleware, adminController.updateSubscription);
router.delete('/admin/subscriptions/:id', authMiddleware, adminMiddleware, adminController.deleteSubscription);

// Announcements
router.post('/admin/announcements', authMiddleware, adminMiddleware, adminController.createAnnouncement);
router.get('/admin/announcements', authMiddleware, adminMiddleware, adminController.getAllAnnouncements);
router.put('/admin/announcements/:id', authMiddleware, adminMiddleware, adminController.updateAnnouncement);
router.delete('/admin/announcements/:id', authMiddleware, adminMiddleware, adminController.deleteAnnouncement);

// ==================== CORRECTION REQUEST ROUTES ====================
router.post('/corrections', authMiddleware, correctionController.submitRequest);
router.get('/corrections/my-requests', authMiddleware, correctionController.getMyRequests);
router.get('/corrections/:id', authMiddleware, correctionController.getRequestDetail);
router.put('/corrections/:id', authMiddleware, correctionController.updateRequest);
router.delete('/corrections/:id', authMiddleware, correctionController.withdrawRequest);

// Admin correction routes
router.get('/admin/corrections', authMiddleware, adminMiddleware, correctionController.getAllRequests);
router.patch('/admin/corrections/:id/review', authMiddleware, adminMiddleware, correctionController.reviewRequest);

// ==================== ENHANCED COMMUNITY ROUTES ====================
// Note: Specific routes must come before parameterized routes
router.get('/communities/search', enhancedCommunityController.searchCommunities);
router.get('/communities/filters', enhancedCommunityController.getFilters);
router.get('/communities/:id/detail', enhancedCommunityController.getCommunityDetail);
router.get('/communities/:id', communityController.getById);
router.post('/communities/:id/follow', authMiddleware, enhancedCommunityController.toggleFollow);
router.post('/communities/:id/suggest-edit', authMiddleware, enhancedCommunityController.suggestEdit);

module.exports = router;