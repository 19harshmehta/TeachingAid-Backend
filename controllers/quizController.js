const Quiz = require('../models/Quiz');
const Poll = require('../models/Poll');
const generateCode = require('../utils/generateCode');
const generateUniqueCode = require('../utils/generateUniqueCode');

exports.createQuiz = async (req, res) => {
  const { title, description, questions } = req.body;

  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: 'Title and at least one question are required' });
  }

  try {
    // Refactor Canditat
    // Generate unique quiz code
    const code = await generateUniqueCode(Quiz, 'code');

    const createdPolls = [];
    for (const q of questions) {
      const pollCode = await generateUniqueCode(Poll, 'code');

      const newPoll = await Poll.create({
        question: q.question,
        options: q.options,
        votes: new Array(q.options.length).fill(0),
        code: pollCode,
        createdBy: req.user.id,
        allowMultiple: !!q.allowMultiple,
      });
      createdPolls.push(newPoll._id);
    }

    const quiz = await Quiz.create({
      title,
      description,
      code,
      polls: createdPolls,
      createdBy: req.user.id
    });

    // Associate the quiz with each poll
    await Poll.updateMany({ _id: { $in: createdPolls } }, { $set: { quiz: quiz._id } });

    res.status(201).json({
      message: 'Quiz created successfully',
      quizId: quiz._id,
      code: quiz.code
    });
  } catch (err) {
    res.status(500).json({ message: 'Quiz creation failed', error: err.message });
  }
};

exports.getQuizByCode = async (req, res) => {
  const { code } = req.params;

  try {
    const quiz = await Quiz.findOne({ code }).populate('polls');
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.status(200).json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching quiz', error: err.message });
  }
};

exports.submitQuizVote = async (req, res) => {
    const { code, votes, fingerprint } = req.body;

    if (!code || !votes || !fingerprint) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const quiz = await Quiz.findOne({ code });
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        if (!quiz.isActive) {
            return res.status(403).json({ message: 'Quiz is closed. Voting not allowed.' });
        }

        for (const vote of votes) {
            const { pollId, optionIndex, optionIndices } = vote;
            const poll = await Poll.findById(pollId);

            if (!poll) continue;

            if (poll.votedFingerprints.includes(fingerprint)) {
                // User has already voted in one of the polls of this quiz.
                // You can decide on the behavior here. For now, we'll skip the vote.
                continue;
            }

            let indicesToIncrement = [];

            if (poll.allowMultiple) {
                if (Array.isArray(optionIndices) && optionIndices.length > 0) {
                    const uniq = new Set();
                    for (const i of optionIndices) {
                        const idx = Number(i);
                        if (Number.isInteger(idx) && idx >= 0 && idx < poll.options.length) uniq.add(idx);
                    }
                    indicesToIncrement = Array.from(uniq);
                }
            } else {
                if (typeof optionIndex === 'number' && optionIndex >= 0 && optionIndex < poll.options.length) {
                    indicesToIncrement = [optionIndex];
                }
            }

            if (indicesToIncrement.length > 0) {
                indicesToIncrement.forEach(i => {
                    poll.votes[i] = (poll.votes[i] || 0) + 1;
                });

                poll.votedFingerprints.push(fingerprint);
                await poll.save();

                const io = req.app.get('io');
                io.to(poll.code).emit('vote_update', { poll });
            }
        }

        res.status(200).json({ message: 'Votes submitted successfully' });

    } catch (err) {
        res.status(500).json({ message: 'Error submitting votes', error: err.message });
    }
};

exports.updateQuizStatus = async (req, res) => {
    const { code } = req.params;
    const { isActive } = req.body;
    const userId = req.user.id;

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive (boolean) is required' });
    }

    try {
        const quiz = await Quiz.findOne({ code });

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        if (quiz.createdBy.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Update the quiz status
        quiz.isActive = isActive;
        await quiz.save();

        // Also update the status of all polls within the quiz
        await Poll.updateMany({ _id: { $in: quiz.polls } }, { $set: { isActive } });

        res.status(200).json({ message: `Quiz status updated to ${isActive}` });
    } catch (err) {
        res.status(500).json({ message: 'Error updating quiz status', error: err.message });
    }
};

exports.relaunchQuiz = async (req, res) => {
    const { quizId, resetVotes, generateNewCode } = req.body;
    const userId = req.user.id;

    try {
        const quiz = await Quiz.findById(quizId).populate('polls');

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }
        if (quiz.createdBy.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (resetVotes) {
            for (const poll of quiz.polls) {
                // Archive current results
                const historyEntry = {
                    votes: poll.votes,
                    votedFingerprints: poll.votedFingerprints.length,
                    timestamp: new Date()
                };
                poll.history.push(historyEntry);

                // Reset votes and fingerprints
                poll.votes = new Array(poll.options.length).fill(0);
                poll.votedFingerprints = [];
                await poll.save();
            }
        }

        if (generateNewCode) {
            //REfactor Canditat 
            // Generate new code for the quiz
            
            let quizExists = true;
            while (quizExists) {
                quiz.code = await generateUniqueCode(Quiz, 'code');
            }
            
            // Generate new codes for each poll within the quiz
            for (const poll of quiz.polls) {
                let newPollCode;
                let pollExists = true;
                while (pollExists) {
                    poll.code = await generateUniqueCode(Poll, 'code');
                }
                poll.code = newPollCode;
                await poll.save();
            }
        }

        // Relaunch the quiz and activate all its polls
        quiz.isActive = true;
        await Poll.updateMany({ _id: { $in: quiz.polls.map(p => p._id) } }, { $set: { isActive: true } });
        
        await quiz.save();

        res.status(200).json({
            message: 'Quiz relaunched successfully',
            code: quiz.code,
            quizId: quiz._id,
        });

    } catch (err) {
        res.status(500).json({ message: 'Error relaunching quiz', error: err.message });
    }
};