import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import HematConfirmationPDF from '@/components/HematConfirmationPDF' // Import komponen desain Anda
import FormData from 'form-data'
import axios from 'axios'

// ⚠️ PENTING: Runtime nodejs wajib untuk generate PDF
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

// === HELPER FUNCTIONS ===
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

function normalizeData(input: AnyFormData): AnyFormData {
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
    installmentamount: data.installmentamount ?? data.installment_amount ?? 0,
    installmentfrequency: data.installmentfrequency ?? data.installment_frequency ?? '',
    installmentnotes: data.installmentnotes ?? data.installment_notes ?? '',
    submission_date: data.submission_date ?? data.register_date ?? new Date().toISOString(),
    gender: data.gender ?? 'male', // Default jika kosong
    place_of_birth: data.place_of_birth ?? '',
    birth_date: data.birth_date ?? '',
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

// === MAIN API HANDLER ===
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran'

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone required' }, { status: 400 })
    }

    // Config WA
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      return NextResponse.json({ success: false, error: 'Config missing' }, { status: 500 })
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

    // Siapkan data untuk Props Component
    const normalizedData = normalizeData(parsedData)
    
    // Mapping ke tipe data yang diminta HematConfirmationPDF
    const pdfProps = {
      formData: {
        name: normalizedData.name,
        email: normalizedData.email,
        phone_number: normalizedData.phone_number,
        whatsapp_number: normalizedData.whatsapp_number,
        gender: normalizedData.gender,
        place_of_birth: normalizedData.place_of_birth,
        birth_date: normalizedData.birth_date,
        address: normalizedData.address,
        city: normalizedData.city,
        province: normalizedData.province,
        umrahpackage: normalizedData.umrahpackage,
        installmentamount: normalizedData.installmentamount,
        installmentfrequency: normalizedData.installmentfrequency,
        installmentnotes: normalizedData.installmentnotes,
        submission_date: normalizedData.submission_date,
        booking_id: bookingId,
      },
      bookingId: bookingId
    }

    // ✅ GENERATE PDF BUFFER DARI REACT COMPONENT
    // Kita render component React menjadi buffer PDF binary
    const pdfBuffer = await renderToBuffer(
        <HematConfirmationPDF formData={pdfProps.formData} bookingId={pdfProps.bookingId} />
    )

    const formattedPhone = formatPhoneForWhatsAppJid(phone)
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9-_]/g, '')
    const fileName = `confirmation-${safeBookingId}.pdf`

    // Buat Form Data untuk kirim ke WA
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')
    whatsappForm.append('file', pdfBuffer, { // Kirim Buffer langsung (tanpa simpan ke disk)
      filename: fileName,
      contentType: 'application/pdf',
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    console.log(`🚀 Sending PDF (${fileName}) to ${formattedPhone}...`)

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 60000, // Perpanjang timeout karena generate PDF butuh waktu
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    })

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      console.log('✅ PDF Sent Successfully')
      return NextResponse.json({
        success: true,
        message: 'PDF sent successfully',
        bookingId,
      })
    }

    console.error('❌ WA Failed:', whatsappResponse.data)
    return NextResponse.json({ success: false, error: 'WA Failed', details: whatsappResponse.data }, { status: 502 })

  } catch (error: any) {
    console.error('❌ Fatal Error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready', version: '4.0-react-pdf-renderer' })
}
