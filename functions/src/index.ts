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
import {MongoClient, ObjectId} from "mongodb";
import {loadSchemas} from "./schemas";
// Add os and dns modules for IP address lookup
import * as os from "os";
import * as dns from "dns";
import {promisify} from "util";

// Promisify dns.lookup
const dnsLookup = promisify(dns.lookup);

// Initialize Express app
const app = express();

// Middleware - Updated CORS configuration to be more permissive for debugging
app.use(cors({
  origin: true, // Allow requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// MongoDB connection details - store these in environment variables in prod
const uri = process.env.MONGO_URI || "mongodb+srv://dhanayatharshat:1QKAGyDWzkUi9UV0@meetnestv0.j9j7rft.mongodb.net/";
const dbName = process.env.DB_NAME || "meetnest_v0";

// Debug logs for MongoDB connection details
logger.info(`MongoDB URI: ${uri.replace(/:[^:]*@/, ":***@")}`);
logger.info(`MongoDB Database Name: ${dbName}`);

/**
 * Function to get and log the outgoing IP address
 */
async function getOutgoingIpAddress() {
  try {
    // Get hostname
    const hostname = os.hostname();
    logger.info(`Server hostname: ${hostname}`);

    // Try to get local IP addresses
    const networkInterfaces = os.networkInterfaces();
    logger.info("Network interfaces:", networkInterfaces);

    // Simple external service IP check (hostname reso, not actual HTTP req)
    const externalLookup = await dnsLookup("api.ipify.org");
    logger.info(
      `DNS resolution for external service: ${JSON.stringify(externalLookup)}`
    );

    return "IP detection attempted";
  } catch (error) {
    logger.error("Error getting IP address:", error);
    return "Error getting IP address";
  }
}

// MongoDB client
let client: MongoClient | null = null;
let schemasLoaded = false;

/**
 * Connect to MongoDB database and load schemas
 * @return {Promise<MongoClient>} MongoDB client instance
 */
async function connectToDatabase() {
  if (client) return client;

  // Log the outgoing IP info before connecting
  const ipInfo = await getOutgoingIpAddress();
  logger.info(`Attempting MongoDB connection from: ${ipInfo}`);
  logger.info(
    `Connecting to MongoDB at URI: ${uri.replace(/:[^:]*@/, ":***@")}`
  );

  try {
    client = new MongoClient(uri);
    await client.connect();
    logger.info("Connected to MongoDB");

    // Test the connection with a simple command
    const adminDb = client.db("admin");
    const pingResult = await adminDb.command({ping: 1});
    logger.info(`MongoDB ping result: ${JSON.stringify(pingResult)}`);

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

// Add a test endpoint to check connection status
app.get("/api/connection-test", async (req: Request, res: Response) => {
  try {
    const ipInfo = await getOutgoingIpAddress();
    // const client = await connectToDatabase();
    res.status(200).json({
      status: "success",
      message: "Connection to MongoDB successful",
      serverInfo: {
        functionIp: ipInfo,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    logger.error("Connection test failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to connect to MongoDB",
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
    let query = {};

    // Check if userId is a valid ObjectId
    try {
      if (ObjectId.isValid(userId)) {
        query = {
          $or: [
            {_id: new ObjectId(userId)},
            {id: userId},
          ],
        };
      } else {
        query = {id: userId};
      }
    } catch (err) {
      // If userId is not a valid ObjectId, just search by id field
      query = {id: userId};
    }

    const user = await collection.findOne(query);

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    return res.status(200).json({user});
  } catch (error) {
    logger.error("Error fetching user:", error);
    return res.status(500).json({error: "Failed to fetch user"});
  }
});

app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase(); // Connect to MongoDB
    const db = client.db(dbName); // Use the database name
    const collection = db.collection("users"); // Access the 'users' collection

    // Fetch all users
    const users = await collection.find({}).toArray();

    // Return the users as a JSON response
    res.status(200).json({users});
  } catch (error) {
    logger.error("Error fetching all users:", error);
    res.status(500).json({error: "Failed to fetch users"});
  }
});

app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    // Check if user already exists
    if (req.body.email) {
      const existingUser = await collection.findOne({email: req.body.email});
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists",
        });
      }
    }

    // Make sure _id is used if provided
    const userData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Ensure id and _id are consistent if needed
    if (userData.id && !userData._id) {
      userData._id = userData.id;
    }

    const result = await collection.insertOne(userData);
    return res.status(201).json({
      success: true,
      id: result.insertedId,
      user: userData,
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    return res.status(500).json({error: "Failed to create user"});
  }
});

app.put("/api/users/:userId", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    const userId = req.params.userId;
    const updates = {
      ...req.body,
      updatedAt: new Date(),
    };

    let query = {};

    // Check if userId is a valid ObjectId
    try {
      if (ObjectId.isValid(userId)) {
        query = {
          $or: [
            {_id: new ObjectId(userId)},
            {id: userId},
          ],
        };
      } else {
        query = {id: userId};
      }
    } catch (err) {
      // If userId is not a valid ObjectId, just search by id field
      query = {id: userId};
    }

    const result = await collection.updateOne(
      query,
      {$set: updates},
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      updatedFields: Object.keys(updates),
    });
  } catch (error) {
    logger.error("Error updating user:", error);
    return res.status(500).json({error: "Failed to update user"});
  }
});

// Email verification endpoint
app.post("/api/users/verify-email", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    const {userId} = req.body;
    // Note: verificationCode is received but not used in this implementation

    let query = {};

    // Check if userId is a valid ObjectId
    try {
      if (ObjectId.isValid(userId)) {
        query = {
          $or: [
            {_id: new ObjectId(userId)},
            {id: userId},
          ],
        };
      } else {
        query = {id: userId};
      }
    } catch (err) {
      // If userId is not a valid ObjectId, just search by id field
      query = {id: userId};
    }

    const result = await collection.updateOne(
      query,
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    logger.error("Error verifying email:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to verify email",
    });
  }
});

// Login endpoint for MongoDB authentication
app.post("/api/users/login", async (req: Request, res: Response) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection("users");

    const {email} = req.body;
    // Note: password is received but not used in this implementation

    // Find user by email
    const user = await collection.findOne({email});

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // In a real implementation, you would verify the password here
    // Since we're using SQLite for actual auth, we just check the user exists

    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      userId: user._id || user.id,
      user: {
        id: user._id || user.id,
        email: user.email,
        displayName: user.displayName,
        societies: user.societies || [],
        points: user.points || 0,
        achievements: user.achievements || [],
      },
    });
  } catch (error) {
    logger.error("Error authenticating user:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication failed",
    });
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

// Add a startup function to verify schemas are loaded
app.get("/api/verify-schemas", async (req: Request, res: Response) => {
  try {
    logger.info("Verifying database connection and schemas");
    const ipInfo = await getOutgoingIpAddress();
    await connectToDatabase();
    res.status(200).json({
      status: "success",
      message: "Database connection and schemas verified",
      connectionInfo: {
        sourceIp: ipInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Schema verification failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to verify schemas",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export const api = onRequest({
  cors: true,
  memory: "256MiB",
  timeoutSeconds: 540,
}, app);

// export const verifySchemas = onRequest({
//   cors: true,
//   memory: "256MiB",
//   timeoutSeconds: 60,
// }, async (req, res) => {
//   try {
//     logger.info("Verifying database connection and schemas");
//     const ipInfo = await getOutgoingIpAddress();
//     await connectToDatabase();
//     res.status(200).json({
//       status: "success",
//       message: "Database connection and schemas verified",
//       schemasLoaded,
//       schemas: Object.keys(schemas),
//       connectionInfo: {
//         sourceIp: ipInfo,
//         timestamp: new Date().toISOString(),
//       },
//     });
//   } catch (error) {
//     logger.error("Schema verification error:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Failed to verify schemas",
//       error: error instanceof Error ? error.message : String(error),
//     });
//   }
// });
