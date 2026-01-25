// Test script for enhanced auto-tagging
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testAutoTagging() {
  let client;
  
  try {
    console.log("🧪 Testing Enhanced Auto-Tagging...");
    
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('leetcode-mastery');

    // Test 1: Check some sample problems
    console.log("\n📋 Sample Problems in Database:");
    const sampleProblems = await db.collection('problems').find({}).limit(5).toArray();
    sampleProblems.forEach((problem, index) => {
      console.log(`${index + 1}. ${problem.title} (${problem.difficulty})`);
      console.log(`   Topics: ${problem.topicTags.slice(0, 3).join(', ')}`);
    });

    // Test 2: Search for specific problem
    console.log("\n🔍 Testing Problem Search:");
    const twoSum = await db.collection('problems').findOne({ title: /two sum/i });
    if (twoSum) {
      console.log(`✅ Found: ${twoSum.title} - Topics: ${twoSum.topicTags.join(', ')}`);
    }

    // Test 3: Get topic statistics
    console.log("\n📊 Topic Statistics:");
    const topTopics = await db.collection('problems').aggregate([
      { $unwind: '$topicTags' },
      { $group: { _id: '$topicTags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    topTopics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic._id}: ${topic.count} problems`);
    });

    // Test 4: Check difficulty breakdown
    console.log("\n⚖️ Difficulty Breakdown:");
    const difficulties = await db.collection('problems').aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]).toArray();

    difficulties.forEach(diff => {
      console.log(`${diff._id}: ${diff.count} problems`);
    });

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testAutoTagging();