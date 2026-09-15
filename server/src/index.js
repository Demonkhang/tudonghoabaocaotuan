const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const reportRoutes = require('./routes/reportRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Endpoints
app.use('/api', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Weekly Report Generator Server' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server listening on port ${PORT}`);
  });
}

module.exports = app;
