const Poll = require('../models/Poll');
const generateCode = require('../utils/generateCode');
const Folder = require('../models/folder');

exports.createPoll = async (req, res) => {
  const { question, topic, options, allowMultiple } = req.body;

  if (!question || !options || options.length < 2) {
    return res.status(400).json({ message: 'Question and at least 2 options are required' });
  }

  try {
    // Generate unique poll code
    let code;
    let exists = true;
    while (exists) {
      code = generateCode();
      const existingPoll = await Poll.findOne({ code });
      exists = !!existingPoll;
    }

    const poll = await Poll.create({
      question,
      topic: topic || null, // store topic if given
      options,
      votes: new Array(options.length).fill(0),
      code,
      createdBy: req.user.id,
      allowMultiple: !!allowMultiple
    });

    res.status(201).json({
      message: 'Poll created successfully',
      pollId: poll._id,
      code: poll.code
    });
  } catch (err) {
    res.status(500).json({ message: 'Poll creation failed', error: err.message });
  }
};

exports.getPollByCode = async (req, res) => {
  const code = req.params.code;

  try {
    const poll = await Poll.findOne({ code });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    res.status(200).json({
      question: poll.question,
      options: poll.options,
      code: poll.code,
      isActive: poll.isActive,
      allowMultiple: !!poll.allowMultiple
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching poll', error: err.message });
  }
};

exports.votePoll = async (req, res) => {
  const { code, optionIndex, optionIndices, fingerprint } = req.body;

  if (!code || !fingerprint) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const poll = await Poll.findOne({ code });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (!poll.isActive) {
      return res.status(403).json({ message: 'Poll is closed. Voting not allowed.' });
    }

    if (poll.votedFingerprints.includes(fingerprint)) {
      return res.status(403).json({ message: 'You have already voted in this poll' });
    }

    let indicesToIncrement = [];

    if (poll.allowMultiple) {
      // Expect array of indices
      if (!Array.isArray(optionIndices) || optionIndices.length === 0) {
        return res.status(400).json({ message: 'optionIndices (array) required for this poll' });
      }

      // sanitize & dedupe
      const uniq = new Set();
      for (const i of optionIndices) {
        const idx = Number(i);
        if (Number.isInteger(idx) && idx >= 0 && idx < poll.options.length) uniq.add(idx);
      }
      indicesToIncrement = Array.from(uniq);

      if (indicesToIncrement.length === 0) {
        return res.status(400).json({ message: 'No valid selections' });
      }
    } else {
      // Expect single index
      if (typeof optionIndex !== 'number') {
        return res.status(400).json({ message: 'optionIndex (number) required for this poll' });
      }
      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        return res.status(400).json({ message: 'Invalid optionIndex' });
      }
      indicesToIncrement = [optionIndex];
    }

    // increment votes
    indicesToIncrement.forEach(i => {
      poll.votes[i] = (poll.votes[i] || 0) + 1;
    });

    // fingerprint lock
    poll.votedFingerprints.push(fingerprint);
    await poll.save();

    // realtime emit - keep same shape to not break frontend
    const io = req.app.get('io');
    io.to(code).emit('vote_update', { poll });

    res.status(200).json({ message: 'Vote submitted successfully', votes: poll.votes });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting vote', error: err.message });
  }
};


exports.relaunchPoll = async (req, res) => {
  const { pollId, resetVotes, generateNewCode } = req.body;
  const userId = req.user.id;

  try {
    const poll = await Poll.findById(pollId);

    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (resetVotes) {

      const historyEntry = {
        votes: poll.votes,
        votedFingerprints: poll.votedFingerprints.length,
        timestamp: new Date()
      };

      // Instead of pushing, overwrite the last entry
      if (poll.history.length > 0) {
        poll.history[poll.history.length - 1] = historyEntry;
      } else {
        poll.history.push(historyEntry);
      }

      poll.votes = new Array(poll.options.length).fill(0);
      poll.votedFingerprints = [];
    }

    if (generateNewCode) {
      let code;
      let exists = true;
      while (exists) {
        code = generateCode();
        const existing = await Poll.findOne({ code });
        exists = !!existing;
      }
      poll.code = code;
    }

    poll.isActive = true;
    await poll.save();

    res.status(200).json({
      message: 'Poll relaunched successfully',
      code: poll.code,
      pollId: poll._id,
      history: poll.history

    });
  } catch (err) {
    res.status(500).json({ message: 'Error relaunching poll', error: err.message });
  }
};

exports.getMyPolls = async (req, res) => {
  const userId = req.user.id;
  const { topic } = req.query; // optional filtering

  try {
    const filter = { createdBy: userId };
    if (topic) {
      filter.topic = topic;
    }

    const polls = await Poll.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ polls });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch polls', error: err.message });
  }
};


exports.getPollResults = async (req, res) => {
  try {
    const { code } = req.params;

    const poll = await Poll.findOne({ code });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Directly use index to map options to vote counts
    const result = poll.options.map((option, index) => ({
      option,
      votes: poll.votes[index] || 0
    }));

    res.status(200).json({
      question: poll.question,
      results: result
    });
  } catch (error) {
    console.error('Error fetching poll results:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updatePollStatus = async (req, res) => {
  try {
    const { code } = req.params;
    const { isActive } = req.body;

    const poll = await Poll.findOne({ code });
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    const historyEntry = {
      votes: poll.votes,
      votedFingerprints: poll.votedFingerprints.length,
      timestamp: new Date()
    };
    if (poll.history.length > 0) {
      poll.history[poll.history.length - 1] = historyEntry;
    } else {
      poll.history.push(historyEntry);
    }
    poll.isActive = isActive;
    await poll.save();

    res.status(200).json({ message: `Poll status updated to ${isActive}` });
  } catch (error) {
    console.error('Error updating poll status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const multer = require('multer');
const Papa = require('papaparse');
// const Poll = require('../models/Poll');
// const generateCode = require('../utils/generateCode');

// Multer (in-memory) for CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const ok = /csv$/.test(file.mimetype) || /\.csv$/i.test(file.originalname);
    if (!ok) return cb(new Error('Only CSV files are allowed'));
    cb(null, true);
  }
});

// export the multer middleware
exports.csvUpload = upload;

exports.bulkCreateFromCSV = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file required (field name: file)' });

    const csvText = req.file.buffer.toString('utf8');
    const { data, errors } = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (errors && errors.length) {
      return res.status(400).json({ message: 'CSV parse error', errors });
    }

    const toBool = (v) => {
      if (v === undefined || v === null) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'y';
    };

    const extractOptions = (row) => {
      if (row.options) {
        return String(row.options)
          .split('|')
          .map(o => o.trim())
          .filter(Boolean);
      }
      const entries = Object.entries(row)
        .filter(([k]) => /^option\d+$/i.test(k))
        .sort((a, b) => {
          const ai = parseInt(a[0].match(/\d+/)[0], 10);
          const bi = parseInt(b[0].match(/\d+/)[0], 10);
          return ai - bi;
        })
        .map(([, v]) => (v ?? '').toString().trim())
        .filter(Boolean);
      return entries;
    };

    const generateUniqueCode = async () => {
      let code;
      let exists = true;
      while (exists) {
        code = generateCode();
        const existing = await Poll.findOne({ code }).lean();
        exists = !!existing;
      }
      return code;
    };

    const created = [];
    const skipped = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      const question = (row.question || '').toString().trim();
      if (!question) {
        skipped.push({ row: i + 1, reason: 'Missing question' });
        continue;
      }

      const options = extractOptions(row);
      if (!Array.isArray(options) || options.length < 2) {
        skipped.push({ row: i + 1, reason: 'At least 2 options required' });
        continue;
      }

      const topic = (row.topic || '').toString().trim() || null;
      const allowMultiple = toBool(row.allowMultiple);
      const folderName = (row.folder || '').toString().trim();

      const code = await generateUniqueCode();

      const pollDoc = {
        question,
        topic,
        options,
        votes: new Array(options.length).fill(0),
        code,
        createdBy: req.user.id,
        isActive: true,
        allowMultiple
      };

      try {
        const poll = await Poll.create(pollDoc);
        created.push({ row: i + 1, pollId: poll._id, code: poll.code });

        // handle folder
        if (folderName) {
          let folder = await Folder.findOne({ name: folderName, createdBy: req.user.id });

          if (!folder) {
            folder = await Folder.create({
              name: folderName,
              createdBy: req.user.id,
              polls: []
            });
          }

          folder.polls.push(poll._id);
          await folder.save();
        }

      } catch (e) {
        skipped.push({ row: i + 1, reason: e.message });
      }
    }

    return res.status(201).json({
      message: 'Bulk create complete',
      createdCount: created.length,
      created,
      skippedCount: skipped.length,
      skipped
    });
  } catch (err) {
    return res.status(500).json({ message: 'Bulk create failed', error: err.message });
  }
};


exports.deletePoll = async (req, res) => {
  const code = req.params.code;
  const userId = req.user.id;

  try {
    const poll = await Poll.findOne({ code });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (poll.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You did not create this poll' });
    }

    await Poll.deleteOne({ code });

    await Folder.updateMany(
      { polls: poll._id },
      { $pull: { polls: poll._id } }
    );

    res.status(204).json({message : 'Poll Deleted sucessfully'});
  } catch (err) {
    console.error('Error deleting poll:', err);
    res.status(500).json({ message: 'Error deleting poll', error: err.message });
  }
};


