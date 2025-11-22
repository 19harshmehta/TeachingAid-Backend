// tests/poll.test.js

jest.mock('../utils/generateCode');
const request = require('supertest');
const express = require('express');
const pollRoutes = require('../routes/pollRoutes');
const pollController = require('../controllers/pollController'); 
const { Readable } = require('stream');

// --- Mocking Setup ---
// Constant ID for mock user
const mockCreatorId = 'mockUserId12345';

// FIX: Mock authMiddleware directly inside jest.mock to avoid hoisting error
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id: mockCreatorId, email: 'test@creator.com' };
  next();
});

// Mock Mongoose Models
const Poll = require('../models/Poll');
const Folder = require('../models/folder');
jest.mock('../models/Poll');
jest.mock('../models/folder');

// Mock Utility for code generation
const generateCode = require('../utils/generateCode');

// Mock Socket.IO instance attached to app
const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

// Mock implementations for CSV processing for the bulk create test
const Papa = require('papaparse');
jest.mock('papaparse', () => ({
    parse: jest.fn((csvText, config) => ({
        data: [
            { question: 'Q1', options: 'A|B|C', topic: 'Topic1', allowMultiple: 'true', folder: 'TestFolder' },
            { question: 'Q2', options: 'Yes|No', topic: 'Topic2', allowMultiple: 'false', folder: 'TestFolder' },
            { question: 'Q3', options: 'One', topic: 'Topic3', allowMultiple: 'false' }, // Will be skipped: options < 2
        ],
        errors: [],
    })),
}));

// Mock Multer middleware logic
const mockMulterMiddleware = (req, res, next) => {
    req.file = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.from('dummy csv content'),
    };
    next();
};
pollController.csvUpload = {
  single: jest.fn(() => mockMulterMiddleware)
};

// Setup minimal Express app to use in Supertest
const app = express();
app.use(express.json());
app.use('/api/poll', pollRoutes);
app.set('io', mockIo); 


describe('Poll Routes (/api/poll)', () => {

    const mockPollId = 'pollId123';
    const mockPollCode = 'XYZ123';
    const mockPoll = (code = mockPollCode) => ({
        _id: mockPollId,
        question: 'What is your favorite color?',
        options: ['Red', 'Green', 'Blue'],
        votes: [10, 5, 1],
        code: code,
        createdBy: mockCreatorId,
        isActive: true,
        allowMultiple: false,
        votedFingerprints: [],
        history: [],
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnThis(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Set a predictable code for single-poll tests
        generateCode.mockImplementation(() => 'TEMPCODE');
    });

//--------------------------------------------------------------------------------
    // --- POST /create Tests ---
    describe('POST /create', () => {
        it('should create a new poll and return 201', async () => {
            const newPoll = mockPoll("TEMPCODE");
            Poll.findOne.mockResolvedValueOnce(null);
            Poll.create.mockResolvedValue(newPoll);

            const res = await request(app)
                .post('/api/poll/create')
                .send({
                    question: 'New Question',
                    options: ['Opt A', 'Opt B'],
                    allowMultiple: true
                });

            expect(res.status).toBe(201);
            expect(res.body.code).toBe('TEMPCODE');
            expect(Poll.create).toHaveBeenCalledWith(
                expect.objectContaining({ allowMultiple: true, createdBy: mockCreatorId })
            );
        });
    });

//--------------------------------------------------------------------------------
    // --- POST /vote Tests ---
    describe('POST /vote', () => {
        const mockFingerprint = 'fp1';
        it('should successfully submit a single vote', async () => {
            const poll = mockPoll();
            poll.votes = [10, 5, 1]; 
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app)
                .post('/api/poll/vote')
                .send({ code: mockPollCode, optionIndex: 0, fingerprint: mockFingerprint });

            expect(res.status).toBe(200);
            expect(poll.votes[0]).toBe(11); 
            expect(poll.votedFingerprints).toContain(mockFingerprint);
            expect(mockIo.emit).toHaveBeenCalledWith('vote_update', expect.anything());
        });

        it('should return 403 if user already voted', async () => {
            const poll = mockPoll();
            poll.votedFingerprints = [mockFingerprint];
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app)
                .post('/api/poll/vote')
                .send({ code: mockPollCode, optionIndex: 0, fingerprint: mockFingerprint });

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('You have already voted in this poll');
            expect(poll.save).not.toHaveBeenCalled();
        });
    });

//--------------------------------------------------------------------------------
    // --- GET /:code Tests (Fetching a poll) ---
    describe('GET /:code', () => {
        it('should return poll details by code', async () => {
            const poll = mockPoll();
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app).get(`/api/poll/${mockPollCode}`);

            expect(res.status).toBe(200);
            expect(res.body.question).toBe(poll.question);
        });
    });

//--------------------------------------------------------------------------------
    // --- GET /results/:code Tests ---
    describe('GET /results/:code', () => {
        it('should return formatted poll results', async () => {
            const poll = mockPoll();
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app).get(`/api/poll/results/${mockPollCode}`);

            expect(res.status).toBe(200);
            expect(res.body.question).toBe(poll.question);
            expect(res.body.results).toEqual([
                { option: 'Red', votes: 10 },
                { option: 'Green', votes: 5 },
                { option: 'Blue', votes: 1 },
            ]);
        });
    });

//--------------------------------------------------------------------------------
    // --- PUT /:code/status Tests ---
    describe('PUT /:code/status', () => {
        it('should update poll status and save current votes to history', async () => {
            const poll = mockPoll();
            poll.votes = [10, 5, 1];
            poll.votedFingerprints = ['fp1', 'fp2'];
            poll.history = [];
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app)
                .put(`/api/poll/${mockPollCode}/status`)
                .send({ isActive: false });

            expect(res.status).toBe(200);
            expect(poll.isActive).toBe(false);
            expect(poll.history.length).toBe(1);
            expect(poll.history[0].votes).toEqual([10, 5, 1]);
            expect(poll.history[0].votedFingerprints).toBe(2);
            expect(poll.save).toHaveBeenCalled();
        });
    });

//--------------------------------------------------------------------------------
   


//--------------------------------------------------------------------------------
    // --- DELETE /:code Tests ---
    describe('DELETE /:code', () => {
        it('should successfully delete a poll and remove it from folders', async () => {
            const poll = mockPoll();
            Poll.findOne.mockResolvedValue(poll);
            Poll.deleteOne.mockResolvedValue({ deletedCount: 1 });
            Folder.updateMany.mockResolvedValue(true);

            const res = await request(app)
                .delete(`/api/poll/${mockPollCode}`);

            expect(res.status).toBe(204); 
            expect(Poll.deleteOne).toHaveBeenCalledWith({ code: mockPollCode });
            expect(Folder.updateMany).toHaveBeenCalledWith(
                { polls: poll._id },
                { $pull: { polls: poll._id } }
            );
        });

        it('should return 403 if user is not the creator', async () => {
            const poll = mockPoll();
            poll.createdBy = 'anotherUserId'; 
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app)
                .delete(`/api/poll/${mockPollCode}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Unauthorized: You did not create this poll');
        });
    });
});