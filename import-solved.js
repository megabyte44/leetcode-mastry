// Import user's solved problems data to MongoDB
const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function importSolvedProblems() {
  let client;
  
  try {
    console.log("🔗 Connecting to MongoDB...");
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db('leetcode-mastery');

    // Read solved.json
    console.log("📖 Reading solved.json...");
    const solvedData = JSON.parse(fs.readFileSync('./solved.json', 'utf8'));
    const questions = solvedData.data.favoriteQuestionList.questions;
    
    console.log(`📊 Found ${questions.length} solved problems`);

    // Prepare solved problems for MongoDB
    const solvedProblems = questions.map(q => ({
      odId: q.id,
      title: q.title,
      titleSlug: q.titleSlug,
      difficulty: q.difficulty,
      questionFrontendId: q.questionFrontendId,
      status: q.status,
      acRate: q.acRate,
      paidOnly: q.paidOnly,
      solvedAt: new Date(), // Mark when imported
      userId: 'default-user', // Can be updated for multi-user support
    }));

    // Create/update solved collection
    const solvedCollection = db.collection('solved');
    
    // Clear existing and insert new
    await solvedCollection.deleteMany({ userId: 'default-user' });
    await solvedCollection.insertMany(solvedProblems);
    
    // Create indexes
    await solvedCollection.createIndex({ titleSlug: 1, userId: 1 }, { unique: true });
    await solvedCollection.createIndex({ difficulty: 1 });
    await solvedCollection.createIndex({ userId: 1 });

    console.log(`✅ Imported ${solvedProblems.length} solved problems`);

    // Now enrich with topic tags from problems collection
    console.log("\n🔄 Enriching with topic tags from problems database...");
    
    const problemsCollection = db.collection('problems');
    let enrichedCount = 0;

    for (const solved of solvedProblems) {
      const problemData = await problemsCollection.findOne({ titleSlug: solved.titleSlug });
      if (problemData && problemData.topicTags) {
        await solvedCollection.updateOne(
          { titleSlug: solved.titleSlug, userId: 'default-user' },
          { $set: { topicTags: problemData.topicTags } }
        );
        enrichedCount++;
      }
    }

    console.log(`✅ Enriched ${enrichedCount} problems with topic tags`);

    // Calculate and display statistics
    console.log("\n📊 Your Progress Statistics:");
    
    const stats = await solvedCollection.aggregate([
      { $match: { userId: 'default-user' } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]).toArray();

    const total = solvedProblems.length;
    stats.forEach(s => {
      console.log(`   ${s._id}: ${s.count} problems`);
    });
    console.log(`   TOTAL: ${total} problems solved!`);

    // Get topic breakdown
    console.log("\n📚 Your Topic Coverage:");
    const topicStats = await solvedCollection.aggregate([
      { $match: { userId: 'default-user' } },
      { $unwind: '$topicTags' },
      { $group: { _id: '$topicTags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]).toArray();

    topicStats.forEach((topic, i) => {
      console.log(`   ${i + 1}. ${topic._id}: ${topic.count} problems`);
    });

  } catch (error) {
    console.error("❌ Import failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 Database connection closed");
    }
  }
}

importSolvedProblems();