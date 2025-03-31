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

async function deploySchemas() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Read schema files from mongodb_schemas directory
    const schemasDir = path.join(__dirname, '../../mongodb_schemas');
    const schemaFiles = fs.readdirSync(schemasDir);
    
    console.log(`Found ${schemaFiles.length} schema files`);
    
    for (const schemaFile of schemaFiles) {
      if (schemaFile.endsWith('.json')) {
        const collectionName = schemaFile.replace('.json', '');
        const schemaContent = JSON.parse(
          fs.readFileSync(path.join(schemasDir, schemaFile), 'utf8')
        );
        
        console.log(`Deploying schema for collection: ${collectionName}`);
        
        // Create or update collection with schema validation
        await db.command({
          collMod: collectionName,
          validator: { $jsonSchema: schemaContent },
          validationLevel: 'moderate',
          validationAction: 'warn'
        }).catch(async (err) => {
          // If collection doesn't exist yet, create it
          if (err.code === 26) {
            console.log(`Collection ${collectionName} does not exist. Creating...`);
            await db.createCollection(collectionName, {
              validator: { $jsonSchema: schemaContent },
              validationLevel: 'moderate',
              validationAction: 'warn'
            });
          } else {
            throw err;
          }
        });
        
        console.log(`Schema for ${collectionName} deployed successfully`);
      }
    }
    
    console.log('All MongoDB schemas deployed successfully');
  } catch (error) {
    console.error('Error deploying MongoDB schemas:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

deploySchemas();