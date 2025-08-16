const express = require('express');
const router = express.Router();
const { createFolder, getFolders, addPollToFolder,getPollsOfFolder } = require('../controllers/folderController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, createFolder);
router.get('/', auth, getFolders);
router.get('/:folderId/polls', getPollsOfFolder);
router.post('/:folderId/polls/:pollCode', auth, addPollToFolder);

module.exports = router;
