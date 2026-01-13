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

export const runtime = 'nodejs' // ensure Node.js runtime on Vercel

// Legacy interface for backward compatibility
interface LegacyBookingData {
  bookingId: string
  customerName: string
  email: string
  whatsappNumber: string
  phoneNumber: string
  packageName: string
  paymentMethod: string
}

// Convert legacy booking data to UmrahFormData
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

    const is_forwarded = (formData.get('is_forwarded') as string | null) === 'true'
    const durationRaw = (formData.get('duration') as string | null) || ''
    const duration = Number.isFinite(Number(durationRaw)) ? Number(durationRaw) : 3600

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    // WhatsApp API configuration
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp API configuration missing' },
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

    // Generate PDF
    const pdfDocument = createElement(ConfirmationPDF, { formData: umrahFormData, bookingId })
    const pdfBuffer = await renderToBuffer(pdfDocument as any)

    // TEMP DIR for Vercel serverless
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })

    const fileName = `confirmation-${bookingId}-${Date.now()}.pdf`
    filePath = path.join(tempDir, fileName)

    await fsp.writeFile(filePath, pdfBuffer as any)

    // Build multipart for WhatsApp API
    const whatsappForm = new FormData()
    whatsappForm.append('phone', phone)
    whatsappForm.append('caption', caption)
    whatsappForm.append('file', fs.createReadStream(filePath), fileName)
    whatsappForm.append('is_forwarded', String(is_forwarded))
    whatsappForm.append('duration', String(duration))

    // Send to WhatsApp API
    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: {
        ...whatsappForm.getHeaders(),
      },
      auth: {
        username: whatsappUsername,
        password: whatsappPassword,
      },
      // optional safety to avoid hanging functions
      timeout: 60_000,
      // make axios not throw on non-2xx so we can return better error body
      validateStatus: () => true,
    })

    const tookMs = Date.now() - start

    if (whatsappResponse.status < 200 || whatsappResponse.status >= 300) {
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

    return NextResponse.json({
      success: true,
      message: 'PDF confirmation sent successfully',
      bookingId,
      phone,
      tookMs,
      timestamp: new Date().toISOString(),
      whatsappResponse: whatsappResponse.data,
    })
  } catch (error: any) {
    // avoid returning raw error object (often not serializable)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    // Cleanup temp file no matter what
    if (filePath) {
      try {
        await fsp.unlink(filePath)
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Send PDF Confirmation API',
    usage: {
      method: 'POST',
      endpoint: '/api/send-file',
      body: {
        phone: '6289685028129@s.whatsapp.net',
        umrahFormData: 'JSON string of UmrahFormData',
        bookingId: 'string',
        caption: 'string (optional)',
        is_forwarded: 'boolean (optional)',
        duration: 'number (optional)',
      },
    },
  })
}

