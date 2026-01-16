import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'
import path from 'path'
import axios from 'axios'
import { promises as fsp } from 'fs'
import fs from 'fs'
// ✅ PASTIKAN: npm install pdf-lib
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

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

function normalizeForPdf(input: AnyFormData): AnyFormData {
  const data = input || {}
  return {
    ...data,
    name: data.name ?? data.customerName ?? '',
    email: data.email ?? '',
    phone_number: data.phone_number ?? data.phoneNumber ?? '',
    whatsapp_number: data.whatsapp_number ?? data.whatsappNumber ?? '',
    city: data.city ?? '',
    province: data.province ?? '',
    umrahpackage: data.umrahpackage ?? data.umrah_package ?? data.packageName ?? '',
    installmentamount: data.installmentamount ?? data.installment_amount ?? '',
    installmentfrequency: data.installmentfrequency ?? data.installment_frequency ?? '',
    installmentnotes: data.installmentnotes ?? data.installment_notes ?? '',
    payment_method: data.payment_method ?? data.payment_type ?? '',
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
  }
}

// === GENERATOR PDF ASLI (Menggantikan versi .txt) ===
async function generateServerPdf(data: AnyFormData, bookingId: string, isHemat: boolean): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    const { width, height } = page.getSize()
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const drawText = (text: string, x: number, y: number, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
        page.drawText(String(text || ''), { x, y, size, font: isBold ? fontBold : font, color })
    }

    const primaryColor = isHemat ? rgb(0, 0.5, 0) : rgb(0, 0.2, 0.6)

    // Header
    drawText(isHemat ? 'KONFIRMASI TABUNGAN UMRAH HEMAT' : 'KONFIRMASI PENDAFTARAN UMRAH', 50, height - 50, 16, true, primaryColor)
    drawText('Rehla Tours & Travel', 50, height - 70, 10, false, rgb(0.5, 0.5, 0.5))
    
    page.drawLine({
        start: { x: 50, y: height - 85 },
        end: { x: width - 50, y: height - 85 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    })

    let y = height - 120
    const lineHeight = 20

    drawText(`ID Booking: ${bookingId}`, 50, y, 12, true)
    y -= lineHeight
    drawText(`Tanggal: ${new Date().toISOString().split('T')[0]}`, 50, y, 10)
    y -= 40

    // Data Jamaah
    drawText('DATA JAMAAH', 50, y, 12, true, primaryColor)
    y -= 25
    
    drawText('Nama Lengkap', 50, y, 10, true)
    drawText(':', 150, y, 10)
    drawText(data.name, 160, y, 10)
    y -= lineHeight

    drawText('No. WhatsApp', 50, y, 10, true)
    drawText(':', 150, y, 10)
    drawText(data.whatsapp_number, 160, y, 10)
    y -= lineHeight

    drawText('Domisili', 50, y, 10, true)
    drawText(':', 150, y, 10)
    drawText(`${data.city || '-'}, ${data.province || '-'}`, 160, y, 10)
    y -= 40

    // Paket
    drawText('PAKET UMRAH', 50, y, 12, true, primaryColor)
    y -= 25
    drawText('Paket Dipilih', 50, y, 10, true)
    drawText(':', 150, y, 10)
    drawText(data.umrahpackage, 160, y, 10)
    y -= 40

    // Box Info
    const boxHeight = 100
    page.drawRectangle({
        x: 40, y: y - boxHeight, width: width - 80, height: boxHeight,
        color: isHemat ? rgb(0.95, 1, 0.95) : rgb(0.95, 0.95, 1),
        borderColor: primaryColor, borderWidth: 1,
    })

    const boxY = y - 25
    const boxX = 60

    if (isHemat) {
        drawText('RENCANA TABUNGAN', boxX, boxY, 12, true, primaryColor)
        drawText(`Nominal Setoran: Rp ${Number(data.installmentamount || 0).toLocaleString('id-ID')}`, boxX, boxY - 30, 10)
        drawText(`Frekuensi: ${data.installmentfrequency}`, boxX, boxY - 50, 10)
        drawText(`Catatan: ${data.installmentnotes || '-'}`, boxX, boxY - 70, 10)
    } else {
        drawText('METODE PEMBAYARAN', boxX, boxY, 12, true, primaryColor)
        drawText(`Metode: ${data.payment_method || '-'}`, boxX, boxY - 30, 10)
    }

    drawText('Terima kasih telah mendaftar di Rehla Tours.', 50, 50, 9, false, rgb(0.5, 0.5, 0.5))

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

export async function POST(request: NextRequest) {
  let filePath: string | null = null

  try {
    const formData = await request.formData()
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran'

    if (!phone) return NextResponse.json({ success: false, error: 'Phone required' }, { status: 400 })

    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      return NextResponse.json({ success: false, error: 'Config missing' }, { status: 500 })
    }

    let parsedData: AnyFormData
    let bookingId: string = bookingIdInput || `HU-${Date.now()}`

    if (umrahFormDataJson) {
      const parsed = safeJsonParse<AnyFormData>(umrahFormDataJson, 'umrahFormData')
      parsedData = parsed.ok ? parsed.data : {}
    } else if (bookingDataJson) {
      const parsed = safeJsonParse<LegacyBookingData>(bookingDataJson, 'bookingData')
      parsedData = parsed.ok ? convertLegacyToGeneric(parsed.data) : {}
      if (parsed.ok) bookingId = parsed.data.bookingId || bookingId
    } else {
      return NextResponse.json({ success: false, error: 'Data missing' }, { status: 400 })
    }

    const pdfData = normalizeForPdf(parsedData)
    const isHemat = bookingId.startsWith('HU-') || pdfData.payment_method === 'tabungan_custom'
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9-_]/g, '')

    // ✅ GENERATE PDF ASLI
    const pdfBuffer = await generateServerPdf(pdfData, bookingId, isHemat)
    
    // Simpan Temp File PDF
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    const fileName = `confirmation-${safeBookingId}.pdf` // ✅ Ekstensi PDF
    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer)

    const formattedPhone = formatPhoneForWhatsAppJid(phone)
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')
    whatsappForm.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'application/pdf', // ✅ MIME PDF
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    
    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 45000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    })

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      return NextResponse.json({ success: true, message: 'PDF sent successfully', bookingId })
    }

    return NextResponse.json({ success: false, error: 'WA Failed', details: whatsappResponse.data }, { status: 502 })
  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  } finally {
    if (filePath) await fsp.unlink(filePath).catch(() => {})
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready' })
}
