# Neighborly App - Database Structure Documentation

This document outlines the database schemas used across the different database systems in the Neighborly application.

## Overview

Neighborly uses a hybrid database approach:
1. **Firebase Firestore**: Primary database for real-time social features
2. **MongoDB**: Secondary database for complex analytics and cross-community features
3. **SQLite**: Local storage for client-side caching and offline functionality

## 1. SQLite Local Database

SQLite is used for local data persistence on the user's device. The database is initialized in `src/utils/database.js`.

### Tables

#### `preferences`
Stores user preferences and settings locally.

```sql
CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);
```

- **Purpose**: Stores key-value pairs for user preferences
- **Fields**:
  - `id`: Auto-incrementing unique identifier
  - `key`: Preference name/identifier (unique)
  - `value`: JSON-stringified preference value

#### `posts_cache`
Caches posts from the network for offline access.

```sql
CREATE TABLE IF NOT EXISTS posts_cache (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
```

- **Purpose**: Local cache of posts to improve performance and enable offline reading
- **Fields**:
  - `id`: Unique post identifier (matches the server-side ID)
  - `data`: JSON-stringified post data
  - `timestamp`: Cache timestamp for invalidation

#### `draft_posts`
Stores locally-created posts that haven't been published yet.

```sql
CREATE TABLE IF NOT EXISTS draft_posts (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
```

- **Purpose**: Stores draft posts until they're ready to be published
- **Fields**:
  - `id`: Unique draft identifier
  - `data`: JSON-stringified post data
  - `timestamp`: Creation or last edit timestamp

## 2. MongoDB Database

MongoDB is used for advanced queries, analytics, and storing structured data that requires complex queries. The schemas are defined in JSON files in the `mongodb_schemas` directory.

### Collections

#### `users`
Stores user profile information and settings.

```json
{
  "title": "User",
  "bsonType": "object",
  "required": ["_id", "email", "societies"],
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
    }
  }
}
```

- **Purpose**: Stores user profile data and tracks user engagement
- **Fields**:
  - `_id`: Unique identifier (matches Firebase Auth UID)
  - `email`: User's email address
  - `displayName`: User's display name
  - `societies`: Array of society IDs the user belongs to
  - `points`: Accumulated activity points
  - `achievements`: Array of unlocked achievements with dates

#### `tournament_results`
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
          "societyId": { "bsonType": "string" }
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
  - `participants`: Array of participant details
  - `results`: Nested object containing winners and matches

### MongoDB Indexes

Indexes are created in `src/scripts/create_indexes.mjs`:

- **users collection**:
  - `{ societies: 1 }`: For efficient queries filtering by society
  - `{ points: -1 }`: For leaderboard queries

- **tournament_results collection**:
  - `{ tournamentId: 1 }`: Unique index for efficient tournament lookups

## 3. Firebase Database

Firebase is used as the primary real-time database for social features and other dynamic content.

### Realtime Database Rules

Basic security rules defined in `database.rules.json`:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

These rules ensure that only authenticated users can read from or write to the database.

### Firestore Collections (Inferred from app usage)

While specific Firestore schema definitions aren't directly visible in the codebase, based on the application and references, the following collections are used:

#### `societies`
Communities/neighborhoods in the application.

- **Fields**:
  - `id`: Unique identifier
  - `name`: Society name
  - `description`: Society description
  - `location`: GeoPoint for map placement
  - `members`: Number of members or reference to members
  - `settings`: Society configuration settings

#### `posts`
User-created content within societies.

- **Fields**:
  - `id`: Unique identifier
  - `title`: Post title
  - `content`: Post content (text)
  - `authorId`: Reference to creator
  - `societyId`: Reference to society
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp
  - `images`: Array of image references (optional)
  - `likes`: Counter or array of user IDs

#### `tournaments`
Community tournament events.

- **Fields**:
  - `id`: Unique identifier
  - `name`: Tournament name
  - `date`: Scheduled date
  - `description`: Tournament description
  - `participants`: Array of participant references
  - `societyId`: Reference to society
  - `status`: Current status (scheduled, ongoing, completed)

#### `events`
Community events and activities.

- **Fields**:
  - `id`: Unique identifier
  - `title`: Event title
  - `description`: Event description
  - `location`: Location details or GeoPoint
  - `date`: Event date and time
  - `organizerId`: Reference to organizer
  - `societyId`: Reference to society
  - `participants`: Array of participant references

## Data Flow Between Databases

- **Primary Data Flow**: Firebase Firestore ↔ Client Application
- **Analytics & Complex Queries**: MongoDB ← Firebase (processed data)
- **Local Caching**: SQLite ← Firebase (selected data for offline use)
- **Draft Content**: SQLite → Firebase (when publishing drafts)

## Conclusion

The Neighborly app employs a strategic hybrid database approach:

1. **Firebase Firestore** handles real-time social features and content that needs immediate updates
2. **MongoDB** manages complex data analytics, cross-community metrics, and tournament statistics
3. **SQLite** provides offline capability, local caching, and draft storage

This architecture balances real-time capabilities with powerful analytics while ensuring good performance and offline functionality.
