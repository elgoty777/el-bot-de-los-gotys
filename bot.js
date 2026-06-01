const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadMediaMessage
} = require("@whiskeysockets/baileys")

const qrcode = require("qrcode-terminal")
const sharp = require("sharp")
const ffmpeg = require("fluent-ffmpeg")
const ffmpegPath = require("ffmpeg-static")
const puppeteer = require("puppeteer")
const fs = require("fs")
const path = require("path")

ffmpeg.setFfmpegPath(ffmpegPath)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ["Windows", "Chrome", "120.0.0"]
    })

    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update
        if (qr) {
            console.log("📱 Escanea este QR:")
            qrcode.generate(qr, { small: true })
        }
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) startBot()
        }
        if (connection === "open") console.log("✅ BOT CONECTADO")
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

// --- COMANDO NOTA ---
        if (text.startsWith("nota ")) {
            const notaTexto = text.slice(5)
            const url = `https://grupote.lovestoblog.com/notas/nota.html?texto=${encodeURIComponent(notaTexto)}`

            try {
                const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] })
                const page = await browser.newPage()
                await page.setViewport({ width: 400, height: 400 })
                await page.goto(url, { waitUntil: 'networkidle2' })
                const screenshot = await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 400 } })
                await browser.close()
                
                // Envía solo la imagen sin texto
                await sock.sendMessage(from, { image: screenshot })
            } catch (error) {
                await sock.sendMessage(from, { text: "❌ Error al generar la nota." })
            }
        }

        // --- COMANDO STICKER ---
        if (text.toLowerCase() === "sticker") {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted) {
                await sock.sendMessage(from, { text: "❌ Responde a una imagen o archivo con *sticker*" })
                return
            }

            const type = Object.keys(quoted)[0]
            const quotedContent = quoted[type]
            const mimetype = quotedContent?.mimetype || ""
            const isImage = type === "imageMessage" || (type === "documentMessage" && mimetype.startsWith("image/"))
            const isVideo = type === "videoMessage" || (type === "documentMessage" && mimetype.startsWith("video/"))

            if (!isImage && !isVideo) {
                await sock.sendMessage(from, { text: "❌ Formato no compatible." })
                return
            }

            try {
                const buffer = await downloadMediaMessage({ message: quoted, key: msg.key }, "buffer", {}, { logger: console, reuploadRequest: sock.updateMediaMessage })

                if (isImage) {
                    const sticker = await sharp(buffer).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 100 }).toBuffer()
                    await sock.sendMessage(from, { sticker })
                } else if (isVideo) {
                    const inputPath = path.join(__dirname, "input.mp4")
                    const outputPath = path.join(__dirname, "output.webp")
                    fs.writeFileSync(inputPath, buffer)
                    await new Promise((resolve, reject) => {
                        ffmpeg(inputPath).outputOptions(["-vcodec libwebp", "-vf", "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba,fps=10", "-loop 0", "-ss 00:00:00", "-t 00:00:05", "-preset default", "-an", "-vsync 0"]).toFormat("webp").save(outputPath).on("end", resolve).on("error", reject)
                    })
                    await sock.sendMessage(from, { sticker: fs.readFileSync(outputPath) })
                    fs.unlinkSync(inputPath); fs.unlinkSync(outputPath)
                }
            } catch (error) {
                await sock.sendMessage(from, { text: "❌ Error creando sticker" })
            }
        }
    })
}

startBot()