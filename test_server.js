const http = require('http');
const fs = require('fs');
const path = require('path');
const chat = require('./api/chat.js');

function createRes(res) {
    return {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        status(code) { this.statusCode = code; return this; },
        json(data) {
            res.writeHead(this.statusCode, { ...this.headers, 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        },
        end(data) {
            res.writeHead(this.statusCode, this.headers);
            res.end(data);
        }
    };
}

http.createServer((req, res) => {
    if (req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            req.body = JSON.parse(body || '{}');
            chat(req, createRes(res));
        });
        return;
    }

    let filePath = '.' + req.url;
    if (filePath === './' || filePath === './index.html') filePath = './index.html';
    else if (filePath === './embed.html') filePath = './embed.html';

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.css') contentType = 'text/css';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(3000);
