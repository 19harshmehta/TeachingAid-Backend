const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log('MongoDB Connection Error:', err));

// Routes
const authRoutes = require('./routes/authRoutes');
const pollRoutes = require('./routes/pollRoutes');
const folderRoutes = require('./routes/folderRoutes');
const quizRoutes = require('./routes/quizRoutes'); 


app.use('/api/auth', authRoutes);
app.use('/api/poll', pollRoutes);
app.use('/api/folder', folderRoutes);
app.use('/api/quiz', quizRoutes); 

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join poll room
  socket.on('join_poll', (code) => {
    socket.join(code);
    console.log(`Socket ${socket.id} joined room: ${code}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Attach io instance to app
app.set('io', io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
