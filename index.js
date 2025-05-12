const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const products = require('./products');
const fs = require('fs');
const path = require('path');
const adminNumbers = ['6282298980601@c.us', '6287822944686@c.us']; // tambahkan admin lainnya di sini


// Create a new WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
    args: ['--no-sandbox']
    }
    });
    
    // Data storage
    const userLastProduct = new Map();     // Menyimpan produk terakhir yang dilihat user
    const orderStatus = new Map();         // Menyimpan status pesanan
    const paymentData = new Map();         // Menyimpan data pembayaran
    const userCommandHistory = new Map();  // Menyimpan riwayat perintah user
    
    // Path untuk gambar QR code pembayaran
    const qrCodePath = path.join(__dirname, 'assets', 'payment_qrcode.jpeg');
    
    // Fungsi untuk mengecek apakah produk tersedia
    function checkProductAvailability(message) {
    const content = message.body.toLowerCase();
    const words = content.split(' ');
    
    for (const word of words) {
    if (word.length < 3) continue;
    
    const matchedProducts = products.filter(product =>
    product.aliases.some(alias => alias.includes(word)) ||
    product.name.toLowerCase().includes(word)
    );
    
    if (matchedProducts.length > 0) {
    return {
    found: true,
    products: matchedProducts
    };
    }
    }
    
    return { found: false };
    }
    
    // Fungsi untuk menambahkan produk baru
    function addNewProduct(productData) {
    try {
    const quota = Number(productData.quota) || 10;
    if (!Number.isInteger(quota) || quota < 0) {
    throw new Error('Kuota harus berupa angka bulat positif.');
    }
    
    const highestId = Math.max(...products.map(product => product.id));
    const newId = highestId + 1;
    
    const newProduct = {
    id: newId,
    name: productData.name,
    type: productData.type || "SHARING",
    prices: productData.prices || [{ duration: "1 BULAN", price: "15.000" }],
    notes: productData.notes || [
    "All devices",
    "Akun dari seller",
    "Order bisa chat ke : wa.me/6282298980601 (Admin II)"
    ],
    aliases: productData.aliases || [productData.name.toLowerCase()],
    quota: quota
    };
    
    products.push(newProduct);
    saveProductsToFile();
    
    return {
    success: true,
    product: newProduct
    };
    } catch (error) {
    console.error('Error adding new product:', error);
    return {
    success: false,
    error: error.message
    };
    }
    }
    
    // Fungsi untuk menyimpan produk ke file
    function saveProductsToFile() {
    try {
        const productsContent = // products.js\nmodule.exports = ${JSON.stringify(products, null, 2)};;
        fs.writeFileSync(path.join(__dirname, 'products.js'), productsContent);
        console.log('Products file updated successfully');
        return true;
    } catch (error) {
        console.error('Error saving products to file:', error);
        return false;
    }
    }
    
    // Generate QR Code
    client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code generated. Please scan with WhatsApp.');
    });
    
    // When client is ready
    client.on('ready', () => {
    console.log('Client is ready!');
    });
    
    // Helper functions
    function getProductInfo(product) {
    let info = `*${product.name}*\n\n`+
                `— ${product.type}\n `+
                `— Kuota Tersedia: ${product.quota}\n`;
    
    product.prices.forEach(price => {
    info += `❥ ${price.duration} : ${price.price}\n`;
    });
    
    info += `\nNotes :\n`;
    product.notes.forEach(note => {
    info += `💌 ${note}\n`;
    });
    
    info += `\n*Silakan pilih opsi:*\n` +
            `1. Ketik "pesan" untuk memesan\n `+
            `2. Ketik "batal" untuk membatalkan`;
    
    return info;
    }
    
    function generateProductList() {
    let list = `Kak, stretching bentar yuk biar ga pegel. 🧘‍♀️\n Berikut List Yang Tersedia di Grup Ini :\n `+
                `\n` +
                `*DAFTAR PRODUK*\n\n`;
    products.forEach(product => {
    list += `*|ʚ |${product.id}. ${product.name}*\n`;
    });
    list += `\nUntuk melihat detail produk, ketik pl [nomor] atau nama produk\n `+
            `Contoh: pl 1 atau alightmotion`;
    return list;
    }
    
    function formatOrderStatus(order) {
    let statusText = '';
    let emoji = '';
    
    switch(order.status) {
        case 'awaiting_payment':
            statusText = 'Menunggu Pembayaran';
            emoji = '⏳';
            break;
    case 'payment_received':
            statusText = 'Pembayaran Diterima';
            emoji = '✅';
            break;
    case 'processing':
            statusText = 'Sedang Diproses';
            emoji = '🛠️';
            break;
    case 'completed':
            statusText = 'Selesai';
            emoji = '🎉';
            break;
    case 'rejected':
            statusText = 'Ditolak';
            emoji = '❌';
            break;
    default:
            statusText = order.status;
    }
    
    return {
        statusText,
        emoji
    };
    }
    
    function debugOrderStatus(orderId) {
    console.log(`Debug - Checking order: ${orderId}`);
    console.log(`All orders: ${Array.from(orderStatus.keys()).join(', ')}`);
    
    const order = orderStatus.get(orderId);
    if (order) {
        console.log(`Order found: ${JSON.stringify(order)}`);
    } else {
        console.log(`Order not found with ID: ${orderId}`);
    }
    }
    
    async function getUniqueUserId(message) {
        try {
            const chat = await message.getChat();   
    
            if (chat.isGroup) {
                return message._data.author || message.author;
            } else {
                return message.from;
            }
        } catch (error) {
            console.error('Error getting unique user ID:', error);
            return message.from;
        }
    }
    
    // Handle incoming messages
    client.on('message', async (message) => {
        const content = message.body.toLowerCase();
        const groupId = message.from;
    
        console.log('Received message:', content);
        console.log('Message from:', message.from);
    
        try {
            const userId = await getUniqueUserId(message);
            const chat = await message.getChat();
    
            console.log(`User ID identified: ${userId}`);

            // Grup: Perintah close & open oleh admin
if (chat.isGroup) {
    console.log(`Group message detected. Group ID: ${groupId}, Real sender ID: ${userId}`);

    if (adminNumbers.includes(userId)) {
        console.log('✅ User ini adalah admin.');

        if (content === 'close') {
            await chat.setMessagesAdminsOnly(true);
            await message.reply('🔒 Grup telah *ditutup*. Sekarang hanya admin yang bisa mengirim pesan.');
            return;
        }

        if (content === 'open') {
            await chat.setMessagesAdminsOnly(false);
            await message.reply('🔓 Grup telah *dibuka*. Semua anggota bisa mengirim pesan.');
            return;
        }
    } else {
        console.log('⛔ User ini bukan admin.');
    }
}
            // ...lanjut ke logika lainnya
    
    
    const productCheck = checkProductAvailability(message);
if (productCheck.found && !content.startsWith('!') && !content.startsWith('pl ')) {
    if (productCheck.products.length === 1) {
        const product = productCheck.products[0];
        userLastProduct.set(userId, product.name);
        userCommandHistory.set(userId, `pl ${product.id}`);
    
        await message.reply(`Sepertinya Anda mencari produk *${product.name}*. Berikut detailnya:`);
        await message.reply(getProductInfo(product));
    } else if (productCheck.products.length > 1) {
    let suggestText = "Beberapa produk ditemukan. Pilih salah satu:\n\n";
    productCheck.products.forEach(product => {
        suggestText += `${product.id}. *${product.name}*\n`;
    });
    suggestText += "\nKetik nomor produk untuk melihat detail.";
    
    await message.reply(suggestText);
    }
}
    
else if (content.startsWith('!addproduct')) {
    if (userId === "6282298980601@c.us") {
        try {
            const parts = message.body.substring(11).split('|').map(part => part.trim());
        if (parts.length < 1) {
            message.reply('Format salah. Gunakan: !addproduct NAMA_PRODUK | TIPE | ALIAS1,ALIAS2 | KUOTA');
            return;
        }
    
        const name = parts[0];
        const type = parts.length > 1 ? parts[1] : "SHARING";
        const aliases = parts.length > 2 ?
            parts[2].split(',').map(alias => alias.trim().toLowerCase()) :
            [name.toLowerCase()];
        const quota = parts.length > 3 ? parseInt(parts[3]) : 10;
    
        const result = addNewProduct({
            name,
            type,
            aliases,
            quota
        });
        
            if (result.success) {
                message.reply(`✅ Produk baru berhasil ditambahkan:\n*${result.product.name}* (ID: ${result.product.id}, Kuota: ${result.product.quota})`);
            } else {
                message.reply(`❌ Gagal menambahkan produk: ${result.error}`);
            }
        } catch (error) {
            console.error('Error processing add product command:', error);
            message.reply('Terjadi kesalahan saat menambahkan produk.');
        }
        } else {
        message.reply('Maaf, perintah ini hanya dapat digunakan oleh admin.');
        }
        }
    
    else if (content === '!totalproducts') {
        const totalProducts = products.length;
        message.reply(`Total produk yang tersedia: *${totalProducts}* produk`);
    }
    
    else if (content === '!quotas') {
    let quotaList = `*DAFTAR KUOTA PRODUK*\n\n`;
        products.forEach(product => {
        quotaList += `📦 *${product.name}* (ID: ${product.id}): ${product.quota} akun tersedia\n`;
        });
        message.reply(quotaList);
    }
  
    else if (content === '!menu') {
    userCommandHistory.set(userId, '!menu');
    const menuText = `*MENU UTAMA*\n\n `+
    `1. list - Lihat daftar produk\n `+
    `2. !order - Buat pesanan baru\n `+
    `3. !status [OrderID] - Cek status pesanan\n `+
    `4. !help - Bantuan\n `+
    `5. !contact - Hubungi CS`;
    
    message.reply(menuText);
    }
    
    else if (content === 'list') {
    userCommandHistory.set(userId, 'list');
    message.reply(generateProductList());
    }
    
    else if (content.startsWith('pl ')) {
    if (userCommandHistory.get(userId) !== 'list') {
    message.reply('Silakan ketik list terlebih dahulu untuk melihat daftar produk sebelum memilih.');
    return;
    }
    
    const productId = parseInt(content.split(' ')[1]);
    const product = products.find(p => p.id === productId);
    
    if (product) {
    userLastProduct.set(userId, product.name);
    userCommandHistory.set(userId, `pl ${productId}`);
    message.reply(getProductInfo(product));
    } else {
    message.reply('Produk tidak ditemukan. Ketik list untuk melihat daftar produk.');
    }
    }
    
    else if (!isNaN(content) && parseInt(content) > 0) {
    if (userCommandHistory.get(userId) !== 'list') {
    message.reply('Silakan ketik list terlebih dahulu untuk melihat daftar produk sebelum memilih.');
    return;
    }
    
    const productId = parseInt(content);
    const product = products.find(p => p.id === productId);
    
    if (product) {
    userLastProduct.set(userId, product.name);
    userCommandHistory.set(userId, `pl ${productId}`);
    message.reply(getProductInfo(product));
    } else {
    message.reply('Produk tidak ditemukan. Ketik list untuk melihat daftar produk.');
    }
    }
    
    else {
    const product = products.find(p => p.aliases.includes(content.toLowerCase()));
    
    if (product) {
    if (userCommandHistory.get(userId) !== 'list') {
    message.reply('Silakan ketik list terlebih dahulu untuk melihat daftar produk sebelum memilih.');
    return;
    }
    
    userLastProduct.set(userId, product.name);
    userCommandHistory.set(userId, `pl ${product.id}`);
    message.reply(getProductInfo(product));
    }
    }

    if (content === 'pesan') {
    const lastProduct = userLastProduct.get(userId);
    if (lastProduct) {
    const product = products.find(p => p.name === lastProduct);
    if (!product) {
    message.reply('Produk tidak ditemukan.');
    return;
    }
    if (product.quota <= 0) {
    message.reply(`Maaf, kuota untuk *${product.name}* telah habis. Silakan hubungi admin untuk informasi lebih lanjut.`);
    return;
    }
    
    const orderId = `ORD${Date.now()}`;
    const now = new Date();
    
    product.quota -= 1;
    saveProductsToFile();
    
    orderStatus.set(orderId, {
    status: 'awaiting_payment',
    product: lastProduct,
    userId: userId,
    groupId: chat.isGroup ? groupId : null,
    date: now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
    }),
    time: now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
    })
    });
    
    console.log(`Order created: ${orderId} with status 'awaiting_payment' for user ${userId}`);
    
    const replyTo = chat.isGroup ? groupId : userId;
    
    const paymentInfoText = `*======PEMBAYARAN PESANAN=====*
   
    Produk    : ${lastProduct}
    Order ID  : ${orderId}
    Status    : Menunggu Pembayaran ⏳
    
Silakan lakukan pembayaran ke:
*===> QrCode Diatas*
===>A/N: *GARDAS DIGITAL*
==>Jumlah: - (sesuai produk)

Cara Konfirmasi Pembayaran:
Kirimkan bukti transfer/screenshot pembayaran sebagai balasan pesan ini.
    =======================
    Terima kasih telah berbelanja!
    =======================`;
    
    if (fs.existsSync(qrCodePath)) {
    const media = MessageMedia.fromFilePath(qrCodePath);
    await client.sendMessage(replyTo, media, {
    caption: paymentInfoText
    });
    } else {
    console.log('QR Code file not found at:', qrCodePath);
    await message.reply(paymentInfoText);
    }
    } else {
    message.reply('Silakan pilih produk terlebih dahulu dengan mengetik pl [nomor produk]');
    }
    }
    
    else if (message.hasMedia) {
    let pendingOrder = null;
    let pendingOrderId = null;
    
    for (const [orderId, order] of orderStatus.entries()) {
    if (order.userId === userId && order.status === 'awaiting_payment') {
    pendingOrder = order;
    pendingOrderId = orderId;
    break;
    }
    }
    
    if (pendingOrder) {
    const media = await message.downloadMedia();
    
    const adminNotification = `*BUKTI PEMBAYARAN BARU MEMERLUKAN VERIFIKASI*\n\n `+
    `Order ID: ${pendingOrderId}\n `+
    `Produk: ${pendingOrder.product}\n `+
    `Dari: ${userId}\n\n `+
    `Untuk menerima pembayaran ketik: terima ${pendingOrderId}\n `+
    `Untuk menolak pembayaran ketik: tolak ${pendingOrderId} [alasan]`;
    
    await client.sendMessage("6282298980601@c.us", media, {
        caption: `Bukti pembayaran untuk order: ${pendingOrderId}`
    });
    await client.sendMessage("6282298980601@c.us", adminNotification);
    
    const receivedConfirmation = `*===BUKTI PEMBAYARAN DITERIMA==*

    Order ID : ${pendingOrderId}
    Produk   : ${pendingOrder.product}
    Status   : Menunggu Verifikasi ⏳
    
    Bukti pembayaran Anda sedang diverifikasi oleh admin.
    Anda akan mendapat notifikasi setelah pembayaran diverifikasi.
    
    ========================
    Terima kasih!
    ========================`;
    
    message.reply(receivedConfirmation);
    } else {
    message.reply('Maaf, kami tidak menemukan pesanan Anda yang menunggu pembayaran. Jika Anda mengirimkan bukti pembayaran, mohon sertakan ID pesanan dengan format: "Bukti bayar [OrderID]"');
    }
    }
    
    else if (content.startsWith('bayar ')) {
    const parts = content.split(' ');
    if (parts.length >= 4) {
    const rawOrderId = parts[1];
    const bank = parts[2];
    const senderName = parts.slice(3).join(' ');
    
    debugOrderStatus(rawOrderId);
    
    let order = orderStatus.get(rawOrderId);
    
    if (!order) {
    for (const [key, value] of orderStatus.entries()) {
    if (key.toLowerCase() === rawOrderId.toLowerCase()) {
    order = value;
    break;
    }
    }
    }
    
    if (order && order.status === 'awaiting_payment') {
    paymentData.set(rawOrderId, {
    bank,
    senderName,
    paymentTime: new Date().toLocaleTimeString('id-ID'),
    paymentDate: new Date().toLocaleDateString('id-ID')
    });
    
    orderStatus.set(rawOrderId, {
    ...order,
    status: 'awaiting_verification'
    });
    
    console.log(`Payment reported for order: ${rawOrderId}, status updated to 'awaiting_verification'`);
    
    const confirmation = `*==== KONFIRMASI PEMBAYARAN DITERIMA ===*
    
    Order ID      : ${rawOrderId}
    Produk        : ${order.product}
    Bank Pengirim : ${bank}
    Nama Pengirim : ${senderName}
    Status        : Menunggu Verifikasi ⏳
    
    Konfirmasi pembayaran Anda sedang diverifikasi.
    Mohon kirimkan bukti transfer untuk mempercepat proses verifikasi.
   `;
    
    message.reply(confirmation);
    
    const adminNotification = `*KONFIRMASI PEMBAYARAN BARU PERLU VERIFIKASI*\n\n` +
    `Order ID: ${rawOrderId}\n `+
    `Produk: ${order.product}\n `+
    `Pembayaran dari: ${senderName} (${bank})\n\n `+
    `Untuk menerima pembayaran ketik: terima ${rawOrderId}\n `+
    `Untuk menolak pembayaran ketik: tolak ${rawOrderId} [alasan]`;
    
    client.sendMessage("6282298980601@c.us", adminNotification);
    } else {
    message.reply('Order ID tidak valid atau pembayaran sudah dikonfirmasi sebelumnya. Pastikan ID pesanan Anda benar.');
    }
    } else {
    message.reply('Format salah. Gunakan: bayar [OrderID] [BankPengirim] [NamaPengirim] atau kirimkan bukti transfer langsung sebagai balasan.');
    }
    }
    
    else if (content.startsWith('bukti bayar ') || content.startsWith('bukti pembayaran ')) {
    const parts = content.split(' ');
    if (parts.length >= 3) {
    let rawOrderId = parts[parts.length - 1];
    message.reply(`Terima kasih. Silakan kirimkan bukti transfer/screenshot pembayaran untuk pesanan ${rawOrderId} sebagai balasan berikutnya.`);
    } else {
    message.reply('Format salah. Gunakan: "Bukti bayar [OrderID]" lalu kirimkan gambar bukti transfer.');
    }
    }
    
    else if (content.startsWith('terima ')) {
    if (userId === "6282298980601@c.us") {
    const rawOrderId = message.body.split(' ')[1];
    const order = orderStatus.get(rawOrderId);
    
    if (order && (order.status === 'awaiting_payment' || order.status === 'awaiting_verification')) {
    orderStatus.set(rawOrderId, {
    ...order,
    status: 'payment_received'
    });
    
    console.log(`Payment verified for order: ${rawOrderId}, status updated to 'payment_received'`);
    
    const paymentVerified = `*==> PEMBAYARAN DITERIMA*
    
    Order ID  : ${rawOrderId}
    Produk    : ${order.product}
    Status    : Pembayaran Diterima ✅
 
    Bukti pembayaran Anda telah diverifikasi dan diterima.
    Pesanan Anda akan segera kami proses.
    
    ========================
    Terima kasih!
    ========================`;
    
    if (order.groupId) {
    client.sendMessage(order.groupId, paymentVerified);
    message.reply(`Pembayaran untuk pesanan ${rawOrderId} telah diterima dan notifikasi dikirim ke grup.`);
    } else {
    client.sendMessage(order.userId, paymentVerified);
    message.reply(`Pembayaran untuk pesanan ${rawOrderId} telah diterima dan customer telah diberitahu.`);
    }
    } else {
    message.reply('Order ID tidak valid atau tidak dalam status menunggu pembayaran/verifikasi.');
    }
    } else {
    message.reply('Maaf, perintah ini hanya dapat digunakan oleh admin.');
    }
    }
    
    else if (content.startsWith('tolak ')) {
    if (userId === "6282298980601@c.us") {
    const parts = message.body.split(' ');
    if (parts.length < 3) {
    message.reply('Format salah. Gunakan: tolak [OrderID] [alasan penolakan]');
    return;
    }
    
    const rawOrderId = parts[1];
    const rejectReason = parts.slice(2).join(' ');
    const order = orderStatus.get(rawOrderId);
    
    if (order && (order.status === 'awaiting_payment' || order.status === 'awaiting_verifikasi')) {
    orderStatus.set(rawOrderId, {
    ...order,
    status: 'rejected',
    rejectReason: rejectReason
    });
    
    console.log(`Payment rejected for order: ${rawOrderId}, reason: ${rejectReason}`);
    
    const paymentRejected = `*==> PEMBAYARAN DITOLAK*
    \
    Order ID  : ${rawOrderId}
    Produk    : ${order.product}
    Status    : Ditolak ❌
    Alasan    : ${rejectReason}
    \
    
    Bukti pembayaran Anda tidak dapat diverifikasi.
    Silakan lakukan pembayaran ulang dan kirim bukti yang sesuai.`;
    
    if (order.groupId) {
    client.sendMessage(order.groupId, paymentRejected);
    message.reply(`Pembayaran untuk pesanan ${rawOrderId} telah ditolak dan notifikasi dikirim ke grup.`);
    } else {
    client.sendMessage(order.userId, paymentRejected);
    message.reply(`Pembayaran untuk pesanan ${rawOrderId} telah ditolak dan customer telah diberitahu.`);
    }
    
    orderStatus.set(rawOrderId, {
    ...order,
    status: 'awaiting_payment'
    });
    } else {
    message.reply('Order ID tidak valid atau tidak dalam status menunggu pembayaran/verifikasi.');
    }
    } else {
    message.reply('Maaf, perintah ini hanya dapat digunakan oleh admin.');
    }
    }
    
    else if (content.startsWith('proses ')) {
    if (userId === "6282298980601@c.us") {
    const rawOrderId = message.body.split(' ')[1];
    const order = orderStatus.get(rawOrderId);
    
    if (order && order.status === 'payment_received') {
    orderStatus.set(rawOrderId, {
    ...order,
    status: 'processing'
    });
    
    console.log(`Order ${rawOrderId} marked as processing`);
    
    const processInfo = `*===> PESANAN SEDANG DIPROSES*

    Order ID  : ${rawOrderId}
    Produk    : ${order.product}
    Status    : Dalam Proses 🛠️
    `;
    
    if (order.groupId) {
    await client.sendMessage(order.groupId, processInfo);
    message.reply(`✅ Notifikasi "sedang diproses" dikirim ke grup.`);
    } else {
    message.reply(`⚠️ Pesanan ini dibuat via DM. Tidak ada grup untuk dikirimi notifikasi.`);
    }
    } else {
    message.reply('Order ID tidak valid atau belum menerima pembayaran.');
    }
    } else {
    message.reply('Maaf, perintah ini hanya dapat digunakan oleh admin.');
    }
    }
    
    else if (content.startsWith('selesai ')) {
    if (userId === "6282298980601@c.us") {
    const rawOrderId = message.body.split(' ')[1];
    const order = orderStatus.get(rawOrderId);
    
    if (order && order.status === 'processing') {
    orderStatus.set(rawOrderId, {
    ...order,
    status: 'completed',
    completionTime: new Date().toLocaleTimeString('id-ID')
    });
    
    console.log(`Order ${rawOrderId} marked as completed`);
    
    // const mentionedId = `${userId.replace('@c.us', '')}@c.us`;
   const contact = await client.getContactById(order.userId);

// Pastikan contact dan contact.number ada
 if (!contact || !contact.number) {
        console.error("Gagal mendapatkan detail kontak atau nomor kontak tidak tersedia untuk userId:", order.userId);
        // Pesan error untuk admin jika kontak tidak ditemukan
        message.reply(`⚠️ Gagal mengirim notifikasi ke user ${order.userId} (detail kontak tidak ditemukan). Order ID: ${rawOrderId}. Harap hubungi manual.`);
        // Anda mungkin ingin tetap menandai order selesai di database di sini
        return; // Keluar jika kontak tidak valid
    }

    // 1. Pesan untuk GRUP (jika order.groupId ada)
    if (order.groupId) {
        const numberToMention = contact.number.split('@')[0]; // Ambil nomor saja untuk @mention
        const groupCompletionMessage = `*====== PESANAN SELESAI ======*

Order ID  : ${rawOrderId}
Produk    : ${order.product}

========================
Status    : *Selesai* 🎉🎉🎉
========================

Admin telah mengirim pesanan.
Terimakasih @${numberToMention} atas orderannya!
Ditunggu order selanjutnya~`;

        try {
            await client.sendMessage(order.groupId, groupCompletionMessage, {
                mentions: [contact]
            });
            console.log(`Pesan notifikasi selesai dikirim ke grup ${order.groupId} untuk user @${numberToMention}`);
        } catch (e) {
            console.error(`Gagal mengirim pesan ke grup ${order.groupId}:`, e);
            message.reply(`⚠️ Gagal mengirim notifikasi ke grup untuk order ${rawOrderId}.`);
        }
    }

    // 2. Pesan untuk USER (langsung ke order.userId)
    // Menggunakan pushname atau name jika tersedia untuk sapaan yang lebih personal
    const userName = contact.pushname || contact.name || 'Kak'; // Fallback jika nama tidak ada

    const userCompletionMessage = `*====== PESANAN ANDA SELESAI ======*

Halo ${userName}! Pesanan Anda sudah selesai diproses.

Order ID  : ${rawOrderId}
Produk    : ${order.product}

========================
Status    : *Selesai* 🎉🎉🎉
========================

Akun anda sedang di buat mohon menunggu beberapa saat.
Terima kasih sudah memesan! 🙏
Ditunggu order selanjutnya ya~ 😊`;

    try {
        await client.sendMessage(order.userId, userCompletionMessage); // Kirim ke user, tidak perlu mentions
        console.log(`Pesan notifikasi selesai dikirim ke user ${order.userId}`);
    } catch (e) {
        console.error(`Gagal mengirim pesan ke user ${order.userId}:`, e);
        message.reply(`⚠️ Gagal mengirim notifikasi ke user ${order.userId} untuk order ${rawOrderId}.`);
    }

    // 3. Konfirmasi ke pengirim perintah (admin)
    message.reply(`✅ Notifikasi selesai untuk order ${rawOrderId} telah dikirim ke ${order.groupId ? 'grup & user' : 'user'}.`);

} else { // Jika order tidak ditemukan
    message.reply('Order ID tidak valid atau belum diproses.');
}
    }
    }
    
    
    else if (content.startsWith('status ')) {
    const rawOrderId = message.body.split(' ')[1];
    
    debugOrderStatus(rawOrderId);
    
    let order = orderStatus.get(rawOrderId);
    
    if (!order) {
    for (const [key, value] of orderStatus.entries()) {
    if (key.toLowerCase() === rawOrderId.toLowerCase()) {
    order = value;
    break;
    }
    }
    }
    
    if (order) {
    const { statusText, emoji } = formatOrderStatus(order);
    
    let statusInfo = `=====STATUS PESANAN=====
    \
    Order ID : ${rawOrderId}
    Produk   : ${order.product}
    Status   : ${statusText} ${emoji}
    \
    `;
    
    if (order.status === 'awaiting_payment') {
    statusInfo += `Silakan lakukanhibahkan bukti transfer sebagai balasan.`;
    } else if (order.status === 'rejected' && order.rejectReason) {
    statusInfo += `Alasan penolakan: ${order.rejectReason}\nSilakan lakukan pembayaran ulang.`;
    }
    
    statusInfo += `\n========================`;
    
    message.reply(statusInfo);
    } else {
    message.reply('Order ID tidak ditemukan.');
    }
    }
    
    else if (content === '!help') {
    const helpText = `*BANTUAN CUSTOMER SERVICE*\n\n `+
    `1. !menu - Menu utama\n `+
    `2. list - Daftar produk\n `+
    `3. !order - Buat pesanan\n `+
    `4. !status [OrderID] - Cek status\n `+
    `5. !contact - Hubungi CS\n\n `+
    `*Alur Pesanan:*\n `+
    `- Pilih produk (pl [nomor])\n `+
    `- Ketik "pesan" untuk memesan\n `+
    `- Lakukan pembayaran\n `+
    `- Kirim bukti pembayaran sebagai balasan\n\n `+
    `Alternatif konfirmasi: bayar [OrderID] [Bank] [Nama]`;
    
    message.reply(helpText);
    }
    
    else if (content === '!contact') {
    const contactText = `*KONTAK CUSTOMER SERVICE*\n\n `+
    `Email: avhan46@gmail.com\n `+
    `Telepon: 0823-9512-4106\n `+
    `Jam Operasional: 07:00 - 23:59 WIB`;
    
    message.reply(contactText);
    }
    
    else if (content === 'batal') {
    let activeOrder = null;
    let activeOrderId = null;
    
    for (const [orderId, order] of orderStatus.entries()) {
    if (order.userId === userId &&
    (order.status === 'awaiting_payment' ||
    order.status === 'awaiting_verification')) {
    activeOrder = order;
    activeOrderId = orderId;
    break;
    }
    }
    
    if (activeOrder) {
    orderStatus.set(activeOrderId, {
    ...activeOrder,
    status: 'cancelled'
    });
    
    const product = products.find(p => p.name === activeOrder.product);
    if (product) {
    product.quota += 1;
    saveProductsToFile();
    }
    
    message.reply(`Pesanan ${activeOrderId} untuk produk ${activeOrder.product} telah dibatalkan. Kuota telah dikembalikan.`);
    } else {
    message.reply('Tidak ada pesanan aktif yang dapat dibatalkan.');
    }
    }
    
    } catch (error) {
    console.error('Error handling message:', error);
    message.reply('Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.');
    }
    });
    
    // Initialize the client
    client.initialize();