const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/apiError');
const ApiResponse = require('./utils/apiResponse');
const authRoutes = require('./routes/auth.routes');
const assetRoutes = require('./routes/asset.routes');
const publicRoutes = require('./routes/public.routes');
const issueRoutes = require('./routes/issue.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB Database
connectDB();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [];

const allowedOrigins = [
  ...frontendUrls,
  'http://localhost:5173',
  'http://localhost:80',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain (both frontend and preview deployments)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Block all others (return false, not an error, to avoid 500 crashes)
    callback(null, false);
  },
  credentials: true,
}));

// Compress all responses
app.use(compression());

// Request logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json(new ApiResponse(200, { uptime: process.uptime() }, 'Server is healthy'));
});

// Root path response
app.get('/', (req, res) => {
  res.status(200).json(new ApiResponse(200, { project: 'MaintainIQ API' }, 'Welcome to MaintainIQ API'));
});

// Send back 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'API endpoint not found', 'ENDPOINT_NOT_FOUND'));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
