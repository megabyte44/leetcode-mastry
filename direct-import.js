// Direct import script that bypasses Next.js server issues
const { MongoClient } = require('mongodb');
const https = require('https');
require('dotenv').config();

const LEETCODE_GRAPHQL_QUERY = `
  query problemsetQuestionListV2($limit: Int!, $skip: Int!) {
    problemsetQuestionListV2(limit: $limit, skip: $skip) {
      questions {
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
      }
    }
  }
`;

// Fetch problems from LeetCode API
async function fetchProblemsFromLeetCode(limit = 100, skip = 0) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: LEETCODE_GRAPHQL_QUERY,
      variables: { limit, skip }
    });

    const options = {
      hostname: 'leetcode.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Referer': 'https://leetcode.com/problems',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errors) {
            reject(new Error(`GraphQL error: ${JSON.stringify(result.errors)}`));
            return;
          }

          const questions = result.data?.problemsetQuestionListV2?.questions || [];
          const problems = questions.map((q, index) => ({
            title: q.title,
            titleSlug: q.titleSlug,
            difficulty: q.difficulty,
            topicTags: q.topicTags.map(tag => tag.name),
            problemId: skip + index + 1, // Generate sequential IDs
            importedAt: new Date(),
          }));
          
          resolve(problems);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function importAllProblems() {
  let client;
  
  try {
    console.log("🔗 Connecting to MongoDB...");
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db('leetcode-mastery');
    const collection = db.collection('problems');

    console.log("🔄 Starting LeetCode problems import...");
    console.log("⚠️  This may take 5-10 minutes to complete...");
    
    let allProblems = [];
    let skip = 0;
    const limit = 100;
    let batchCount = 0;

    // Clear existing problems first
    await collection.deleteMany({});
    console.log("🧹 Cleared existing problems");

    // Fetch all problems in batches
    while (true) {
      batchCount++;
      console.log(`📥 Fetching batch ${batchCount}: skip=${skip}, limit=${limit}`);
      
      try {
        const problems = await fetchProblemsFromLeetCode(limit, skip);
        
        if (problems.length === 0) {
          console.log("✅ No more problems found, import complete");
          break;
        }

        allProblems.push(...problems);
        console.log(`   Got ${problems.length} problems (total: ${allProblems.length})`);

        // Insert this batch immediately to see progress
        if (problems.length > 0) {
          await collection.insertMany(problems);
          console.log(`   ✅ Inserted batch ${batchCount} into database`);
        }

        skip += limit;
        
        // Add delay to be respectful to LeetCode servers
        console.log("   ⏳ Waiting 1 second before next batch...");
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Safety break to prevent infinite loops
        if (skip > 5000) {
          console.warn("⚠️  Reached safety limit of 5000 problems");
          break;
        }

      } catch (error) {
        console.error(`❌ Error in batch ${batchCount}:`, error.message);
        // Continue with next batch unless it's a critical error
        if (error.message.includes('GraphQL error')) {
          break;
        }
        skip += limit;
      }
    }

    console.log(`🎉 Import completed! Total problems imported: ${allProblems.length}`);

    // Create indexes for better performance
    console.log("🔧 Creating database indexes...");
    await collection.createIndex({ titleSlug: 1 }, { unique: true });
    await collection.createIndex({ problemId: 1 });
    await collection.createIndex({ difficulty: 1 });
    await collection.createIndex({ topicTags: 1 });
    console.log("✅ Indexes created");

    // Show final stats
    const stats = await db.collection('problems').aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]).toArray();

    console.log("📊 Final Statistics:");
    console.log(`   Total Problems: ${allProblems.length}`);
    for (const stat of stats) {
      console.log(`   ${stat._id}: ${stat.count}`);
    }

  } catch (error) {
    console.error("❌ Import failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 Database connection closed");
    }
  }
}

importAllProblems();