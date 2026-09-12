import express from 'express';
import cors from 'cors';
import { scansRouter } from '../apps/api/src/routes/scans.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scans routes
app.use('/api/scans', scansRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SupplyGuard Serverless API Error]:', err);
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err.message || 'Internal server error occurred while processing request.',
  });
});

export default app;
