const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const convertRouter = require('./routes/convert');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/convert', convertRouter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// For any other routes, serve the index.html (for SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`DocXpress server running on port ${PORT}`);
});

module.exports = app;