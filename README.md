# WhatsApp Customer Service Bot

Bot WhatsApp yang berfungsi sebagai Customer Service untuk mengelola pesanan pelanggan.

## Fitur

- Menu interaktif untuk pelanggan
- Pembuatan pesanan baru
- Pengecekan status pesanan
- Informasi kontak CS
- Bantuan penggunaan

## Persyaratan Sistem

- Node.js (versi 14 atau lebih baru)
- NPM (Node Package Manager)
- Browser Chrome/Chromium (untuk WhatsApp Web)

## Instalasi

1. Clone repository ini
2. Install dependencies:
   ```bash
   npm install
   ```
3. Jalankan bot:
   ```bash
   npm start
   ```
4. Scan QR Code yang muncul di terminal dengan WhatsApp di ponsel Anda

## Penggunaan

Setelah bot berjalan, pengguna dapat mengirim pesan dengan format berikut:

- `!menu` - Menampilkan menu utama
- `!order` - Membuat pesanan baru
- `!status` - Mengecek status pesanan
- `!help` - Menampilkan bantuan
- `!contact` - Menampilkan informasi kontak CS

## Format Pesanan

Untuk membuat pesanan baru, kirim pesan dengan format:
```
Nama: [Nama Anda]
Produk: [Nama Produk]
Jumlah: [Jumlah]
Alamat: [Alamat Pengiriman]
```

## Catatan

- Pastikan ponsel Anda terhubung ke internet
- Jangan menutup terminal selama bot berjalan
- QR Code perlu di-scan setiap kali bot di-restart 