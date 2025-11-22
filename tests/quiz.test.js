const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// --- Mocking Setup ---
// Mock the authMiddleware BEFORE it's imported by the routes file
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  // Attach a mock user object to the request.
  // Use a simple string for the ID to avoid the scope issue.
  req.user = { id: 'mockUserId12345' };
  next(); // Continue to the next middleware or the controller
});

// Mock the Mongoose models to prevent actual database calls
jest.mock('../models/Quiz');
jest.mock('../models/Poll');

// Mock the code generator to make results predictable for our test
jest.mock('../utils/generateCode');
// --- End Mocking Setup ---


// Now, import the router, which will automatically use our mocked middleware
const quizRoutes = require('../routes/quizRoutes');
const Quiz = require('../models/Quiz');
const Poll = require('../models/Poll');
const generateCode = require('../utils/generateCode');

// Setup a minimal express app to host our router
const app = express();
app.use(express.json());
app.use('/api/quiz', quizRoutes);


describe('POST /api/quiz/create', () => {

  beforeEach(() => {
    // Reset mocks before each test to ensure they are isolated
    jest.clearAllMocks();
  });

  it('should create a quiz and return a 201 status', async () => {
    const mockQuizData = {
      title: 'My First Quiz',
      description: 'A simple test quiz',
      questions: [
        {
          question: 'What is 2+2?',
          options: ['3', '4', '5'],
          allowMultiple: false
        }
      ]
    };

    // --- Mock Database and Utils Behavior ---
    Quiz.findOne.mockResolvedValue(null);
    Poll.findOne.mockResolvedValue(null);

    generateCode
      .mockReturnValueOnce('QUIZ01')
      .mockReturnValueOnce('POLL01');

    const mockCreatedPoll = { _id: 'mockPollId' };
    const mockCreatedQuiz = { _id: 'mockQuizId', code: 'QUIZ01' };
    Poll.create.mockResolvedValue(mockCreatedPoll);
    Quiz.create.mockResolvedValue(mockCreatedQuiz);
    Poll.updateMany.mockResolvedValue({ nModified: 1 });
    // --- End Mock Behavior ---


    // --- Execute the Test ---
    const res = await request(app)
      .post('/api/quiz/create')
      .send(mockQuizData);

    // --- Assertions ---
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Quiz created successfully');
    expect(res.body.code).toBe('QUIZ01');
    expect(Quiz.create).toHaveBeenCalledTimes(1);
    expect(Poll.create).toHaveBeenCalledTimes(1);
  });

  it('should return a 400 status if title is missing', async () => {
    const badData = {
      questions: [{ question: 'Q1', options: ['A', 'B'] }]
    };

    const res = await request(app)
      .post('/api/quiz/create')
      .send(badData);
      
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Title and at least one question are required');
  });
});