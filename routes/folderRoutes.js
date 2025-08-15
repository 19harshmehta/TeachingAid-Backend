const express = require('express');
const router = express.Router();
const { createFolder, getFolders, addPollToFolder } = require('../controllers/folderController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, createFolder);
router.get('/', auth, getFolders);
router.post('/:folderId/polls/:pollCode', auth, addPollToFolder);

module.exports = router;
