require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const prisma = require('./lib/prisma');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const uploadRoutes = require('./routes/upload');
const { setupChatSocket } = require('./sockets/chatSocket');

const app = express();
const server = http.createServer(app);

// CORS configuration (mendukung akses lokal dan publik)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend React build (client/dist) jika sudah di-build
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback middleware (kompatibel penuh dengan Express 4 dan 5)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

setupChatSocket(io);

// Auto-seed demo users jika database kosong
async function seedDefaultUsers() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Menyiapkan data awal pengguna demo...');
      const hashedPassword = await bcrypt.hash('password123', 10);

      const demoUsers = [
        {
          username: 'hasanah',
          displayName: 'Hasanah (Anda)',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hasanah',
          about: 'Coding WhatsApp Realtime Chat 🚀',
        },
        {
          username: 'budi',
          displayName: 'Budi Santoso',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi',
          about: 'Sibuk bekerja, hanya chat penting.',
        },
        {
          username: 'siti',
          displayName: 'Siti Rahma',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti',
          about: 'Tersedia | Ada di WhatsApp',
        },
        {
          username: 'andi',
          displayName: 'Andi Pratama',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andi',
          about: 'Jangan telepon, chat saja 🙏',
        },
      ];

      for (const u of demoUsers) {
        await prisma.user.create({
          data: {
            ...u,
            password: hashedPassword,
          },
        });
      }
      console.log('✅ 4 Pengguna demo berhasil dibuat! (Password: password123)');
    }
  } catch (error) {
    console.error('Peringatan saat seed default users:', error.message);
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Server WhatsApp Realtime aktif di port ${PORT}`);
  await seedDefaultUsers();
});
