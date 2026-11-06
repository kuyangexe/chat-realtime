const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middlewares/auth');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow images and common documents
    const allowed = /jpeg|jpg|png|gif|webp|svg|pdf|docx|txt/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Tipe file tidak didukung'));
  },
});

router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      type: isImage ? 'image' : 'file',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Gagal mengunggah file' });
  }
});

module.exports = router;
