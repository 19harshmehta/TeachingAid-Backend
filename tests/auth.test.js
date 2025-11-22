// tests/auth.test.js

const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');

// Mock dependencies
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Mock implementations
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../models/User');

// Setup minimal Express app to use in Supertest
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Routes (/api/auth)', () => {

  const mockUser = {
    _id: 'mockUserId12345',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    toObject: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(true)
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- /health Check ---
  describe('GET /health', () => {
    it('should return 200 and a success message', async () => {
      const res = await request(app).get('/api/auth/health');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Server is running');
    });
  });
//--------------------------------------------------------------------------------
  // --- /register Tests ---
  describe('POST /register', () => {
    const registrationData = {
      name: 'New User',
      email: 'new@example.com',
      password: 'password123'
    };

    it('should successfully register a new user', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('newhashedpassword');
      User.create.mockResolvedValue({ message: 'Registered successfully' });

      const res = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registered successfully');
      expect(User.findOne).toHaveBeenCalledWith({ email: registrationData.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(registrationData.password, 10);
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 400 if user already exists', async () => {
      User.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });
  });
//--------------------------------------------------------------------------------
  // --- /login Tests ---
  describe('POST /login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'correctpassword'
    };
    const mockToken = 'mockJwtToken123';

    it('should successfully log in a user and return a JWT', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true); 
      // Set the environment variable for JWT_SECRET just for this test suite
      process.env.JWT_SECRET = 'test_secret'; 
      jwt.sign.mockReturnValue(mockToken);

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(res.status).toBe(200);
      expect(res.body.token).toBe(mockToken);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockUser._id.toString(), email: mockUser.email }),
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); 

      const res = await request(app)
        .post('/api/auth/login')
        .send({ ...loginData, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
    
    it('should return 404 if user not found', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });
});