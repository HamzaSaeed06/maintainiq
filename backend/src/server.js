require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require('socket.io');

// Connect to MongoDB Database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling']
});

// Make io accessible globally
global.io = io;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Socket.io: User connected:', socket.id);

  // Join user-specific room for personal notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket.io: User ${userId} joined their room`);
  });

  // Join admin room for dashboard updates
  socket.on('join-admin', () => {
    socket.join('admin');
    console.log('Socket.io: Admin joined admin room');
  });

  // Join technician room for assignments
  socket.on('join-technician', (technicianId) => {
    socket.join(`technician_${technicianId}`);
    console.log(`Socket.io: Technician ${technicianId} joined their room`);
    
    // Send confirmation back to technician
    socket.emit('room-joined', { room: `technician_${technicianId}` });
  });

  // Test event
  socket.on('ping', () => {
    console.log('Socket.io: Ping received from', socket.id);
    socket.emit('pong', { timestamp: new Date() });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.io: User disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket.io: Socket error:', error);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
