// Simple test to verify MongoDB connection
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDB() {
  let client;
  
  try {
    console.log("Testing MongoDB connection...");
    
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI environment variable not set");
      return;
    }
    
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    console.log("✅ Database connected successfully");
    
    const db = client.db('leetcode-mastery');
    
    // Test inserting a test document
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: "Test connection"
    };
    
    const result = await db.collection('problems').insertOne(testDoc);
    console.log("✅ Test document inserted:", result.insertedId);
    
    // Clean up test document
    await db.collection('problems').deleteOne({ _id: result.insertedId });
    console.log("✅ Test document cleaned up");
    
    // Check current stats
    const problemsCount = await db.collection('problems').countDocuments();
    const memoriesCount = await db.collection('memories').countDocuments();
    const reviewsCount = await db.collection('reviews').countDocuments();
    
    console.log("📊 Current database stats:");
    console.log(`  - Problems: ${problemsCount}`);
    console.log(`  - Memories: ${memoriesCount}`);
    console.log(`  - Reviews: ${reviewsCount}`);
    
  } catch (error) {
    console.error("❌ MongoDB test failed:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testMongoDB().then(() => {
  console.log("Test completed");
}).catch(error => {
  console.error("Test error:", error);
});