import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import HematConfirmationPDF from '@/components/HematConfirmationPDF'
import FormData from 'form-data'
import axios from 'axios'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

// === 1. DEFINISI TIPE DATA ===
type AnyFormData = Record<string, any>

// === 2. HELPER FUNCTIONS ===
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

// === 3. FUNGSI MAPPER (PENERJEMAH DATA CERDAS) ===
// Helper 'pick': Cari nilai dari beberapa kemungkinan key.
// Contoh: pick(data, ['nik_number', 'niknumber']) -> akan cari 'nik_number' dulu, kalau kosong cari 'niknumber'
const pick = (obj: any, keys: string[], fallback: any = '-') => {
  for (const k of keys) {
    const v = obj?.[k]
    // Cek jika ada isinya (tidak null/undefined/string kosong)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return fallback
}

function mapToPdfFormat(data: AnyFormData) {
  const toDateStr = (val: any) => {
    // Ambil value pakai pick dulu
    const d = typeof val === 'object' ? val : pick(data, Array.isArray(val) ? val : [val], null)
    if (!d) return '-'
    try {
      return new Date(d).toISOString()
    } catch {
      return '-'
    }
  }

  // Mapping Frekuensi
  const freqRaw = pick(data, ['installment_frequency', 'installmentfrequency'], '')
  const freqMap: Record<string, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    flexible: 'Fleksibel'
  }
  const frekuensiBersih = freqMap[freqRaw] || freqRaw || '-'

  // Mapping Paket 
  const paketTitle = pick(data, ['package_name', 'umrah_package', 'umrahpackage'], 'Paket Umrah Hemat')

  return {
    // --- Data Pribadi ---
    namaLengkap: pick(data, ['name', 'customerName', 'namaLengkap']),
    jenisKelamin: data.gender === 'male' ? 'Laki-laki' : data.gender === 'female' ? 'Perempuan' : '-',
    tempatLahir: pick(data, ['place_of_birth', 'placeofbirth', 'tempatLahir']),
    tglLahir: toDateStr(['birth_date', 'birthdate', 'tglLahir']),
    namaAyah: pick(data, ['father_name', 'fathername', 'namaAyah']),
    namaIbu: pick(data, ['mother_name', 'mothername', 'namaIbu']),
    statusPernikahan: pick(data, ['mariage_status', 'mariagestatus', 'statusPernikahan']),
    pekerjaan: pick(data, ['occupation', 'pekerjaan']),
    
    // --- Kontak ---
    email: pick(data, ['email']),
    nomorTelepon: pick(data, ['phone_number', 'phoneNumber', 'nomorTelepon']),
    whatsapp: pick(data, ['whatsapp_number', 'whatsappNumber', 'whatsapp']),
    alamatLengkap: pick(data, ['address', 'alamatLengkap']),
    kota: pick(data, ['city', 'kota']),
    provinsi: pick(data, ['province', 'provinsi']),
    kodePos: pick(data, ['postal_code', 'postalcode', 'kodePos']),
    
    // --- Kontak Darurat ---
    namaKontakDarurat: pick(data, ['emergency_contact_name', 'emergencycontactname', 'namaKontakDarurat']),
    hubunganKontak: pick(data, ['relationship', 'hubunganKontak']),
    telpKontakDarurat: pick(data, ['emergency_contact_phone', 'emergencycontactphone', 'telpKontakDarurat']),
    
    // --- Dokumen ---
    nik: pick(data, ['nik_number', 'niknumber', 'nik']),
    nomorPaspor: pick(data, ['passport_number', 'passportnumber', 'nomorPaspor']),
    tglPenerbitanPaspor: toDateStr(['date_of_issue', 'dateofissue']),
    tglKadaluarsaPaspor: toDateStr(['expiry_date', 'expirydate']),
    tempatPenerbitanPaspor: pick(data, ['place_of_issue', 'placeofissue']),
    
    // --- Kesehatan ---
    memilikiPenyakit: Boolean(pick(data, ['specific_disease', 'specificdisease'], false)),
    detailPenyakit: pick(data, ['illness', 'detailPenyakit']),
    kebutuhanKhusus: Boolean(pick(data, ['special_needs', 'specialneeds'], false)),
    butuhKursiRoda: Boolean(pick(data, ['wheelchair', 'butuhKursiRoda'], false)),
    
    // --- Pengalaman ---
    pernahUmrah: Boolean(pick(data, ['has_performed_umrah', 'hasperformedumrah'], false)),
    pernahHaji: Boolean(pick(data, ['has_performed_hajj', 'hasperformedhajj'], false)),
    
    // --- Paket & Pembayaran ---
    paketUmrah: paketTitle,
    hargaPaket: 0, 
    metodePembayaran: 'Tabungan Umrah',
    rencanaSetoran: Number(pick(data, ['installment_amount', 'installmentamount'], 0)),
    frekuensiSetoran: frekuensiBersih,
    catatanTabungan: pick(data, ['installment_notes', 'installmentnotes']),
    tglPendaftaran: toDateStr(['register_date', 'registerdate', 'submission_date'])
  }
}

// === MAIN API HANDLER ===
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Ambil field dasar
    const phone = (formData.get('phone') as string | null)?.trim() || ''
    const bookingIdInput = (formData.get('bookingId') as string | null)?.trim()
    const caption = ((formData.get('caption') as string | null) ?? '') || 'Konfirmasi Pendaftaran'

    // Ambil JSON Data
    const umrahFormDataJson = (formData.get('umrahFormData') as string | null)?.trim()
    const bookingDataJson = (formData.get('bookingData') as string | null)?.trim()

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone required' }, { status: 400 })
    }

    // Config Check
    const whatsappEndpoint = process.env.WHATSAPP_API_ENDPOINT
    const whatsappUsername = process.env.WHATSAPP_API_USERNAME
    const whatsappPassword = process.env.WHATSAPP_API_PASSWORD

    if (!whatsappEndpoint || !whatsappUsername || !whatsappPassword) {
      return NextResponse.json({ success: false, error: 'Config missing' }, { status: 500 })
    }

    // Parse Data Mentah
    let rawData: AnyFormData
    let bookingId: string = bookingIdInput || `HU-${Date.now()}`

    if (umrahFormDataJson) {
      const parsed = safeJsonParse<AnyFormData>(umrahFormDataJson, 'umrahFormData')
      if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      rawData = parsed.data
    } else if (bookingDataJson) {
      const parsed = safeJsonParse<AnyFormData>(bookingDataJson, 'bookingData')
      if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
      rawData = parsed.data
      if (rawData.bookingId) bookingId = rawData.bookingId
    } else {
      return NextResponse.json({ success: false, error: 'Data missing' }, { status: 400 })
    }

    // 🔥 MAPPING DATA: Mencari value dari berbagai kemungkinan key (snake_case atau lowercase)
    const pdfData = mapToPdfFormat(rawData)
    
    // Debug Log (PENTING: Cek log ini jika masih ada strip '-')
    console.log('📝 PDF Data Mapped (FINAL):', JSON.stringify(pdfData, null, 2))

    // Render PDF
    const element = React.createElement(HematConfirmationPDF, { 
      formData: pdfData,  
      bookingId: bookingId 
    })
    
    const pdfBuffer = await renderToBuffer(element)

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
    console.log(`🚀 Sending PDF (${fileName}) to ${formattedPhone}...`)

    const whatsappResponse = await axios.post(url, whatsappForm, {
      headers: { ...whatsappForm.getHeaders() },
      auth: { username: whatsappUsername, password: whatsappPassword },
      timeout: 60000,
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
  return NextResponse.json({ status: 'ready', version: '5.0-smart-mapping' })
}

