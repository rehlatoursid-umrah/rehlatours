import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'
import path from 'path'
import axios from 'axios'
import { promises as fsp } from 'fs'
import fs from 'fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib' // ✅ IMPORT BARU

export const runtime = 'nodejs'
export const maxDuration = 60

type AnyFormData = Record<string, any>

interface LegacyBookingData {
  bookingId: string
  customerName: string
  email: string
  whatsappNumber: string
  phoneNumber: string
  packageName: string
  paymentMethod: string
}

function safeJsonParse<T>(
  value: string,
  label: string,
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(value) as T }
  } catch {
    return { ok: false, error: `Invalid ${label} format` }
  }
}

function formatPhoneForWhatsAppJid(phone: string): string {
  let formattedPhone = (phone || '').replace(/\D/g, '')
  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1)
  if (formattedPhone && !formattedPhone.startsWith('62')) formattedPhone = '62' + formattedPhone
  if (formattedPhone && !formattedPhone.includes('@')) formattedPhone += '@s.whatsapp.net'
  return formattedPhone
}

// === Normalisasi ===
function normalizeForPdf(input: AnyFormData): AnyFormData {
  const data = input || {}
  return {
    ...data,
    name: data.name ?? data.customerName ?? '',
    email: data.email ?? '',
    phone_number: data.phone_number ?? data.phoneNumber ?? '',
    whatsapp_number: data.whatsapp_number ?? data.whatsappNumber ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    province: data.province ?? '',
    umrahpackage: data.umrahpackage ?? data.umrah_package ?? data.packageName ?? '',
    payment_type: data.payment_type ?? 'tabungan_custom',
    installmentamount: data.installmentamount ?? data.installment_amount ?? '',
    installmentfrequency: data.installmentfrequency ?? data.installment_frequency ?? '',
    installmentnotes: data.installmentnotes ?? data.installment_notes ?? '',
    submission_date: data.submission_date ?? data.register_date ?? '',
  }
}

function convertLegacyToGeneric(legacyData: LegacyBookingData): AnyFormData {
  return {
    name: legacyData.customerName || '',
    email: legacyData.email || '',
    whatsapp_number: legacyData.whatsappNumber || '',
    phone_number: legacyData.phoneNumber || '',
    umrahpackage: legacyData.packageName || '',
    payment_method: legacyData.paymentMethod || '',
    terms_of_service: true,
  }
}

// === GENERATOR PDF ASLI (Server-Side Safe dengan pdf-lib) ===
async function generateServerPdf(data: AnyFormData, bookingId: string, isHemat: boolean): Promise<Buffer> {
    // 1. Create a new PDFDocument
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const { width, height } = page.getSize()
    
    // 2. Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // 3. Helper untuk menggambar teks
    const drawText = (text: string, x: number, y: number, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
        page.drawText(text || '', {
            x,
            y,
            size,
            font: isBold ? fontBold : font,
            color,
        })
    }

    // 4. JUDUL HEADER
    const title = isHemat ? 'KONFIRMASI TABUNGAN UMRAH HEMAT' : 'KONFIRMASI PENDAFTARAN UMRAH'
    const colorTitle = isHemat ? rgb(0, 0.5, 0) : rgb(0, 0, 0.8) // Hijau untuk Hemat, Biru untuk Regular

    drawText(title, 50, height - 50, 18, true, colorTitle)
    drawText('Rehla Tours & Travel', 50, height - 75, 12, false, rgb(0.4, 0.4, 0.4))
    
    // Garis Header
    page.drawLine({
        start: { x: 50, y: height - 90 },
        end: { x: width - 50, y: height - 90 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    })

    // 5. INFO BOOKING
    let y = height - 120
    const lineHeight = 20

    drawText(`ID Booking: ${bookingId}`, 50, y, 12, true)
    y -= lineHeight
    drawText(`Tanggal: ${new Date().toISOString().split('T')[0]}`, 50, y, 12, false)
    y -= (lineHeight * 2)

    // 6. SECTION DATA PRIBADI
    drawText('DATA JAMAAH', 50, y, 14, true, colorTitle)
    y -= (lineHeight * 1.5)

    const labels = [
        { l: 'Nama Lengkap', v: data.name },
        { l: 'WhatsApp', v: data.whatsapp_number },
        { l: 'Email', v: data.email },
        { l: 'Domisili', v: `${data.city || '-'}, ${data.province || '-'}` }
    ]

    labels.forEach(item => {
        drawText(item.l, 50, y, 10, true)
        drawText(':', 150, y, 10)
        drawText(String(item.v), 160, y, 10)
        y -= lineHeight
    })
    y -= lineHeight

    // 7. SECTION PAKET
    drawText('PAKET UMRAH', 50, y, 14, true, colorTitle)
    y -= (lineHeight * 1.5)
    
    drawText('Pilihan Paket', 50, y, 10, true)
    drawText(':', 150, y, 10)
    drawText(String(data.umrahpackage), 160, y, 10)
    y -= (lineHeight * 2)

    // 8. SECTION TABUNGAN / PEMBAYARAN (BOX STYLE)
    // Gambar Box Background
    const boxHeight = isHemat ? 120 : 80
    page.drawRectangle({
        x: 40,
        y: y - boxHeight,
        width: width - 80,
        height: boxHeight,
        color: isHemat ? rgb(0.9, 1, 0.9) : rgb(0.9, 0.9, 1), // Hijau muda / Biru muda
        borderColor: isHemat ? rgb(0, 0.5, 0) : rgb(0, 0, 0.8),
        borderWidth: 1,
    })

    const boxY = y - 30
    const boxTextX = 60

    if (isHemat) {
        drawText('RENCANA TABUNGAN', boxTextX, boxY, 14, true, colorTitle)
        
        const nominal = 'Rp ' + Number(data.installmentamount || 0).toLocaleString('id-ID')
        drawText('Nominal Setoran :', boxTextX, boxY - 30, 10, true)
        drawText(nominal, boxTextX + 100, boxY - 30, 12, true, colorTitle) // Lebih besar & berwarna

        drawText('Frekuensi :', boxTextX, boxY - 50, 10, true)
        drawText(String(data.installmentfrequency), boxTextX + 100, boxY - 50, 10)

        drawText('Catatan :', boxTextX, boxY - 70, 10, true)
        drawText(String(data.installmentnotes || '-'), boxTextX + 100, boxY - 70, 10)
    } else {
        drawText('METODE PEMBAYARAN', boxTextX, boxY, 14, true, colorTitle)
        drawText('Metode :', boxTextX, boxY - 30, 10, true)
        drawText(String(data.payment_type || data.payment_method || '-'), boxTextX + 100, boxY - 30, 10)
    }

    // 9. FOOTER
    drawText('Terima kasih telah mempercayakan perjalanan ibadah Anda kepada Rehla Tours.', 50, 50, 9, false, rgb(0.5, 0.5, 0.5))
    drawText('Website: hematumrah.rehlatours.id', 50, 38, 9, false, rgb(0.5, 0.5, 0.5))

    // Serialize to buffer
    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  let filePath: string | null = null

  try {
    const formData = await request.formData()
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran'

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      console.error('❌ WhatsApp API config missing')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    let parsedData: AnyFormData
    let bookingId: string = bookingIdInput || `HU-${Date.now()}`

    if (umrahFormDataJson) {
      const parsed = safeJsonParse<AnyFormData>(umrahFormDataJson, 'umrahFormData')
      if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      parsedData = parsed.data
    } else if (bookingDataJson) {
      const parsed = safeJsonParse<LegacyBookingData>(bookingDataJson, 'bookingData')
      if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      parsedData = convertLegacyToGeneric(parsed.data)
      bookingId = parsed.data.bookingId || bookingId
    } else {
      return NextResponse.json({ success: false, error: 'Data missing' }, { status: 400 })
    }

    const pdfData = normalizeForPdf(parsedData)
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9-_]/g, '')
    
    // Detect Mode
    const isHemat = bookingId.startsWith('HU-') || pdfData.payment_type === 'tabungan_custom'
    console.log(`🎯 PDF MODE: ${isHemat ? 'HEMAT' : 'REGULAR'} | ID: ${bookingId}`)

    // ========================================
    // ✅ GENERATE PDF ASLI (pdf-lib)
    // ========================================
    const pdfBuffer = await generateServerPdf(pdfData, bookingId, isHemat)
    
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    
    // SEKARANG SUDAH PDF ASLI!
    const fileName = `confirmation-${safeBookingId}.pdf` 

    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer)

    const sizeKB = (pdfBuffer.byteLength / 1024).toFixed(2)
    console.log(`✅ PDF Generated: ${fileName} (${sizeKB} KB)`)

    const formattedPhone = formatPhoneForWhatsAppJid(phone)
    if (!formattedPhone) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

    // Prepare WhatsApp Form
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')
    whatsappForm.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'application/pdf', // ✅ Content type PDF
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`

    console.log(`🚀 Sending PDF to: ${formattedPhone}`)

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 45000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    })

    console.log(`📥 WA Status: ${whatsappResponse.status}`)
    
    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      return NextResponse.json({
        success: true,
        message: 'PDF sent successfully',
        bookingId,
        type: isHemat ? 'hemat' : 'regular'
      })
    }

    console.error(`❌ WA Failed:`, JSON.stringify(whatsappResponse.data).substring(0, 500))
    return NextResponse.json(
      {
        success: false,
        error: 'WhatsApp API failed',
        status: whatsappResponse.status,
        details: whatsappResponse.data,
      },
      { status: 502 },
    )

  } catch (error: any) {
    console.error('❌ Fatal error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 },
    )
  } finally {
    if (filePath) {
      try {
        await fsp.unlink(filePath)
      } catch {}
    }
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    version: '3.0-pdf-lib-server',
  })
}



