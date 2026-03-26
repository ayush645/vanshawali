const crypto = require('crypto');
const nodemailer = require('nodemailer'); // Added Nodemailer

// --- Environment Variables (Use .env in real life) ---
const JWT_SECRET = 'your_super_secret_jwt_key_for_prod';
const RAZORPAY_KEY_ID = 'rzp_test_SVllfHTUaZVUI7';
const RAZORPAY_KEY_SECRET = 'rmTXL9wclIH8x2qoMTbSJT1N';

// --- MOCK/HELPER FUNCTIONS (Replace with real libraries) ---

/** Mock: Secure Password Hashing (Use bcrypt in production) */
const bcrypt = {
    hash: (password) => Promise.resolve(`hashed_${password}_${crypto.randomBytes(4).toString('hex')}`),
    compare: (password, hash) => Promise.resolve(hash.includes(password))
};

/** Mock: JWT Handling (Use jsonwebtoken in production) */
const jwt = {
    sign: (payload) => `mock_jwt_token.${Buffer.from(JSON.stringify(payload)).toString('base64')}`,
    verify: (token) => {
        try {
            const payload = token.split('.')[1];
            return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        } catch (e) {
            throw new Error('Invalid token');
        }
    }
};

/** Mock: OTP Generation */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- FUNCTIONAL: Nodemailer Configuration ---

const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use any service or your own SMTP
    auth: {
        // !!! IMPORTANT: Replace with your actual email credentials !!!
        user: 'ayush2maheshwari@gmail.com', 
        pass: 'gaob nber gxcq xeif' 
    }
});

/** Functional: Email Service (Using Nodemailer) */
const sendEmail = (email, otp) => {
    const mailOptions = {
        from: 'Family Tree Service <your_email@gmail.com>',
        to: email,
        subject: 'Family Tree App: OTP Verification',
        html: `<p>Your One-Time Password (OTP) for account verification is: <strong>${otp}</strong>. This code is valid for 10 minutes.</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`[EMAIL ERROR] Failed to send OTP to ${email}:`, error);
        } else {
            console.log(`[EMAIL SUCCESS] OTP sent to ${email}. Message ID: ${info.messageId}`);
        }
    });
};

/** Real Razorpay SDK */
let Razorpay;
try {
    // Try to load real Razorpay SDK
    const RazorpaySDK = require('razorpay');
    Razorpay = new RazorpaySDK({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Real Razorpay SDK loaded');
} catch (error) {
    console.log('⚠️ Razorpay SDK not found, using mock');
    // Fallback to mock if SDK not installed
    Razorpay = {
        orders: {
            create: async (options) => {
                console.log(`[RAZORPAY MOCK] Creating order for ${options.amount} ${options.currency}`);
                return {
                    id: `order_${crypto.randomBytes(12).toString('hex')}`,
                    amount: options.amount,
                    currency: options.currency,
                    receipt: options.receipt,
                    status: 'created',
                };
            }
        },
        payments: {
            fetch: async (paymentId) => {
                console.log(`[RAZORPAY MOCK] Fetching payment ${paymentId}`);
                return {
                    id: paymentId,
                    status: 'captured',
                    amount: 99900,
                    currency: 'INR'
                };
            }
        }
    };
}

module.exports = { 
    bcrypt, 
    jwt, 
    generateOTP, 
    sendEmail, // Updated to use Nodemailer logic
    Razorpay, 
    JWT_SECRET,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET 
};