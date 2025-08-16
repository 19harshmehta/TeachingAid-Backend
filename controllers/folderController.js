const Folder = require('../models/folder.js');
const Poll = require('../models/Poll.js');


exports.createFolder = async (req, res) => {
  try {
    const folder = await Folder.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user.id
    });
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ createdBy: req.user.id }).populate('polls');
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPollToFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const poll = await Poll.findOne({ code: req.params.pollCode }); // search by code
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    // Avoid duplicates
    if (folder.polls.includes(poll._id)) {
      return res.status(400).json({ message: 'Poll already in folder' });
    }

    folder.polls.push(poll._id);
    await folder.save();

    res.json({ message: 'Poll added to folder', folder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPollsOfFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const folder = await Folder.findById(folderId).populate('polls'); 
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    res.json({
      folderId: folder._id,
      folderName: folder.name,
      polls: folder.polls
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
