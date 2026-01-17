import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import HematConfirmationPDF from '@/components/HematConfirmationPDF'
import FormData from 'form-data'
import axios from 'axios'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

type AnyFormData = Record<string, any>

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

const pick = (obj: any, keys: string[], fallback: any = '-') => {
  if (!obj) return fallback
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return fallback
}

// === MAPPER DENGAN ERROR HANDLING KUAT ===
function mapToPdfFormat(data: AnyFormData) {
  // Helper Date yang sangat aman
  const toDateStr = (keys: string | string[]) => {
    try {
      const keyList = Array.isArray(keys) ? keys : [keys]
      const rawVal = pick(data, keyList, null)
      
      if (!rawVal) return '-'
      
      // Cek apakah sudah string ISO/Date?
      const d = new Date(rawVal)
      if (isNaN(d.getTime())) return '-' // Invalid date
      
      return d.toISOString() // Pasti return string ISO valid
    } catch (e) {
      console.error('Error parsing date:', e)
      return '-' // Fallback aman
    }
  }

  // Helper Frekuensi aman
  let frekuensiBersih = '-'
  try {
    const freqRaw = pick(data, ['installment_frequency', 'installmentfrequency'], '')
    const freqMap: Record<string, string> = {
      daily: 'Harian',
      weekly: 'Mingguan',
      monthly: 'Bulanan',
      flexible: 'Fleksibel'
    }
    frekuensiBersih = freqMap[freqRaw] || freqRaw || '-'
  } catch {}

  return {
    // Data Pribadi
    namaLengkap: pick(data, ['name', 'customerName', 'namaLengkap'], '-'),
    jenisKelamin: data.gender === 'male' ? 'Laki-laki' : data.gender === 'female' ? 'Perempuan' : '-',
    tempatLahir: pick(data, ['place_of_birth', 'placeofbirth', 'tempatLahir'], '-'),
    tglLahir: toDateStr(['birth_date', 'birthdate', 'tglLahir']),
    namaAyah: pick(data, ['father_name', 'fathername', 'namaAyah'], '-'),
    namaIbu: pick(data, ['mother_name', 'mothername', 'namaIbu'], '-'),
    statusPernikahan: pick(data, ['mariage_status', 'mariagestatus', 'statusPernikahan'], '-'),
    pekerjaan: pick(data, ['occupation', 'pekerjaan'], '-'),
    
    // Kontak
    email: pick(data, ['email'], '-'),
    nomorTelepon: pick(data, ['phone_number', 'phoneNumber', 'nomorTelepon'], '-'),
    whatsapp: pick(data, ['whatsapp_number', 'whatsappNumber', 'whatsapp'], '-'),
    alamatLengkap: pick(data, ['address', 'alamatLengkap'], '-'),
    kota: pick(data, ['city', 'kota'], '-'),
    provinsi: pick(data, ['province', 'provinsi'], '-'),
    kodePos: pick(data, ['postal_code', 'postalcode', 'kodePos'], '-'),
    
    // Kontak Darurat
    namaKontakDarurat: pick(data, ['emergency_contact_name', 'emergencycontactname', 'namaKontakDarurat'], '-'),
    hubunganKontak: pick(data, ['relationship', 'hubunganKontak'], '-'),
    telpKontakDarurat: pick(data, ['emergency_contact_phone', 'emergencycontactphone', 'telpKontakDarurat'], '-'),
    
    // Dokumen
    nik: pick(data, ['nik_number', 'niknumber', 'nik'], '-'),
    nomorPaspor: pick(data, ['passport_number', 'passportnumber', 'nomorPaspor'], '-'),
    tglPenerbitanPaspor: toDateStr(['date_of_issue', 'dateofissue']),
    tglKadaluarsaPaspor: toDateStr(['expiry_date', 'expirydate']),
    tempatPenerbitanPaspor: pick(data, ['place_of_issue', 'placeofissue'], '-'),
    
    // Kesehatan
    memilikiPenyakit: Boolean(pick(data, ['specific_disease', 'specificdisease'], false)),
    detailPenyakit: pick(data, ['illness', 'detailPenyakit'], '-'),
    kebutuhanKhusus: Boolean(pick(data, ['special_needs', 'specialneeds'], false)),
    butuhKursiRoda: Boolean(pick(data, ['wheelchair', 'butuhKursiRoda'], false)),
    
    // Pengalaman
    pernahUmrah: Boolean(pick(data, ['has_performed_umrah', 'hasperformedumrah'], false)),
    pernahHaji: Boolean(pick(data, ['has_performed_hajj', 'hasperformedhajj'], false)),
    
    // Paket
    paketUmrah: pick(data, ['package_name', 'umrah_package', 'umrahpackage'], 'Paket Umrah Hemat'),
    hargaPaket: 0,
    metodePembayaran: 'Tabungan Umrah',
    rencanaSetoran: Number(pick(data, ['installment_amount', 'installmentamount'], 0)) || 0,
    frekuensiSetoran: frekuensiBersih,
    catatanTabungan: pick(data, ['installment_notes', 'installmentnotes'], '-'),
    tglPendaftaran: toDateStr(['register_date', 'registerdate', 'submission_date'])
  }
}

// === MAIN API HANDLER ===
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran'
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()

    if (!phone) {
      console.error('❌ Error: Phone is empty')
      return NextResponse.json({ success: false, error: 'Phone required' }, { status: 400 })
    }

    // Config Check
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      console.error('❌ Error: Missing ENV variables')
      return NextResponse.json({ success: false, error: 'Config missing' }, { status: 500 })
    }

    // Parse Data
    let rawData: AnyFormData = {}
    let bookingId: string = bookingIdInput || `HU-${Date.now()}`

    if (umrahFormDataJson) {
      const parsed = safeJsonParse<AnyFormData>(umrahFormDataJson, 'umrahFormData')
      if (parsed.ok) rawData = parsed.data
    } else if (bookingDataJson) {
      const parsed = safeJsonParse<AnyFormData>(bookingDataJson, 'bookingData')
      if (parsed.ok) {
        rawData = parsed.data
        if (rawData.bookingId) bookingId = rawData.bookingId
      }
    }

    // Mapping Data
    let pdfData
    try {
      pdfData = mapToPdfFormat(rawData)
      console.log('📝 PDF Data Mapped OK')
    } catch (e) {
      console.error('❌ Error mapping data:', e)
      // Fallback ke rawData kalau mapping gagal total
      pdfData = rawData as any
    }

    // Render PDF
    let pdfBuffer
    try {
      console.log('📝 Rendering PDF...')
      const element = React.createElement(HematConfirmationPDF, { 
        formData: pdfData,  
        bookingId: bookingId 
      })
      pdfBuffer = await renderToBuffer(element)
      console.log('✅ PDF Rendered. Buffer size:', pdfBuffer.length)
    } catch (e: any) {
      console.error('❌ Fatal Error Rendering PDF:', e)
      return NextResponse.json({ success: false, error: 'PDF Render Failed: ' + e.message }, { status: 500 })
    }

    // Kirim ke WhatsApp
    const formattedPhone = formatPhoneForWhatsAppJid(phone)
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9-_]/g, '')
    const fileName = `confirmation-${safeBookingId}.pdf`

    const whatsappForm = new FormData()
    whatsappForm.append('caption', caption)
    whatsappForm.append('phone', formattedPhone)
    whatsappForm.append('is_forwarded', 'false')
    whatsappForm.append('file', pdfBuffer, { 
      filename: fileName,
      contentType: 'application/pdf',
    })

    const url = `${whatsappEndpoint.replace(/\/$/, '')}/send/file`
    console.log(`🚀 Sending to ${formattedPhone}...`)

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 60000,
      validateStatus: () => true,
    })

    if (whatsappResponse.status >= 200 && whatsappResponse.status < 300) {
      console.log('✅ WA Sent Successfully')
      return NextResponse.json({ success: true })
    }

    console.error('❌ WA API Failed:', whatsappResponse.status, whatsappResponse.data)
    return NextResponse.json({ success: false, error: 'WA API Failed', details: whatsappResponse.data }, { status: 502 })

  } catch (error: any) {
    console.error('❌ Global Route Error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready', version: '5.2-safe-mode' })
}



