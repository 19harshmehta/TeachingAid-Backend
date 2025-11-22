// tests/folder.test.js

const request = require('supertest');
const express = require('express');
const folderRoutes = require('../routes/folderRoutes');

// --- Mocking Setup ---
// Constant ID for mock user
const mockCreatorId = 'mockUserId12345';

// FIX: Mock authMiddleware directly inside jest.mock to avoid hoisting error
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
    req.user = { id: mockCreatorId, email: 'test@creator.com' };
    next();
});

// Mock Mongoose Models
const Folder = require('../models/folder');
const Poll = require('../models/Poll');
jest.mock('../models/folder');
jest.mock('../models/Poll');

// Setup minimal Express app to use in Supertest
const app = express();
app.use(express.json());
app.use('/api/folder', folderRoutes);


describe('Folder Routes (/api/folder)', () => {

    const mockFolderId = 'folderId123';
    const mockPollId = 'pollId456';
    const mockPollCode = 'XYZABC';

    const mockFolder = (id = mockFolderId, polls = []) => ({
        _id: id,
        name: 'My Projects',
        description: 'Important polls',
        createdBy: mockCreatorId,
        polls: polls,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnThis(),
    });

    const mockPoll = (code = mockPollCode) => ({
        _id: mockPollId,
        code: code,
        toObject: jest.fn().mockReturnThis(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    //--------------------------------------------------------------------------------
    // --- POST / Tests (createFolder) ---
    describe('POST /', () => {
        it('should successfully create a new folder and return 201', async () => {
            const newFolder = mockFolder();
            Folder.create.mockResolvedValue(newFolder);

            const res = await request(app)
                .post('/api/folder')
                .send({ name: 'New Folder', description: 'Test' });

            expect(res.status).toBe(201);
            expect(Folder.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'New Folder', createdBy: mockCreatorId })
            );
        });
    });

    //--------------------------------------------------------------------------------
    // --- GET / Tests (getFolders) ---
    describe('GET /', () => {
        it('should return all folders created by the user and populate polls', async () => {
            const folders = [mockFolder()];
            // Mock Mongoose chain calls
            Folder.find.mockReturnThis();
            Folder.find().populate.mockResolvedValue(folders);

            const res = await request(app).get('/api/folder');

            expect(res.status).toBe(200);
            expect(res.body).toEqual([
                {
                    _id: folders[0]._id,
                    name: folders[0].name,
                    description: folders[0].description,
                    createdBy: folders[0].createdBy,
                    polls: folders[0].polls
                }
            ]);
            expect(Folder.find).toHaveBeenCalledWith({ createdBy: mockCreatorId });
            expect(Folder.find().populate).toHaveBeenCalledWith('polls');
        });
    });

    //--------------------------------------------------------------------------------
    // --- POST /:folderId/polls/:pollCode Tests (addPollToFolder) ---
    describe('POST /:folderId/polls/:pollCode', () => {
        it('should successfully add a poll to an empty folder', async () => {
            const folder = mockFolder();
            const poll = mockPoll();
            Folder.findById.mockResolvedValue(folder);
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app)
                .post(`/api/folder/${mockFolderId}/polls/${mockPollCode}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Poll added to folder');
            expect(folder.polls).toContain(mockPollId);
            expect(folder.save).toHaveBeenCalled();
        });

        it('should return 400 if poll is already in folder', async () => {
            const folder = mockFolder(mockFolderId, [mockPollId]);
            const poll = mockPoll();
            Folder.findById.mockResolvedValue(folder);
            Poll.findOne.mockResolvedValue(poll);

            const res = await request(app)
                .post(`/api/folder/${mockFolderId}/polls/${mockPollCode}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Poll already in folder');
            expect(folder.save).not.toHaveBeenCalled();
        });
    });

    //--------------------------------------------------------------------------------
    // --- GET /:folderId/polls Tests (getPollsOfFolder) ---
    describe('GET /:folderId/polls', () => {
        it('should return polls contained within a specific folder', async () => {
            const folder = mockFolder(mockFolderId, [{ _id: mockPollId, question: 'In-folder Q' }]);

            Folder.findById.mockReturnThis();
            Folder.findById().populate.mockResolvedValue(folder);

            const res = await request(app).get(`/api/folder/${mockFolderId}/polls`);

            expect(res.status).toBe(200);
            expect(res.body.folderName).toBe(folder.name);
            expect(res.body.polls.length).toBe(1);
            expect(Folder.findById().populate).toHaveBeenCalledWith('polls');
        });
    });
});