require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sequelize = require('./db');

const app = express();
app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());
app.use(cors({ origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean) }));

app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', database: e.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, async () => {
  console.log(`API running on ${port}`);
  try {
    await sequelize.authenticate();
    console.log('Database connected');
  } catch (e) {
    console.error('Database connection FAILED:', e.message);
  }
});