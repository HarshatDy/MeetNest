import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connection URI
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'neighborly';

// Check if env variables exist
if (!uri) {
  console.error('MongoDB URI not found in .env file');
  process.exit(1);
}

async function createIndexes() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Create indexes for the users collection
    await db.collection('users').createIndex({ societies: 1 });
    await db.collection('users').createIndex({ points: -1 });
    await db.collection('users').createIndex({ role: 1 });
    console.log('Created indexes for users collection');
    
    // Create indexes for tournament results collection
    await db.collection('tournament_results').createIndex({ tournamentId: 1 }, { unique: true });
    console.log('Created indexes for tournament_results collection');
    
    // Create indexes for societies collection
    await db.collection('societies').createIndex({ name: 1 });
    await db.collection('societies').createIndex({ "location.coordinates": "2dsphere" });
    console.log('Created indexes for societies collection');
    
    // Create indexes for events collection
    await db.collection('events').createIndex({ societyId: 1 });
    await db.collection('events').createIndex({ status: 1 });
    await db.collection('events').createIndex({ date: 1 });
    await db.collection('events').createIndex({ "organizer.role": 1 });
    console.log('Created indexes for events collection');
    
    console.log('MongoDB indexes created successfully');
  } catch (error) {
    console.error('Error creating MongoDB indexes:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

createIndexes();