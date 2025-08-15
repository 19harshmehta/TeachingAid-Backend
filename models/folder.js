const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  polls: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Poll' }],
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);
