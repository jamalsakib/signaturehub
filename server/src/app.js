const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const businessUnitRoutes = require('./routes/businessUnits');
const templateRoutes = require('./routes/templates');
const campaignRoutes = require('./routes/campaigns');
const ruleRoutes = require('./routes/rules');
const assetRoutes = require('./routes/assets');
const signatureRoutes = require('./routes/signatures');
const analyticsRoutes = require('./routes/analytics');
const syncRoutes = require('./routes/sync');
const adminRoutes = require('./routes/admin');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/authenticate');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth requests.' },
});

app.use('/api/', limiter);
if (process.env.NODE_ENV !== 'development') {
  app.use('/api/auth/', strictLimiter);
}

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Signature generation (used by Outlook add-in, no full auth required - API key protected)
app.use('/api/signatures', signatureRoutes);

// Protected routes
app.use('/api/users', authenticate, userRoutes);
app.use('/api/business-units', authenticate, businessUnitRoutes);
app.use('/api/templates', authenticate, templateRoutes);
app.use('/api/campaigns', authenticate, campaignRoutes);
app.use('/api/rules', authenticate, ruleRoutes);
app.use('/api/assets', authenticate, assetRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/sync', authenticate, syncRoutes);
app.use('/api/admin', adminRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA catch-all — must be after all API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // 404 handler for dev (API only)
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

app.use(errorHandler);

module.exports = app;
