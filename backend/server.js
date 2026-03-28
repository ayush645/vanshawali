const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import utilities and models for the Admin-check logic
const { bcrypt } = require('./src/config/utils'); 
const { User } = require('./src/models/allModels');

// Import the consolidated router
const allRoutes = require('./src/routes/allRoutes');

const app = express();

// --- MIDDLEWARE ---
// app.use(express.json()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "*", // Allows requests from Expo Go and mobile devices
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb+srv://sapremmangocup2025_db_user:h5xiSNhW1Sxedzjv@cluster0prem.fbhatto.mongodb.net/vansahwali?retryWrites=true&w=majority&appName=Cluster0prem'; 

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
// We mount all routes under /api. 
// This includes Auth, Communities, Tree, Subscriptions, AND Memories.
app.use('/api', allRoutes);



// --- START SERVER ---
const startServer = () => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('📝 Documentation: Use http://localhost:3000/api/{route}');
    });
};

connectDB().then(startServer);