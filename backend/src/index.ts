import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import eventRoutes from './routes/events';
import applicationRoutes from './routes/applications';
import uploadRoutes, { STORAGE_ROOT } from './routes/upload';
import complaintRoutes from './routes/complaints';
import adminRoutes from './routes/admin';
import { checkDatabaseConnection } from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV !== 'production' ? '*' : 'http://localhost:3000');
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
// In production, set CORS_ORIGIN env var to restrict origins (comma-separated list)
app.use(express.json());

// Serves locally-persisted mock-uploaded files (profile photos, attendance/payment photos).
// Anything under "private/" (ID proof documents) is never served here — those are sensitive
// and only reachable via the authenticated /api/profile/id-proof/:role/:userId route.
app.use('/media', (req, res, next) => {
  if (req.path.startsWith('/private/')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}, express.static(STORAGE_ROOT));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'GigCater API', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, async () => {
  console.log(`=================================`);
  console.log(`🚀 GigCater Backend API running on http://localhost:${PORT}`);
  await checkDatabaseConnection();
  console.log(`=================================`);
});
