import express from 'express';
import cors from 'cors';
import { scansRouter } from '../apps/api/src/routes/scans.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scans routes
app.use('/api/scans', scansRouter);

export default app;
