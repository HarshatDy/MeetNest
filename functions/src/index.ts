/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import express, {Request, Response} from "express";
import cors from "cors";
import {MongoClient} from "mongodb";
import {loadSchemas} from "./schemas";

// Initialize Express app
const app = express();

// Middleware - Updated CORS configuration to be more permissive for debugging
app.use(cors({
  origin: true, // Allow requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow credentials
}));
app.use(express.json());

// MongoDB connection details - store these in environment variables in prod
const uri = process.env.MONGO_URI || "mongodb+srv://dhanayatharshat:1QKAGyDWzkUi9UV0@meetnestv0.j9j7rft.mongodb.net/";
const dbName = process.env.DB_NAME || "meetnest_v0";

// Debug logs for MongoDB connection details
logger.info(`MongoDB URI: ${uri}`);
logger.info(`MongoDB Database Name: ${dbName}`);

// MongoDB client
let client: MongoClient | null = null;
let schemasLoaded = false;

/**
 * Connect to MongoDB database and load schemas
 * @return {Promise<MongoClient>} MongoDB client instance
 */
async function connectToDatabase() {
  if (client) return client;

  try {
    client = new MongoClient(uri);
    await client.connect();
    logger.info("Connected to MongoDB");

    // Load schemas only once
    if (!schemasLoaded) {
      await loadSchemas(client, dbName);
      schemasLoaded = true;
    }

    return client;
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
}

// API Routes
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).send({status: "ok", message: "API is running"});
});

// Test connection endpoint - specifically for app connectivity testing
app.get("/api/users/test-connection", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "API connection successful",
    serverTime: new Date().toISOString(),
  });
});

// Posts endpoints
app.get("/api/posts", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("posts");

    // Get query parameters
    const societyId = req.query.societyId || "default";
    const limit = parseInt(req.query.limit as string) || 20;
    const before = req.query.before as string;

    // Build query
    const query: Record<string, unknown> = {societyId};
    if (before) {
      query.createdAt = {$lt: new Date(before)};
    }

    const posts = await collection
      .find(query)
      .limit(limit)
      .sort({timestamp: -1, createdAt: -1})
      .toArray();

    res.status(200).json(posts);
  } catch (error) {
    logger.error("Error fetching posts:", error);
    res.status(500).json({error: "Failed to fetch posts"});
  }
});

app.post("/api/posts", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("posts");

    const post = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(post);
    res.status(201).json({
      success: true,
      id: result.insertedId,
      post,
    });
  } catch (error) {
    logger.error("Error creating post:", error);
    res.status(500).json({error: "Failed to create post"});
  }
});

// User endpoints
app.get("/api/users/:userId", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    const userId = req.params.userId;
    const user = await collection.findOne({id: userId});

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user:", error);
    return res.status(500).json({error: "Failed to fetch user"});
  }
});

app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    const userData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(userData);
    res.status(201).json({
      success: true,
      id: result.insertedId,
      user: userData,
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(500).json({error: "Failed to create user"});
  }
});

// Tournaments endpoints
app.get("/api/tournaments", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("tournaments");

    const tournaments = await collection.find({}).toArray();
    res.status(200).json(tournaments);
  } catch (error) {
    logger.error("Error fetching tournaments:", error);
    res.status(500).json({error: "Failed to fetch tournaments"});
  }
});

app.get(
  "/api/tournaments/:tournamentId/results",
  async (req: Request, res: Response) => {
    try {
      const client = await connectToDatabase();
      const db = client.db(dbName);
      const collection = db.collection("tournament_results");

      const tournamentId = req.params.tournamentId;

      // Find all results for this tournament instead of just one
      const results = await collection.find({tournamentId}).toArray();

      if (!results || results.length === 0) {
        return res.status(404).json({error: "Tournament results not found"});
      }

      return res.status(200).json(results);
    } catch (error) {
      logger.error("Error fetching tournament results:", error);
      return res.status(500).json({error: "Failed to fetch tournament result"});
    }
  }
);

// Split this long function to avoid line length issues
app.post(
  "/api/tournaments/:tournamentId/results",
  async (req: Request, res: Response) => {
    try {
      const client = await connectToDatabase();
      const db = client.db(dbName);
      const collection = db.collection("tournament_results");

      const tournamentId = req.params.tournamentId;

      // Check if results already exist for this tournament
      const existingResult = await collection.findOne({tournamentId});

      const resultData = {
        ...req.body,
        tournamentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let result;

      if (existingResult) {
        // Update existing results
        result = await collection.updateOne(
          {tournamentId},
          {$set: {...resultData, updatedAt: new Date()}},
        );

        return res.status(200).json({
          success: true,
          message: "Tournament results updated",
          result: resultData,
        });
      } else {
        // Insert new results
        result = await collection.insertOne(resultData);

        return res.status(201).json({
          success: true,
          id: result.insertedId,
          result: resultData,
        });
      }
    } catch (error) {
      logger.error("Error saving tournament result:", error);
      return res.status(500).json({error: "Failed to save tournament result"});
    }
  }
);

// Leaderboard endpoint
app.get("/api/leaderboard", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    const societyId = req.query.societyId || "default";
    const timeframe = req.query.timeframe || "month";

    // Define the time range
    const now = new Date();
    // Calculate startDate based on timeframe
    const getStartDate = () => {
      if (timeframe === "week") {
        return new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      } else if (timeframe === "month") {
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else {
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }
    };

    // Get the start date for time filtering
    const startDate = getStartDate();

    // Aggregate user points within society
    const pipeline = [
      {
        $match: {
          societies: societyId,
          // Add time condition with the calculated start date
          createdAt: {$gte: startDate},
        },
      },
      {
        $project: {
          _id: 1,
          id: 1,
          displayName: 1,
          name: 1,
          points: 1,
          profileImage: 1,
          avatar: 1,
        },
      },
      {
        $sort: {points: -1},
      },
      {
        $limit: 100,
      },
    ];

    const leaderboard = await collection.aggregate(pipeline).toArray();
    res.status(200).json(leaderboard);
  } catch (error) {
    logger.error("Error calculating leaderboard:", error);
    res.status(500).json({error: "Failed to calculate leaderboard"});
  }
});

// Events endpoints
app.get("/api/events", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("events");

    const status = req.query.status;
    const societyId = req.query.societyId || "default";

    // Build query
    const query: Record<string, unknown> = {societyId};
    if (status) {
      query.status = status;
    }

    const events = await collection
      .find(query)
      .sort({date: 1})
      .toArray();

    res.status(200).json(events);
  } catch (error) {
    logger.error("Error fetching events:", error);
    res.status(500).json({error: "Failed to fetch events"});
  }
});

app.post("/api/events", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("events");

    const event = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(event);
    res.status(201).json({
      success: true,
      id: result.insertedId,
      event,
    });
  } catch (error) {
    logger.error("Error creating event:", error);
    res.status(500).json({error: "Failed to create event"});
  }
});

// Export the API to Firebase Functions
export const api = onRequest({
  timeoutSeconds: 540,
  memory: "256MiB",
  cors: true,
}, app);

// Add a startup function to verify schemas are loaded
export const verifySchemas = onRequest({
  timeoutSeconds: 60,
  memory: "256MiB",
  cors: true,
}, async (req, res) => {
  try {
    // const client = await connectToDatabase();
    res.status(200).json({
      status: "ok",
      message: "Schemas loaded successfully",
      schemasLoaded,
    });
  } catch (error) {
    logger.error("Schema verification error:", error);
    res.status(500).json({error: "Failed to verify schemas"});
  }
});
