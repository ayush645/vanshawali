const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import utilities and models for the Admin-check logic
const { bcrypt } = require('./src/config/utils'); 
const { User } = require('./src/models/allModels');

// Import the consolidated router
const allRoutes = require('./src/routes/allRoutes');

const app = express();



// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:8081',
            'http://localhost:19006', 
            'https://api.tatvagyaan.in',
            'http://127.0.0.1:8081',
            'http://192.168.1.1:8081', // Add your local IP if needed
            'https://fastidious-granita-890d86.netlify.app', // Netlify deployment
        ];
        
        // Allow common deployment platforms
        const allowedPatterns = [
            /^https:\/\/.*\.netlify\.app$/,
            /^https:\/\/.*\.vercel\.app$/,
            /^https:\/\/.*\.github\.io$/,
            /^https:\/\/.*\.web\.app$/,
            /^https:\/\/.*\.firebaseapp\.com$/
        ];
        
        // Check exact matches first
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        // Check pattern matches
        for (const pattern of allowedPatterns) {
            if (pattern.test(origin)) {
                console.log('CORS allowed pattern match:', origin);
                return callback(null, true);
            }
        }
        
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Allow all for now - change to false for production
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb+srv://sapremmangocup2025_db_user:h5xiSNhW1Sxedzjv@cluster0prem.fbhatto.mongodb.net/famlytree?retryWrites=true&w=majority&appName=Cluster0prem'; 



// --- DATABASE CONNECTION & ADMIN SETUP ---
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB successfully connected.');

        // Initialization: Create a default admin user if one doesn't exist
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const adminPasswordHash = await bcrypt.hash('admin123');
            await User.create({ 
                email: 'admin@example.com', 
                password: adminPasswordHash, 
                name: 'System Admin', 
                role: 'admin', 
                isVerified: true 
            });
            console.log('👤 Default admin created: (admin@example.com / admin123)');
        }

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1); 
    }
};

// --- MOUNT ROUTES ---
// Handle preflight requests explicitly for all routes
app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${origin || 'none'}`);
    
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request for:', req.path);
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
        return res.sendStatus(200);
    }
    next();
});

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// We mount all routes under /api. 
// This includes Auth, Communities, Tree, Subscriptions, AND Memories.
app.use('/api', allRoutes);



// --- START SERVER ---
const startServer = () => {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📝 Documentation: Use http://localhost:${PORT}/api/{route}`);
        console.log(`🌐 CORS enabled for all origins`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
        } else {
            console.error('❌ Server error:', error);
        }
        process.exit(1);
    });
};

connectDB().then(startServer);