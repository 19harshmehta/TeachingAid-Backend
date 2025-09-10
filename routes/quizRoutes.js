const express = require('express');
const router = express.Router();
const { createQuiz, getQuizByCode, submitQuizVote, updateQuizStatus, relaunchQuiz } = require('../controllers/quizController');
const auth = require('../middleware/authMiddleware');

router.post('/create', auth, createQuiz);
router.get('/:code', getQuizByCode);
router.post('/submit', submitQuizVote);

router.put('/:code/status', auth, updateQuizStatus);
router.post('/relaunch', auth, relaunchQuiz);

module.exports = router;