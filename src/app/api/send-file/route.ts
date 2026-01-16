import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'
import path from 'path'
import axios from 'axios'
import { promises as fsp } from 'fs'
import fs from 'fs'

// Hapus import React-PDF yang menyebabkan MODULE_NOT_FOUND
// import { renderToBuffer } from '@react-pdf/renderer'
// import { createElement } from 'react'

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

// === Normalisasi data ===
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

// === FUNGSI GENERATE PDF SEDERHANA (Server-Side Safe) ===
// Ini menggantikan React-PDF untuk menghindari error MODULE_NOT_FOUND
async function generateServerPdf(data: AnyFormData, bookingId: string, isHemat: boolean): Promise<Buffer> {
    // Kita buat PDF text sederhana dulu agar sistem berjalan.
    // Jika ingin layout visual bagus, nanti bisa install 'pdf-lib' atau 'jspdf' yang aman di server.
    
    const title = isHemat ? 'KONFIRMASI TABUNGAN UMRAH HEMAT' : 'KONFIRMASI PENDAFTARAN UMRAH'
    const date = new Date().toISOString().split('T')[0]
    
    let content = `
=========================================
      ${title}
=========================================
ID Booking    : ${bookingId}
Tanggal       : ${date}
-----------------------------------------

DATA JAMAAH:
Nama Lengkap  : ${data.name}
No. WhatsApp  : ${data.whatsapp_number}
Email         : ${data.email}
Domisili      : ${data.city || '-'}, ${data.province || '-'}

PAKET UMRAH:
Paket Dipilih : ${data.umrahpackage}

${isHemat ? `
RENCANA TABUNGAN:
Nominal Setor : Rp ${Number(data.installmentamount || 0).toLocaleString('id-ID')}
Frekuensi     : ${data.installmentfrequency}
Catatan       : ${data.installmentnotes || '-'}
` : `
PEMBAYARAN:
Metode        : ${data.payment_type || data.payment_method || '-'}
`}

-----------------------------------------
Terima kasih telah mendaftar di Rehla Tours.
Simpan dokumen ini sebagai bukti pendaftaran.
Website: hematumrah.rehlatours.id
=========================================
`

    return Buffer.from(content, 'utf-8')
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

    // Config Check
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      console.error('❌ WhatsApp API config missing')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    // Parse Data
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
    
    // Detect Type
    const isHemat = bookingId.startsWith('HU-') || pdfData.payment_type === 'tabungan_custom'
    console.log(`🎯 MODE: ${isHemat ? 'HEMAT' : 'REGULAR'} | ID: ${bookingId}`)

    // ========================================
    // ✅ FIX: Generate PDF Server-Safe
    // ========================================
    // Kita gunakan fungsi internal generateServerPdf alih-alih import component React
    const pdfBuffer = await generateServerPdf(pdfData, bookingId, isHemat)
    
    // Save Temp File
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    
    // Ganti ekstensi jadi .txt dulu jika ingin simple text, atau tetap .pdf jika nanti pakai library PDF
    // Agar WA terima sebagai dokumen, kita namakan .txt (karena kontennya text plain saat ini)
    // ATAU: Jika ingin tetap .pdf, konten Buffer harus format PDF valid. 
    // Untuk solusi cepat tanpa library: Kita kirim file .txt dulu isinya detail pendaftaran.
    // Nanti Anda bisa install 'pdf-lib' untuk buat PDF beneran di server.
    const fileName = `confirmation-${safeBookingId}.txt` 

    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer)

    const sizeKB = (pdfBuffer.byteLength / 1024).toFixed(2)
    console.log(`✅ File Created: ${fileName} (${sizeKB} KB)`)

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
      contentType: 'text/plain', // Ubah contentType sesuai file
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`

    console.log(`🚀 Sending WA to: ${formattedPhone}`)

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 45000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    })

    const tookMs = Date.now() - start
    
    // Log Detail Response WA
    console.log(`📥 WA Response Status: ${whatsappResponse.status}`)
    // console.log(`📥 WA Body:`, JSON.stringify(whatsappResponse.data).substring(0, 200))

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      return NextResponse.json({
        success: true,
        message: 'File sent successfully',
        bookingId,
        whatsappResponse: whatsappResponse.data,
        type: isHemat ? 'hemat' : 'regular'
      })
    }

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
      {
        success: false,
        error: error?.message || 'Unknown error',
      },
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
    version: '2.2-server-safe',
  })
}

