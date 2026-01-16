import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'
import path from 'path'
import axios from 'axios'
import { promises as fsp } from 'fs'
import fs from 'fs'

// CATATAN PENTING:
// Kode ini sengaja TIDAK mengimport komponen React dari src/components
// untuk menghindari error build di server Next.js App Router.
// Sebagai gantinya, kita generate file konfirmasi teks sederhana.

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

// === Normalisasi Data ===
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

// === GENERATOR FILE TEKS (Server-Safe) ===
async function generateServerPdf(data: AnyFormData, bookingId: string, isHemat: boolean): Promise<Buffer> {
    const title = isHemat ? 'KONFIRMASI TABUNGAN UMRAH HEMAT' : 'KONFIRMASI PENDAFTARAN UMRAH'
    const date = new Date().toISOString().split('T')[0]
    const rupiah = (val: any) => 'Rp ' + Number(val || 0).toLocaleString('id-ID')

    // Template Text Rapi
    let content = `
==================================================
           ${title}
==================================================
ID Booking    : ${bookingId}
Tanggal       : ${date}
--------------------------------------------------

DATA JAMAAH
Nama Lengkap  : ${data.name}
No. WhatsApp  : ${data.whatsapp_number}
Email         : ${data.email}
Domisili      : ${data.city || '-'}, ${data.province || '-'}

PAKET UMRAH
Pilihan Paket : ${data.umrahpackage}

${isHemat ? `
RENCANA TABUNGAN
Nominal Setor : ${rupiah(data.installmentamount)}
Frekuensi     : ${data.installmentfrequency}
Catatan       : ${data.installmentnotes || '-'}
` : `
PEMBAYARAN
Metode        : ${data.payment_type || data.payment_method || '-'}
`}

--------------------------------------------------
Terima kasih telah mendaftar di Rehla Tours.
Simpan dokumen ini sebagai bukti pendaftaran.
Website: hematumrah.rehlatours.id
==================================================
`
    return Buffer.from(content, 'utf-8')
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
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9-_]/g, '')
    const isHemat = bookingId.startsWith('HU-') || pdfData.payment_type === 'tabungan_custom'

    // ✅ GENERATE FILE TXT
    const pdfBuffer = await generateServerPdf(pdfData, bookingId, isHemat)
    
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    const fileName = `confirmation-${safeBookingId}.txt` // Ekstensi .txt
    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer)

    const formattedPhone = formatPhoneForWhatsAppJid(phone)
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')
    whatsappForm.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'text/plain',
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 45000,
      validateStatus: () => true,
    })

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      return NextResponse.json({ success: true, message: 'File sent', bookingId })
    }

    return NextResponse.json({ success: false, error: 'WA Failed' }, { status: 502 })

  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  } finally {
    if (filePath) await fsp.unlink(filePath).catch(() => {})
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready', version: '2.3-no-react-import' })
}

