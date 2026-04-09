const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    // You'll need to add your Firebase service account key
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  return admin;
};

// Send push notification
const sendPushNotification = async (tokens, title, body, data = {}) => {
  try {
    const firebase = initializeFirebase();
    
    if (!tokens || tokens.length === 0) {
      console.log('No FCM tokens provided');
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
      tokens: Array.isArray(tokens) ? tokens : [tokens],
    };

    const response = await firebase.messaging().sendEachForMulticast(message);
    
    console.log('Push notification sent:', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

// Send notification to specific user
const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const User = require('../models/allModels').User;
    const user = await User.findById(userId);
    
    if (!user || !user.fcmToken) {
      console.log(`No FCM token found for user ${userId}`);
      return;
    }

    return await sendPushNotification(user.fcmToken, title, body, data);
  } catch (error) {
    console.error('Error sending notification to user:', error);
    throw error;
  }
};

// Send notification to multiple users
const sendNotificationToUsers = async (userIds, title, body, data = {}) => {
  try {
    const User = require('../models/allModels').User;
    const users = await User.find({ 
      _id: { $in: userIds },
      fcmToken: { $exists: true, $ne: null }
    });
    
    const tokens = users.map(user => user.fcmToken).filter(Boolean);
    
    if (tokens.length === 0) {
      console.log('No FCM tokens found for users');
      return;
    }

    return await sendPushNotification(tokens, title, body, data);
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  sendPushNotification,
  sendNotificationToUser,
  sendNotificationToUsers,
};