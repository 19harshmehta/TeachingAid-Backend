const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  polls: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);