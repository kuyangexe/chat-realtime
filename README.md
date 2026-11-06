# 💬 WhatsApp Web Realtime Chat

Aplikasi web chat realtime modern mirip WhatsApp Web yang dibangun dengan **React**, **Tailwind CSS**, **Node.js (Express)**, dan **Socket.io**.

![WhatsApp Web Preview](https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg)

---

## ✨ Fitur Unggulan

* **Realtime Two-way Messaging**: Kirim & terima pesan instan dua arah via WebSocket.
* **3-Tier Read Receipts (Sistem Centang)**:
  * 🕒 **Ikon Jam**: Pesan sedang dalam antrean pengiriman (*pending*).
  * ✓ **Centang 1 abu-abu**: Pesan telah berhasil disimpan di server (*sent*).
  * ✓✓ **Centang 2 abu-abu**: Pesan telah sampai di perangkat lawan bicara (*delivered*).
  * ✓✓ **Centang 2 biru**: Pesan telah dibuka/dibaca oleh lawan bicara (*read*).
* **Online & Last Seen Presence**: Menampilkan status *Online* saat pengguna aktif dan *Terakhir dilihat ...* saat offline.
* **Typing Indicator**: Tampilan animasi hijau *sedang mengetik...* secara realtime saat lawan bicara menekan keyboard.
* **Kirim Media & Berkas**: Upload foto dan dokumen dengan pratinjau sebelum dikirim.
* **Grup Chat**: Buat percakapan grup dengan memilih beberapa pengguna sekaligus.
* **Quick 1-Click Demo Login**: Masuk langsung sebagai pengguna demo (*Hasanah*, *Budi*, *Siti*, *Andi*) tanpa perlu repot mendaftar.

---

## 🚀 Cara Menjalankan di Lokal (Development)

1. **Jalankan Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   *Server berjalan di `http://localhost:5000`*

2. **Jalankan Frontend Client:**
   ```bash
   cd client
   npm run dev
   ```
   *Frontend berjalan di `http://localhost:5173`*

---

## 🌐 Panduan Deploy ke Publik (Render.com - Gratis)

Aplikasi ini sudah dikonfigurasi dengan arsitektur **All-in-One** (Express otomatis menyajikan build frontend React). Anda hanya butuh **1 Web Service** di Render:

### Langkah 1: Push ke GitHub
```bash
git init
git add .
git commit -m "Siap deploy WhatsApp Realtime"
git branch -M main
git remote add origin https://github.com/<USERNAME_GITHUB>/whatsapp-realtime-chat.git
git push -u origin main
```

### Langkah 2: Deploy di Render.com
1. Masuk ke [Render Dashboard](https://dashboard.render.com/).
2. Klik **New +** ➔ Pilih **Web Service**.
3. Hubungkan repository GitHub Anda.
4. Masukkan konfigurasi berikut:
   * **Name:** `whatsapp-realtime` (atau nama pilihan Anda)
   * **Region:** `Singapore` (Rekomendasi untuk akses tercepat dari Indonesia)
   * **Runtime:** `Node`
   * **Build Command:** `npm run build`
   * **Start Command:** `npm start`
   * **Plan:** `Free`
5. Tambahkan Environment Variable:
   * `JWT_SECRET`: *(buat string acak/rahasia)*
   * `NODE_ENV`: `production`
6. Klik **Create Web Service**.

Dalam 2-3 menit, website chat Anda langsung aktif dan dapat diakses publik dengan SSL (HTTPS/WSS) gratis!
