const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  topic: {
    type: String, // New field
    default: null
  },
  options: {
    type: [String], // Array of options
    required: true
  },
  votes: {
    type: [Number], // Vote counts for each option
    default: []
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  votedFingerprints: {
    type: [String], // We'll use this to restrict vote duplication
    default: []
  },
  allowMultiple: { 
    type: Boolean, default: false 
  }

  
}, { timestamps: true });

module.exports = mongoose.model('Poll', pollSchema);
