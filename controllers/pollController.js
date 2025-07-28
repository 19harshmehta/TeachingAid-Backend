const Poll = require('../models/Poll');
const generateCode = require('../utils/generateCode');

exports.createPoll = async (req, res) => {
  const { question, options } = req.body;

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
      options,
      votes: new Array(options.length).fill(0),
      code,
      createdBy: req.user.id
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
      isActive: poll.isActive
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching poll', error: err.message });
  }
};

exports.votePoll = async (req, res) => {
  const { code, optionIndex, fingerprint } = req.body;

  if (!code || typeof optionIndex !== 'number' || !fingerprint) {
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

    poll.votes[optionIndex] += 1;
    poll.votedFingerprints.push(fingerprint);
    await poll.save();

    // Emit real-time update to poll room
    const io = req.app.get('io');
    io.to(code).emit('vote_update', {
      poll
    });

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
      pollId: poll._id
    });
  } catch (err) {
    res.status(500).json({ message: 'Error relaunching poll', error: err.message });
  }
};

exports.getMyPolls = async (req, res) => {
  const userId = req.user.id;

  try {
    const polls = await Poll.find({ createdBy: userId }).sort({ createdAt: -1 });

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

    poll.isActive = isActive;
    await poll.save();

    res.status(200).json({ message: `Poll status updated to ${isActive}` });
  } catch (error) {
    console.error('Error updating poll status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
