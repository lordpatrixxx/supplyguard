import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scansRouter } from './routes/scans.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/scans', scansRouter);

app.listen(PORT, () => {
  console.log(`[SupplyGuard API] Running on http://localhost:${PORT}`);
});
