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

// === 3. FUNGSI MAPPER PENTING (PENERJEMAH DATA) ===
// Fungsi ini mengubah data mentah dari form (snake_case) menjadi data matang untuk PDF (camelCase)
function mapToPdfFormat(data: AnyFormData) {
  const toDateStr = (d?: string | Date) => {
    if (!d) return '-'
    try {
      return new Date(d).toISOString()
    } catch {
      return '-'
    }
  }

  // Mapping Frekuensi
  const freqMap: Record<string, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    flexible: 'Fleksibel'
  }

  // Mapping Paket (Simple Logic - bisa disesuaikan jika ada lookup)
  // Karena form mengirim ID paket, kita coba tampilkan ID-nya atau default
  // Jika Anda mengirim nama paket dari frontend, ganti 'data.package_name' di bawah
  const paketTitle = data.package_name || data.umrah_package || 'Paket Umrah Hemat'

  return {
    // Data Pribadi
    namaLengkap: data.name || data.customerName || '-',
    jenisKelamin: data.gender === 'male' ? 'Laki-laki' : data.gender === 'female' ? 'Perempuan' : '-',
    tempatLahir: data.place_of_birth || '-',
    tglLahir: toDateStr(data.birth_date),
    namaAyah: data.father_name || '-',
    namaIbu: data.mother_name || '-',
    statusPernikahan: data.mariage_status || '-',
    pekerjaan: data.occupation || '-',
    
    // Kontak
    email: data.email || '-',
    nomorTelepon: data.phone_number || data.phoneNumber || '-',
    whatsapp: data.whatsapp_number || data.whatsappNumber || '-',
    alamatLengkap: data.address || '-',
    kota: data.city || '-',
    provinsi: data.province || '-',
    kodePos: data.postal_code || '-',
    
    // Kontak Darurat
    namaKontakDarurat: data.emergency_contact_name || '-',
    hubunganKontak: data.relationship || '-',
    telpKontakDarurat: data.emergency_contact_phone || '-',
    
    // Dokumen
    nik: data.nik_number || '-',
    nomorPaspor: data.passport_number || '-',
    tglPenerbitanPaspor: toDateStr(data.date_of_issue),
    tglKadaluarsaPaspor: toDateStr(data.expiry_date),
    tempatPenerbitanPaspor: data.place_of_issue || '-',
    
    // Kesehatan
    memilikiPenyakit: Boolean(data.specific_disease),
    detailPenyakit: data.illness || '-',
    kebutuhanKhusus: Boolean(data.special_needs),
    butuhKursiRoda: Boolean(data.wheelchair),
    
    // Pengalaman
    pernahUmrah: Boolean(data.has_performed_umrah),
    pernahHaji: Boolean(data.has_performed_hajj),
    
    // Paket & Pembayaran
    paketUmrah: paketTitle,
    hargaPaket: 0, // Harga tidak dikirim dari form, set 0 atau sesuaikan
    metodePembayaran: 'Tabungan Umrah',
    rencanaSetoran: Number(data.installment_amount) || 0,
    frekuensiSetoran: data.installment_frequency ? (freqMap[data.installment_frequency] || data.installment_frequency) : '-',
    catatanTabungan: data.installment_notes || '-',
    tglPendaftaran: toDateStr(data.register_date || data.submission_date || new Date())
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

    // 🔥 VITAL STEP: Lakukan Mapping Data Sebelum Render PDF 🔥
    // Ini yang memperbaiki masalah data kosong "-"
    const pdfData = mapToPdfFormat(rawData)
    
    // Debug Log (Cek di Vercel Logs apakah data sudah benar)
    console.log('📝 PDF Data Mapped:', JSON.stringify(pdfData, null, 2))

    // Render PDF dengan React.createElement
    const element = React.createElement(HematConfirmationPDF, { 
      formData: pdfData,  // Kirim data yang SUDAH dimapping
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
  return NextResponse.json({ status: 'ready', version: '4.2-data-fix' })
}
