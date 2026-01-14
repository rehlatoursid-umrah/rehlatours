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
export const maxDuration = 60

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

export async function POST(request: NextRequest) {
  const start = Date.now()
  let filePath: string | null = null

  try {
    const formData = await request.formData()

    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()

    const caption =
      ((formData.get('caption') as string | null) ?? '') ||
      'Terima kasih atas pendaftaran Anda. Berikut adalah konfirmasi pendaftaran Anda.'

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT

    if (!whatsappEndpoint) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp API endpoint not configured' },
        { status: 500 },
      )
    }

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
      return NextResponse.json(
        { success: false, error: 'Either umrahFormData or bookingData is required' },
        { status: 400 },
      )
    }

    console.log('📄 Generating PDF for booking:', bookingId)
    const pdfDocument = createElement(ConfirmationPDF, { formData: umrahFormData, bookingId })
    const pdfBuffer = await renderToBuffer(pdfDocument as any)

    const pdfSizeKB = (pdfBuffer.byteLength / 1024).toFixed(2)
    console.log(`📊 PDF size: ${pdfSizeKB} KB`)

    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })

    const fileName = `confirmation-${bookingId}-${Date.now()}.pdf`
    filePath = path.join(tempDir, fileName)

    await fsp.writeFile(filePath, pdfBuffer as any)
    console.log('✅ PDF saved to:', filePath)

    // Format phone: tambah @s.whatsapp.net
    let formattedPhone = phone
    if (!phone.includes('@')) {
      formattedPhone = `${phone}@s.whatsapp.net`
    }

    console.log('📱 Phone formatted:', phone, '→', formattedPhone)

    // ✅ Build FormData PERSIS seperti SendFile.js
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')  // ✅ Sesuai dengan code asli
    whatsappForm.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'application/pdf',
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    console.log('🔄 Sending to WhatsApp API:', url)
    console.log('📤 Request data:', {
      phone: formattedPhone,
      caption: caption.substring(0, 50) + '...',
      fileName: fileName,
    })

    // ✅ TANPA AUTH - persis seperti window.http.post di dashboard
    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: {
        ...whatsappForm.getHeaders(),
      },
      // TIDAK ADA AUTH!
      timeout: 45000,
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
      validateStatus: () => true,
    })

    const tookMs = Date.now() - start

    console.log('📥 Response status:', whatsappResponse.status)
    console.log('📥 Response data:', JSON.stringify(whatsappResponse.data))

    if (whatsappResponse.status < 200 || whatsappResponse.status >= 300) {
      console.error('❌ WhatsApp API error:', {
        status: whatsappResponse.status,
        data: whatsappResponse.data,
      })
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send WhatsApp message',
          status: whatsappResponse.status,
          details: whatsappResponse.data,
          tookMs,
        },
        { status: 502 },
      )
    }

    console.log('✅ WhatsApp message sent successfully!')

    return NextResponse.json({
      success: true,
      message: 'PDF confirmation sent successfully',
      bookingId,
      phone: formattedPhone,
      pdfSizeKB: parseFloat(pdfSizeKB),
      tookMs,
      timestamp: new Date().toISOString(),
      whatsappResponse: whatsappResponse.data,
    })
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message, stack: error.stack }, { status: 500 })
  } finally {
    if (filePath) {
      try {
        await fsp.unlink(filePath)
        console.log('🗑️ Temp file deleted')
      } catch {}
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Send PDF Confirmation API',
    version: '2.0',
    usage: {
      method: 'POST',
      endpoint: '/api/send-file',
      body: {
        phone: '628xxx (will be formatted to 628xxx@s.whatsapp.net)',
        umrahFormData: 'JSON string of UmrahFormData',
        bookingId: 'string',
        caption: 'string (optional)',
      },
    },
  })
}

