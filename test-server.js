const express = require('express');
const path = require('path');
const chatHandler = require('./api/chat');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
app.post('/api/chat', chatHandler);

const PORT = 3000;
app.listen(PORT, () => console.log('Test server running at http://localhost:' + PORT));
