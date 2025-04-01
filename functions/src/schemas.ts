import {MongoClient} from "mongodb";
import * as logger from "firebase-functions/logger";
import * as path from "path";
import * as fs from "fs";

/**
 * Load MongoDB schemas from JSON files
 * @param {MongoClient} client MongoDB client
 * @param {string} dbName Database name
 */
export async function loadSchemas(client: MongoClient, dbName: string) {
  try {
    const db = client.db(dbName);
    // Path to schema directory
    const schemaDir = path.join(__dirname, "../../mongodb_schemas");

    // Check if directory exists
    if (!fs.existsSync(schemaDir)) {
      logger.warn(`Schema directory not found: ${schemaDir}`);
      return;
    }

    const schemaFiles = fs.readdirSync(schemaDir);
    logger.info(`Found ${schemaFiles.length} schema files`);

    for (const schemaFile of schemaFiles) {
      if (schemaFile.endsWith(".json")) {
        const collectionName = schemaFile.replace(".json", "");
        const schemaPath = path.join(schemaDir, schemaFile);

        try {
          const schemaContent = JSON.parse(
            fs.readFileSync(schemaPath, "utf8")
          );

          logger.info(
            `Validating schema for collection: ${collectionName}`
          );

          // Check if collection exists and apply schema
          const collections = await db
            .listCollections({name: collectionName})
            .toArray();

          if (collections.length > 0) {
            await db.command({
              collMod: collectionName,
              validator: {$jsonSchema: schemaContent},
              validationLevel: "moderate",
              validationAction: "warn",
            });
            logger.info(
              `Updated schema validation for collection: ${collectionName}`
            );
          } else {
            logger.info(
              `Collection ${collectionName} does not exist, created with schema`
            );
          }
        } catch (error) {
          logger.error(`Error processing schema ${schemaFile}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error("Error loading schemas:", error);
  }
}

/**
 * Apply MongoDB schema validation to a collection if it exists
 * @param {MongoClient} client MongoDB client
 * @param {string} dbName Database name
 * @param {string} collectionName Collection name
 * @param {object} schema JSON Schema
 */
export async function applySchemaToCollection(
  client: MongoClient,
  dbName: string,
  collectionName: string,
  schema: object
) {
  try {
    const db = client.db(dbName);

    // Check if collection exists
    const collections = await db
      .listCollections({name: collectionName})
      .toArray();

    if (collections.length > 0) {
      // Apply validation to existing collection
      await db.command({
        collMod: collectionName,
        validator: {$jsonSchema: schema},
        validationLevel: "moderate",
        validationAction: "warn",
      });
      logger.info(
        `Schema validation applied to collection: ${collectionName}`
      );
    } else {
      // Create collection with validation
      await db.createCollection(collectionName, {
        validator: {$jsonSchema: schema},
        validationLevel: "moderate",
        validationAction: "warn",
      });
      logger.info(
        `Created collection with schema validation: ${collectionName}`
      );
    }
  } catch (error) {
    logger.error(
      `Error applying schema to collection ${collectionName}:`,
      error
    );
    throw error;
  }
}
