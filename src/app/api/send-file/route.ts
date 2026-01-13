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
export const maxDuration = 60 // Vercel max duration 60 seconds

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
    console.log('📄 Generating PDF for booking:', bookingId)
    const pdfDocument = createElement(ConfirmationPDF, { formData: umrahFormData, bookingId })
    const pdfBuffer = await renderToBuffer(pdfDocument as any)

    const pdfSizeKB = (pdfBuffer.byteLength / 1024).toFixed(2)
    console.log(`📊 PDF size: ${pdfSizeKB} KB`)

    // TEMP DIR for Vercel serverless
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })

    const fileName = `confirmation-${bookingId}-${Date.now()}.pdf`
    filePath = path.join(tempDir, fileName)

    await fsp.writeFile(filePath, pdfBuffer as any)
    console.log('✅ PDF saved to:', filePath)

    // Format phone number untuk WhatsApp API
    let formattedPhone = phone
    if (!phone.includes('@')) {
      formattedPhone = `${phone}@s.whatsapp.net`
    }

    console.log('📱 Phone formatted:', phone, '→', formattedPhone)

    // PERBAIKAN: Coba endpoint dengan timeout lebih pendek dan retry
    const endpoints = [
      '/send/document',
      '/api/send/document',
    ]

    let lastError: any = null
    let success = false
    let whatsappResponse: any = null

    // Coba setiap endpoint maksimal 2x dengan timeout 30 detik
    for (const endpoint of endpoints) {
      const url = `${whatsappEndpoint.replace(/\/$/, '')}${endpoint}`
      
      console.log(`🔄 Trying endpoint: ${url}`)

      // Retry maksimal 2x per endpoint
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          // Build fresh FormData untuk setiap attempt
          const whatsappForm = new FormData()
          whatsappForm.append('phone', formattedPhone)
          whatsappForm.append('caption', caption)
          whatsappForm.append('file', fs.createReadStream(filePath), {
            filename: fileName,
            contentType: 'application/pdf',
          })

          console.log(`  Attempt ${attempt}/2...`)

          whatsappResponse = await axios.post(url, whatsappForm, {
            headers: {
              ...whatsappForm.getHeaders(),
            },
            auth: {
              username: whatsappUsername,
              password: whatsappPassword,
            },
            timeout: 30000, // PERBAIKAN: Timeout 30 detik (bukan 60)
            maxContentLength: 10 * 1024 * 1024, // Max 10MB
            maxBodyLength: 10 * 1024 * 1024,
            validateStatus: () => true,
          })

          console.log('  📥 Response status:', whatsappResponse.status)

          // Kalau berhasil (status 200-299), stop semua loop
          if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
            console.log(`✅ Success with ${endpoint} (attempt ${attempt})`)
            success = true
            break
          }

          // Kalau 401/404, skip retry dan coba endpoint berikutnya
          if (whatsappResponse.status === 401 || whatsappResponse.status === 404) {
            console.log(`  ⚠️ ${whatsappResponse.status} error, trying next endpoint...`)
            lastError = {
              endpoint,
              status: whatsappResponse.status,
              data: whatsappResponse.data,
            }
            break // Skip retry, langsung ke endpoint berikutnya
          }

          // Kalau error lain dan masih ada attempt, retry
          if (attempt < 2) {
            console.log(`  ⚠️ Error ${whatsappResponse.status}, retrying...`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 detik
            continue
          }

          lastError = {
            endpoint,
            status: whatsappResponse.status,
            data: whatsappResponse.data,
          }

        } catch (error: any) {
          const errorMsg = error.code === 'ECONNABORTED' ? 'Timeout after 30s' : error.message
          console.error(`  ❌ Error (attempt ${attempt}):`, errorMsg)
          
          // Kalau timeout dan masih ada attempt, retry
          if (attempt < 2 && error.code === 'ECONNABORTED') {
            console.log('  🔄 Retrying after timeout...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }

          lastError = {
            endpoint,
            error: errorMsg,
            code: error.code,
          }
        }
      }

      // Kalau sudah success, stop loop endpoint
      if (success) break
    }

    const tookMs = Date.now() - start

    // Kalau semua endpoint gagal
    if (!success) {
      console.error('❌ All endpoints failed. Last error:', lastError)
      
      // Kalau timeout, kasih message khusus
      if (lastError?.error?.includes('Timeout') || lastError?.code === 'ECONNABORTED') {
        return NextResponse.json(
          {
            success: false,
            error: 'WhatsApp API timeout. Server may be overloaded or slow.',
            details: 'Please check if WhatsApp API server is running and responding.',
            lastError,
            tookMs,
          },
          { status: 504 }, // Gateway Timeout
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send WhatsApp message',
          status: lastError?.status || 500,
          details: lastError,
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
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    // Cleanup temp file
    if (filePath) {
      try {
        await fsp.unlink(filePath)
        console.log('🗑️ Temp file deleted')
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
        phone: '628xxx or 628xxx@s.whatsapp.net',
        umrahFormData: 'JSON string of UmrahFormData',
        bookingId: 'string',
        caption: 'string (optional)',
      },
    },
  })
}
