import mongoose from 'mongoose';

// User schema - updated to match users.json
const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Use Firebase UID
  email: { type: String, required: true },
  displayName: String,
  societies: { type: [String], required: true },
  points: { type: Number, default: 0 },
  achievements: [{
    id: { type: String },
    dateUnlocked: { type: Date }
  }]
}, { timestamps: true });

// Tournament Results schema - updated to match tournaments_result.json
const tournamentResultSchema = new mongoose.Schema({
  tournamentId: { type: String, required: true },
  participants: [{
    id: { type: String },
    name: { type: String },
    societyId: { type: String }
  }],
  results: {
    winner: { type: String },
    runnerUp: { type: String },
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