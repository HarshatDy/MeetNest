import mongoose from 'mongoose';

// User schema
const userSchema = new mongoose.Schema({
  _id: String, // Use Firebase UID
  email: { type: String, required: true },
  displayName: String,
  societies: [String],
  points: { type: Number, default: 0 },
  achievements: [{
    id: String,
    dateUnlocked: Date
  }]
}, { timestamps: true });

// Tournament Results schema
const tournamentResultSchema = new mongoose.Schema({
  tournamentId: { type: String, required: true },
  participants: [{
    id: String,
    name: String,
    societyId: String
  }],
  results: {
    winner: String,
    runnerUp: String,
    matches: [{
      round: Number,
      player1: String,
      player2: String,
      winner: String,
      score: String
    }]
  }
}, { timestamps: true });

// Create models if mongoose is connected
let User = mongoose.models.User || mongoose.model('User', userSchema);
let TournamentResult = mongoose.models.TournamentResult || 
  mongoose.model('TournamentResult', tournamentResultSchema);

export { User, TournamentResult };