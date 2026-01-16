import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import FormData from 'form-data'
import path from 'path'
import axios from 'axios'
import { promises as fsp } from 'fs'
import fs from 'fs'

import HematConfirmationPDF from '@/components/HematConfirmationPDF'

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

// === Normalisasi khusus Hemat Umrah ===
function normalizeForPdf(input: AnyFormData): AnyFormData {
  const data = input || {}

  return {
    ...data,

    // identitas & kontak
    name: data.name ?? data.customerName ?? '',
    email: data.email ?? '',
    phone_number: data.phone_number ?? data.phoneNumber ?? '',
    whatsapp_number: data.whatsapp_number ?? data.whatsappNumber ?? '',

    // alamat
    address: data.address ?? '',
    city: data.city ?? '',
    province: data.province ?? '',

    // paket: schema hemat pakai umrahpackage
    umrahpackage:
      data.umrahpackage ??
      data.umrah_package ??
      data.packageName ??
      '',

    // pembayaran & tabungan: schema hemat
    payment_type: data.payment_type ?? 'tabungan_custom',
    installmentamount:
      data.installmentamount ??
      data.installment_amount ??
      '',
    installmentfrequency:
      data.installmentfrequency ??
      data.installment_frequency ??
      '',
    installmentnotes:
      data.installmentnotes ??
      data.installment_notes ??
      '',

    submission_date:
      data.submission_date ??
      data.register_date ??
      '',
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

export async function POST(request: NextRequest) {
  const start = Date.now()
  let filePath: string | null = null

  try {
    const formData = await request.formData()
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()

    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()

    const caption =
      ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran Umrah Hemat'

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 })
    }

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

    // Optional: debug
    // console.log('PDF DATA >>>', JSON.stringify(pdfData, null, 2))

    const pdfDocument = createElement(ConfirmationPDF as any, { formData: pdfData, bookingId })
    const pdfBuffer = await renderToBuffer(pdfDocument as any)

    const tempDir = '/tmp'
    await fsp.mkdir(tempDir, { recursive: true })
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9-_]/g, '')
    const fileName = `confirmation-${safeBookingId}.pdf`

    filePath = path.join(tempDir, fileName)
    await fsp.writeFile(filePath, pdfBuffer as any)

    const sizeKB = (pdfBuffer.byteLength / 1024).toFixed(2)
    console.log(`✅ PDF Saved: ${fileName} (${sizeKB} KB)`)

    const formattedPhone = formatPhoneForWhatsAppJid(phone)
    if (!formattedPhone) {
      return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 })
    }

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

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 45000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true,
    })

    const tookMs = Date.now() - start
    console.log(`📥 Response Status: ${whatsappResponse.status}`)
    console.log(`📥 Response Data:`, JSON.stringify(whatsappResponse.data).substring(0, 300))

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      return NextResponse.json({
        success: true,
        message: 'PDF sent successfully',
        bookingId,
        phone: formattedPhone,
        sizeKB: parseFloat(sizeKB),
        tookMs,
        whatsappResponse: whatsappResponse.data,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'WhatsApp API failed',
        status: whatsappResponse.status,
        details: whatsappResponse.data,
        tookMs,
      },
      { status: 502 },
    )
  } catch (error: any) {
    console.error('❌ Fatal error:', error?.message || error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 },
    )
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
    project: 'hematumrah.rehlatours.id',
    version: '2.0-hemat',
  })
}
