const express = require('express');
const router = express.Router();
const { createPoll, getPollResults } = require('../controllers/pollController');
const auth = require('../middleware/authMiddleware');
const { getPollByCode, votePoll } = require('../controllers/pollController');
const { relaunchPoll } = require('../controllers/pollController');
const { getMyPolls } = require('../controllers/pollController');
const { updatePollStatus } = require('../controllers/pollController');



router.post('/create', auth, createPoll);


router.post('/vote', votePoll);
router.post('/relaunch', auth, relaunchPoll);
router.get('/mypolls', auth, getMyPolls);
router.get('/:code', getPollByCode);
router.get('/results/:code', getPollResults);
router.put('/:code/status', updatePollStatus);

module.exports = router;
