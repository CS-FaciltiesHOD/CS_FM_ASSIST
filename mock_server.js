const express = require('express');
const cors = require('cors');
const path = require('path');
const chat = require('./api/chat');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/embed.html', (req, res) => res.sendFile(path.join(__dirname, 'embed.html')));

app.post('/api/chat', (req, res) => {
    // chat.js exports a function (req, res) => { ... } directly for Vercel
    chat(req, res);
});

const PORT = 8001;
app.listen(PORT, () => {
    console.log(`Mock server running on port ${PORT}`);
});
