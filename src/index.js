require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initShiftReminderCron } = require('./services/shiftReminderService');


const { connectDB } = require('./config/db');
const apiRouter = require('./routes');


const app = express();


// Middleware: run on every request
app.use(cors({ origin: true, credentials: true })); // allow dev cross-origin
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // parse JSON bodies
app.use(morgan('dev')); // log requests


// API under /api
app.use('/api', apiRouter);

// Global error handler

app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(status).json({
    success: false,
    error: message,
    errorCode: code,
    errorDetails: err.details,
  });
});



const PORT = process.env.PORT || 5000;


connectDB(process.env.MONGO_URI).then(() => {
app.listen(PORT, () => {
console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
});

initShiftReminderCron();