const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { JWT_SECRET, authenticateToken } = require('../middlewares/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName, avatarUrl } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Username, password, dan nama tampilan wajib diisi' });
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        displayName,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      },
    });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        about: user.about,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat registrasi' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        about: user.about,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat login' });
  }
});

// Get current profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        about: true,
        isOnline: true,
        lastSeen: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat profil' });
  }
});

// Get all other users for starting a chat
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        about: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: { displayName: 'asc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat daftar pengguna' });
  }
});

module.exports = router;
