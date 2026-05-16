require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/user');
const upscRoutes = require('./routes/upsc');
const microtaskRoutes = require('./routes/microtasks');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"], 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('sAInik backend is running!');
});

// Handle browser favicon requests silently to avoid 404 logs
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

app.get('/api/test', (req, res) => {
  res.json({ message: "Hello from the sAInik backend!" });
});

// Test AI endpoint without authentication
app.get('/api/test-ai', async (req, res) => {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log("Testing AI with model: gemini-1.5-pro");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent("Say hello in JSON format with a message field");
    const response = await result.response;
    const text = response.text();
    
    console.log("AI Response:", text);
    res.json({ success: true, aiResponse: text });
  } catch (error) {
    console.error("AI Test Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint for debugging content processing without auth
app.post('/api/test-content', async (req, res) => {
  try {
    console.log("Testing content processing without auth...");
    
    // Mock AI processing
    const mockResult = {
      summary: "This is a test summary generated without authentication.",
      quizData: {
        questions: [
          {
            question: "What is this a test of?",
            options: ["Authentication", "Content Processing", "AI Generation", "All of the above"],
            correctAnswer: "All of the above"
          }
        ]
      }
    };
    
    res.json({ success: true, contentProcessing: "working", mockResult });
  } catch (error) {
    console.error("Content Test Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upsc', upscRoutes);
app.use('/api/microtasks', microtaskRoutes);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', ({ roomId, userName }) => { // <-- Destructure userName
    socket.join(roomId);
    socket.userName = userName; // <-- Store the name on the socket instance
    console.log(`User ${userName} (${socket.id}) joined room ${roomId}`);
  });

  // Event: When a user sends a message
  socket.on('send_message', (data) => {
    // Broadcast the message with the sender's actual name
    socket.to(data.roomId).emit('receive_message', { 
        user: socket.userName, // <-- Use the stored name
        text: data.text 
    });
  });

  socket.on('drawing_start', (data) => {
    socket.to(data.roomId).emit('drawing_start', data);
  });

  // Event: When a user is drawing
  socket.on('drawing_move', (data) => {
    socket.to(data.roomId).emit('drawing_move', data);
  });
  
  // Event: When a user clears the canvas
  socket.on('clear_canvas', (roomId) => {
    socket.to(roomId).emit('clear_canvas');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


// --- CHANGE: Start the HTTP server instead of the Express app ---
server.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});