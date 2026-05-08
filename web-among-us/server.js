const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve Phaser and Socket.io client from node_modules if needed, 
// but Socket.io usually serves its own client at /socket.io/socket.io.js automatically.
// For Phaser, we can serve it specifically:
app.use('/phaser', express.static(path.join(__dirname, 'node_modules/phaser/dist')));

io.on('connection', (socket) => {
    console.log('A user connected: ' + socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
