/**
 * Script to sync community member counts
 * This will count actual members and update totalMembers field
 * Run this once to fix existing data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/allModels').User;
const Community = require('../src/models/allModels').Community;

async function syncCommunityMembers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/family-tree');
        console.log('✅ Connected to MongoDB');

        // Get all communities
        const communities = await Community.find({ isDeleted: { $ne: true } });
        console.log(`\n📊 Found ${communities.length} communities to sync\n`);

        let updatedCount = 0;

        // For each community, count actual members
        for (const community of communities) {
            // Count users who have this community
            const memberCount = await User.countDocuments({
                community: community._id,
                isDeleted: { $ne: true }
            });

            // Update the community's totalMembers
            const oldCount = community.totalMembers;
            community.totalMembers = memberCount;
            await community.save();

            console.log(`📝 ${community.name}:`);
            console.log(`   Old count: ${oldCount}`);
            console.log(`   New count: ${memberCount}`);
            console.log(`   ${memberCount > oldCount ? '✅ Increased' : memberCount < oldCount ? '⚠️  Decreased' : '➖ No change'}\n`);

            updatedCount++;
        }

        console.log(`\n✅ Successfully synced ${updatedCount} communities`);
        console.log('🎉 Member counts are now accurate!\n');

        // Show summary
        const totalMembers = await User.countDocuments({ 
            community: { $ne: null },
            isDeleted: { $ne: true }
        });
        console.log(`📊 Summary:`);
        console.log(`   Total communities: ${communities.length}`);
        console.log(`   Total members across all communities: ${totalMembers}`);

    } catch (error) {
        console.error('❌ Error syncing community members:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Run the sync
console.log('🚀 Starting community member count sync...\n');
syncCommunityMembers();
