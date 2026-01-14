import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import ConfirmationPDF from '@/components/ConfirmationPDF'
import { UmrahFormData } from '@/types/form'
import FormData from 'form-data'
import path from 'path'
import axios from 'axios'
import { promises as fsp } from 'fs'
import fs from 'fs'

export const runtime = 'nodejs'
export const maxDuration = 60 // Max duration 60 detik (Vercel Hobby/Pro)

// --- Helper Types & Functions (Sama seperti sebelumnya) ---

interface LegacyBookingData {
  bookingId: string
  customerName: string
  email: string
  whatsappNumber: string
  phoneNumber: string
  packageName: string
  paymentMethod: string
}

function convertLegacyToUmrahData(legacyData: LegacyBookingData): UmrahFormData {
  return {
    name: legacyData.customerName || '',
    register_date: new Date().toISOString().split('T')[0],
    gender: 'male',
    place_of_birth: '',
    birth_date: '',
    father_name: '',
    mother_name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    occupation: '',
    specific_disease: false,
    illness: '',
    special_needs: false,
    wheelchair: false,
    nik_number: '',
    passport_number: '',
    date_of_issue: '',
    expiry_date: '',
    place_of_issue: '',
    phone_number: legacyData.phoneNumber || '',
    whatsapp_number: legacyData.whatsappNumber || '',
    email: legacyData.email || '',
    has_performed_umrah: false,
    has_performed_hajj: false,
    emergency_contact_name: '',
    relationship: 'parents',
    emergency_contact_phone: '',
    mariage_status: 'single',
    umrah_package: legacyData.packageName || '',
    payment_method: legacyData.paymentMethod === 'Lunas' ? 'lunas' : '60_percent',
    terms_of_service: true,
  }
}

function safeJsonParse<T>(value: string, label: string): { ok: true; data: T } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(value) as T }
  } catch {
    return { ok: false, error: `Invalid ${label} format` }
  }
}

// --- MAIN HANDLER ---

export async function POST(request: NextRequest) {
  const start = Date.now()
  let filePath: string | null = null

  try {
    // 1. Parse Request
    const formData = await request.formData()
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran Umrah'

    // 2. Validate Phone
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    // 3. Get WhatsApp Config
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    if (!whatsappEndpoint) {
      console.error('❌ WHATSAPP_API_ENDPOINT is missing')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    // 4. Parse Data & Generate ID
    let umrahFormData: UmrahFormData
    let bookingId: string = bookingIdInput || `RT-${Date.now()}`

    if (umrahFormDataJson) {
      const parsed = safeJsonParse<UmrahFormData>(umrahFormDataJson, 'umrahFormData')
      if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      umrahFormData = parsed.data
    } else if (bookingDataJson) {
      const parsed = safeJsonParse<LegacyBookingData>(bookingDataJson, 'bookingData')
      if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      const legacy = parsed.data
      umrahFormData = convertLegacyToUmrahData(legacy)
      bookingId = legacy.bookingId || bookingId
    } else {
      return NextResponse.json({ success: false, error: 'Data missing' }, { status: 400 })
    }

    // 5. Generate PDF
    console.log(`📄 Generating PDF for ${bookingId}...`)
    const pdfDocument = createElement(ConfirmationPDF, { formData: umrahFormData, bookingId })
    const pdfBuffer = await renderToBuffer(pdfDocument as any)
    
    // Save to temp
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    const fileName = `confirmation-${bookingId}.pdf`
    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer as any)
    console.log(`✅ PDF Saved: ${filePath} (${(pdfBuffer.byteLength / 1024).toFixed(2)} KB)`)

    // 6. Prepare WhatsApp Request
    // Format: 628xxx@s.whatsapp.net
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1)
    if (!formattedPhone.includes('@')) formattedPhone += '@s.whatsapp.net'

    // Build FormData (MATCHING DASHBOARD VUE.JS CODE)
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false') // Penting! String 'false'
    whatsappForm.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'application/pdf',
    })

    // URL: /send/file
    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    
    console.log(`🚀 Sending to WA API: ${url}`)
    console.log(`   Phone: ${formattedPhone}`)

    // 7. Send Request (NO AUTH - Sesuai Dashboard)
    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: {
        ...whatsappForm.getHeaders(),
        // Jangan tambah Authorization header jika dashboard tidak pakai
      },
      timeout: 45000, // 45s timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true // Jangan throw error dulu
    })

    const tookMs = Date.now() - start
    console.log(`📥 WA Response (${whatsappResponse.status}):`, JSON.stringify(whatsappResponse.data).substring(0, 200))

    // Handle Response
    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
       return NextResponse.json({
        success: true,
        message: 'PDF sent successfully',
        data: whatsappResponse.data,
        tookMs
      })
    } else {
      // Jika 401, berarti memang butuh Auth (tapi dashboard mungkin pakai cookie session)
      // Kita return error tapi dengan detail
      console.error('❌ WA Send Failed:', whatsappResponse.data)
      return NextResponse.json({
        success: false,
        error: 'WhatsApp API Failed',
        status: whatsappResponse.status,
        details: whatsappResponse.data,
        tookMs
      }, { status: 502 })
    }

  } catch (error: any) {
    console.error('❌ Fatal API Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  } finally {
    // Cleanup
    if (filePath) {
      try { await fsp.unlink(filePath) } catch {}
    }
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready', endpoint: '/api/send-file' })
}


