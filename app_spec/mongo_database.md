# Neighborly App - MongoDB Database Schema

This document outlines the database schemas used in the MongoDB backend for the Neighborly application.

## Overview

MongoDB is used for advanced queries, analytics, cross-community features, and storing structured data that requires complex relationships. The schemas are defined in JSON files in the `mongodb_schemas` directory.

## Collections

### `users`

Stores user profile information and role-based permissions.

```json
{
  "title": "User",
  "bsonType": "object",
  "required": ["_id", "email", "societies", "role"],
  "properties": {
    "_id": {
      "bsonType": "string"
    },
    "email": {
      "bsonType": "string"
    },
    "displayName": {
      "bsonType": "string"
    },
    "societies": {
      "bsonType": "array",
      "items": {
        "bsonType": "string"
      }
    },
    "role": {
      "bsonType": "string",
      "enum": ["President", "Treasurer", "Member", "Tenant", "Unverified"]
    },
    "points": {
      "bsonType": "int"
    },
    "achievements": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "id": { "bsonType": "string" },
          "dateUnlocked": { "bsonType": "date" }
        }
      }
    },
    "activityHistory": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "type": { "bsonType": "string" },
          "date": { "bsonType": "date" },
          "details": { "bsonType": "object" }
        }
      }
    }
  }
}
```

- **Purpose**: Stores extended user profile data and tracks user engagement by role
- **Fields**:
  - `_id`: Unique identifier (matches Supabase Auth UID)
  - `email`: User's email address
  - `displayName`: User's display name
  - `societies`: Array of society IDs the user belongs to
  - `role`: User's role (President, Treasurer, Member, Tenant, Unverified)
  - `points`: Accumulated activity points
  - `achievements`: Array of unlocked achievements with dates
  - `activityHistory`: Record of user's participation

### `societies`

Stores information about residential societies and neighborhoods.

```json
{
  "title": "Society",
  "bsonType": "object",
  "required": ["_id", "name"],
  "properties": {
    "_id": {
      "bsonType": "string"
    },
    "name": {
      "bsonType": "string"
    },
    "description": {
      "bsonType": "string"
    },
    "location": {
      "bsonType": "object",
      "properties": {
        "latitude": { "bsonType": "double" },
        "longitude": { "bsonType": "double" }
      }
    },
    "presidentId": {
      "bsonType": "string"
    },
    "treasurerId": {
      "bsonType": "string"
    },
    "memberCount": {
      "bsonType": "int"
    },
    "createdAt": {
      "bsonType": "date"
    }
  }
}
```

- **Purpose**: Stores society information and governance structure
- **Fields**:
  - `_id`: Unique identifier for the society
  - `name`: Society name
  - `description`: Society description
  - `location`: Geographical coordinates
  - `presidentId`: Reference to society president
  - `treasurerId`: Reference to society treasurer
  - `memberCount`: Number of society members
  - `createdAt`: Creation date

### `tournament_results`

Stores tournament results and statistics.

```json
{
  "title": "TournamentResult",
  "bsonType": "object",
  "required": ["_id", "tournamentId", "participants", "results"],
  "properties": {
    "_id": {
      "bsonType": "objectId"
    },
    "tournamentId": {
      "bsonType": "string"
    },
    "participants": {
      "bsonType": "array",
      "items": {
        "bsonType": "object",
        "properties": {
          "id": { "bsonType": "string" },
          "name": { "bsonType": "string" },
          "societyId": { "bsonType": "string" },
          "role": { "bsonType": "string" }
        }
      }
    },
    "results": {
      "bsonType": "object",
      "properties": {
        "winner": { "bsonType": "string" },
        "runnerUp": { "bsonType": "string" },
        "matches": {
          "bsonType": "array",
          "items": {
            "bsonType": "object"
          }
        }
      }
    }
  }
}
```

- **Purpose**: Records tournament outcomes, participants, and match results
- **Fields**:
  - `_id`: MongoDB ObjectId
  - `tournamentId`: Reference to the tournament
  - `participants`: Array of participant details including roles
  - `results`: Nested object containing winners and matches

### `events`

Stores detailed event information and tracking.

```json
{
  "title": "Event",
  "bsonType": "object",
  "required": ["_id", "title", "societyId", "organizer", "status"],
  "properties": {
    "_id": {
      "bsonType": "string"
    },
    "title": {
      "bsonType": "string"
    },
    "description": {
      "bsonType": "string"
    },
    "societyId": {
      "bsonType": "string"
    },
    "date": {
      "bsonType": "date"
    },
    "location": {
      "bsonType": "object",
      "properties": {
        "name": { "bsonType": "string" },
        "coordinates": {
          "bsonType": "object",
          "properties": {
            "latitude": { "bsonType": "double" },
            "longitude": { "bsonType": "double" }
          }
        }
      }
    },
    "organizer": {
      "bsonType": "object",
      "properties": {
        "id": { "bsonType": "string" },
        "name": { "bsonType": "string" },
        "role": { "bsonType": "string" }
      }
    },
    "isIntersociety": {
      "bsonType": "bool"
    },
    "societies": {
      "bsonType": "array",
      "items": {
        "bsonType": "string"
      }
    },
    "status": {
      "bsonType": "string",
      "enum": ["scheduled", "ongoing", "completed"]
    },
    "progress": {
      "bsonType": "int"
    },
    "outcome": {
      "bsonType": "string"
    },
    "photos": {
      "bsonType": "int"
    }
  }
}
```

- **Purpose**: Stores comprehensive event data for all event types
- **Fields**:
  - `_id`: Unique identifier
  - `title`: Event title
  - `description`: Detailed description
  - `societyId`: Primary society ID
  - `date`: Event date and time
  - `location`: Location name and coordinates
  - `organizer`: Details of event organizer including role
  - `isIntersociety`: Whether event spans multiple societies
  - `societies`: Array of participating societies
  - `status`: Event status (scheduled, ongoing, completed)
  - `progress`: Percentage of completion
  - `outcome`: Outcome details for completed events
  - `photos`: Number of event photos

## MongoDB Indexes

```javascript
// Indexes for users collection
db.collection('users').createIndex({ societies: 1 });
db.collection('users').createIndex({ points: -1 });
db.collection('users').createIndex({ role: 1 });

// Indexes for tournament results collection
db.collection('tournament_results').createIndex({ tournamentId: 1 }, { unique: true });

// Indexes for societies collection
db.collection('societies').createIndex({ name: 1 });
db.collection('societies').createIndex({ "location.coordinates": "2dsphere" });

// Indexes for events collection
db.collection('events').createIndex({ societyId: 1 });
db.collection('events').createIndex({ status: 1 });
db.collection('events').createIndex({ date: 1 });
db.collection('events').createIndex({ "organizer.role": 1 });
```

These indexes optimize common query patterns in the application, such as finding events by society, filtering events by status, and retrieving user leaderboards by points.
