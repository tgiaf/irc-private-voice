const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Nick -> Socket ID eşleşmesi
let onlineUsers = {};

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // 1. Kullanıcı uygulamayı açınca nickini kaydeder
    socket.on('register', (nick) => {
        onlineUsers[nick] = socket.id;
        socket.nick = nick;
        console.log(`${nick} kaydedildi.`);
    });

    // 2. Arama İsteği (Teklif)
    socket.on('call_request', (data) => {
        const targetSocketId = onlineUsers[data.targetNick];
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming_call', {
                callerNick: socket.nick,
                offer: data.offer
            });
        } else {
            socket.emit('call_failed', { reason: 'Kullanıcı çevrimdışı veya müsait değil.' });
        }
    });

    // 3. Arama Cevabı (Kabul)
    socket.on('call_answer', (data) => {
        const targetSocketId = onlineUsers[data.targetNick];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call_answered', {
                answer: data.answer
            });
        }
    });

    // 4. ICE Adayları (Bağlantı optimizasyonu)
    socket.on('ice_candidate', (data) => {
        const targetSocketId = onlineUsers[data.targetNick];
        if (targetSocketId) {
            io.to(targetSocketId).emit('remote_ice_candidate', {
                candidate: data.candidate
            });
        }
    });

    // 5. Aramayı Sonlandırma
    socket.on('end_call', (data) => {
        const targetSocketId = onlineUsers[data.targetNick];
        if (targetSocketId) {
            io.to(targetSocketId).emit('call_ended');
        }
    });

    socket.on('disconnect', () => {
        if (socket.nick) {
            delete onlineUsers[socket.nick];
            console.log(`${socket.nick} ayrıldı.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Private Voice Server running on port ${PORT}`);
});
