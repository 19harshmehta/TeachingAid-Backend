const express = require('express');
const router = express.Router();
const { register, login, healthCheck } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);


// Health check route
router.get('/health', healthCheck);


module.exports = router;
