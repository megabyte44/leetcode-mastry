// Check solved problems status
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkSolved() {
  let client;
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('leetcode-mastery');
    
    // Get count
    const count = await db.collection('solved').countDocuments();
    console.log('✅ Solved problems count:', count);
    
    // Get difficulty stats
    const stats = await db.collection('solved').aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('\n📊 Difficulty breakdown:');
    stats.forEach(s => console.log(`   ${s._id}: ${s.count}`));
    
    // Get topic coverage
    const topics = await db.collection('solved').aggregate([
      { $unwind: '$topicTags' },
      { $group: { _id: '$topicTags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    console.log('\n📚 Top topics you\'ve covered:');
    topics.forEach((t, i) => console.log(`   ${i+1}. ${t._id}: ${t.count}`));
    
    // Sample problem
    const sample = await db.collection('solved').findOne({});
    console.log('\n📝 Sample solved problem:');
    console.log(JSON.stringify(sample, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) await client.close();
  }
}

checkSolved();