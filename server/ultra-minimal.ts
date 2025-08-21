import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend funcionando!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Ultra minimal server running on port ${PORT}`);
});