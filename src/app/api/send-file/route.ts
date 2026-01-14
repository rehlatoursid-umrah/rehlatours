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
    // 1. Parse Request
    const formData = await request.formData()
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran Umrah'

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

    // 2. Get WhatsApp Config (WAJIB ADA USERNAME & PASSWORD)
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      console.error('❌ WhatsApp API config missing:', {
        endpoint: !!whatsappEndpoint,
        username: !!whatsappUsername,
        password: !!whatsappPassword,
      })
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    // 3. Parse Data
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

    // 4. Generate PDF
    console.log(`📄 Generating PDF for ${bookingId}...`)
    const pdfDocument = createElement(ConfirmationPDF, { formData: umrahFormData, bookingId })
    const pdfBuffer = await renderToBuffer(pdfDocument as any)
    
    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    const fileName = `confirmation-${bookingId}.pdf`
    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer as any)
    
    const sizeKB = (pdfBuffer.byteLength / 1024).toFixed(2)
    console.log(`✅ PDF Saved: ${fileName} (${sizeKB} KB)`)

    // 5. Format Phone Number
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1)
    if (!formattedPhone.startsWith('62')) formattedPhone = '62' + formattedPhone
    if (!formattedPhone.includes('@')) formattedPhone += '@s.whatsapp.net'

    // 6. Build FormData for WhatsApp API
    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')
    whatsappForm.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: 'application/pdf',
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    
    console.log(`🚀 Sending to: ${url}`)
    console.log(`📱 Phone: ${formattedPhone}`)
    console.log(`🔐 Auth: ${whatsappUsername}:${'*'.repeat(whatsappPassword.length)}`)

    // 7. Send with Basic Auth (INI YANG PENTING!)
    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: {
        ...whatsappForm.getHeaders(),
      },
      auth: {
        username: whatsappUsername,
        password: whatsappPassword,
      },
      timeout: 45000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    })

    const tookMs = Date.now() - start
    
    console.log(`📥 Response Status: ${whatsappResponse.status}`)
    console.log(`📥 Response Data:`, JSON.stringify(whatsappResponse.data).substring(0, 300))

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      console.log('✅ WhatsApp sent successfully!')
      return NextResponse.json({
        success: true,
        message: 'PDF sent successfully',
        bookingId,
        phone: formattedPhone,
        sizeKB: parseFloat(sizeKB),
        tookMs,
        whatsappResponse: whatsappResponse.data,
      })
    } else {
      console.error('❌ WhatsApp API error')
      return NextResponse.json({
        success: false,
        error: 'WhatsApp API failed',
        status: whatsappResponse.status,
        details: whatsappResponse.data,
        tookMs,
      }, { status: 502 })
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  } finally {
    if (filePath) {
      try { 
        await fsp.unlink(filePath)
        console.log('🗑️ Temp file cleaned')
      } catch {}
    }
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ready', 
    endpoint: '/api/send-file',
    version: '1.0'
  })
}
