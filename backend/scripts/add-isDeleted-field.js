/**
 * Migration Script: Add isDeleted field to existing documents
 * 
 * This script adds the isDeleted: false field to all existing documents
 * that don't have it yet.
 * 
 * Run with: node backend/scripts/add-isDeleted-field.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family-tree';

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    const db = mongoose.connection.db;

    // Update Users
    console.log('\nUpdating Users collection...');
    const usersResult = await db.collection('users').updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    console.log(`Updated ${usersResult.modifiedCount} users`);

    // Update Communities
    console.log('\nUpdating Communities collection...');
    const communitiesResult = await db.collection('communities').updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    console.log(`Updated ${communitiesResult.modifiedCount} communities`);

    // Update TreeMembers
    console.log('\nUpdating TreeMembers collection...');
    const treeMembersResult = await db.collection('treemembers').updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    console.log(`Updated ${treeMembersResult.modifiedCount} tree members`);

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

migrate();
