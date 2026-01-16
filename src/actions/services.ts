'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

// ==========================================
// TYPES & INTERFACES
// ==========================================

interface SubmitResponse {
  success: boolean
  data?: {
    id: string
    booking_id: string
    message: string
    waCustomer?: any
    waAdmin?: any
  }
  error?: string
  errors?: string[]
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function safeString(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function safeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function safeBoolean(v: any): boolean {
  if (v === true || v === 'true' || v === 1 || v === '1') return true
  return false
}

function safeDate(v: any): string | null {
  if (!v) return null
  try {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch {
    return null
  }
}

// Format phone number for WhatsApp (62xxx)
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  let formatted = phone.replace(/\D/g, '')
  if (formatted.startsWith('0')) formatted = '62' + formatted.substring(1)
  else if (!formatted.startsWith('62')) formatted = '62' + formatted
  return formatted
}

function resolveBaseUrl(): string {
  let baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL ||
    'https://hematumrah.rehlatours.id'

  if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`
  return baseUrl.replace(/\/$/, '')
}

// ==========================================
// WHATSAPP SENDER
// ==========================================

async function sendPdfToWhatsapp(params: {
  baseUrl: string
  phone: string
  bookingId: string
  umrahFormData: any
  caption?: string
}) {
  const { baseUrl, phone, bookingId, umrahFormData, caption } = params

  const formattedPhone = formatPhoneForWhatsApp(phone)
  if (!formattedPhone) {
    console.error('Invalid phone number for WA:', phone)
    return { success: false, error: 'Invalid phone number' }
  }

  // Gunakan endpoint API internal Next.js
  const apiUrl = `${baseUrl}/api/send-file`

  const fd = new FormData()
  fd.append('phone', formattedPhone)
  fd.append('bookingId', bookingId)
  
  // Serialize data form lengkap ke JSON string
  fd.append('umrahFormData', JSON.stringify(umrahFormData))
  
  if (caption) fd.append('caption', caption)

  try {
    const res = await fetch(apiUrl, { method: 'POST', body: fd })
    const text = await res.text()

    if (!res.ok) {
      console.error('Failed to send PDF to WA:', text)
      return { success: false, error: text }
    }
    return JSON.parse(text)
  } catch (err: any) {
    console.error('Error in sendPdfToWhatsapp:', err)
    return { success: false, error: err.message }
  }
}

// ==========================================
// VALIDATION & DATA BUILDING
// ==========================================

/**
 * Validator minimal: Pastikan field krusial terisi.
 * Field opsional (seperti penyakit, paspor) boleh kosong tergantung konteks.
 */
function validateHematForm(formData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = []

  const requiredFields = [
    { key: 'name', label: 'Nama Lengkap' },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Nomor Telepon' },
    { key: 'whatsapp_number', label: 'Nomor WhatsApp' },
    { key: 'gender', label: 'Jenis Kelamin' },
    { key: 'place_of_birth', label: 'Tempat Lahir' },
    { key: 'birth_date', label: 'Tanggal Lahir' },
    { key: 'address', label: 'Alamat Lengkap' },
    { key: 'city', label: 'Kota' },
    { key: 'province', label: 'Provinsi' },
    { key: 'umrah_package', label: 'Pilihan Paket' }, // ID paket
    { key: 'installment_frequency', label: 'Frekuensi Setoran' },
  ]

  requiredFields.forEach((field) => {
    if (!safeString(formData?.[field.key])) {
      errors.push(`${field.label} wajib diisi`)
    }
  })

  // Validasi khusus numeric
  const installmentAmount = safeNumber(formData?.installment_amount)
  if (installmentAmount === null || installmentAmount <= 0) {
    errors.push('Rencana setoran wajib diisi dan harus lebih dari 0')
  }

  return errors.length ? { success: false, errors } : { success: true }
}

/**
 * Membersihkan dan menyusun data agar sesuai dengan Schema Collection `Hematumrahdaftar`
 * DAN mencakup semua field tambahan dari UI agar muncul di PDF.
 */
function buildCleanDataHemat(formData: any) {
  // Mapping field UI (camelCase/lowercase) ke field database payload
  // Pastikan nama property di sini cocok dengan apa yang diharapkan 'ConfirmationPDF.tsx'
  // atau normalizer di API route.
  
  return {
    // --- Identitas Utama ---
    name: safeString(formData.name),
    niknumber: safeString(formData.niknumber), // UI: niknumber
    gender: safeString(formData.gender),
    place_of_birth: safeString(formData.place_of_birth), // UI: placeofbirth
    birth_date: safeDate(formData.birth_date),
    mariagestatus: safeString(formData.mariagestatus),
    occupation: safeString(formData.occupation),

    // --- Keluarga / Orang Tua ---
    fathername: safeString(formData.fathername),
    mothername: safeString(formData.mothername),

    // --- Kontak ---
    email: safeString(formData.email),
    phone_number: safeString(formData.phone_number), // UI: phonenumber
    whatsapp_number: safeString(formData.whatsapp_number), // UI: whatsappnumber
    
    // --- Alamat ---
    address: safeString(formData.address),
    city: safeString(formData.city),
    province: safeString(formData.province),
    postalcode: safeString(formData.postalcode),

    // --- Kontak Darurat ---
    emergencycontactname: safeString(formData.emergencycontactname),
    emergencycontactphone: safeString(formData.emergencycontactphone),
    relationship: safeString(formData.relationship),

    // --- Dokumen Paspor ---
    passportnumber: safeString(formData.passportnumber),
    dateofissue: safeDate(formData.dateofissue),
    expirydate: safeDate(formData.expirydate),
    placeofissue: safeString(formData.placeofissue),

    // --- Kesehatan ---
    specificdisease: safeBoolean(formData.specificdisease),
    illness: safeString(formData.illness), // Penjelasan penyakit
    specialneeds: safeBoolean(formData.specialneeds),
    wheelchair: safeBoolean(formData.wheelchair),

    // --- Pengalaman Ibadah ---
    hasperformedumrah: safeBoolean(formData.hasperformedumrah),
    hasperformedhajj: safeBoolean(formData.hasperformedhajj),

    // --- Paket & Pembayaran (Tabungan) ---
    // Note: 'umrahpackage' di DB Payload biasanya expect ID relasi
    umrahpackage: safeString(formData.umrah_package), 
    
    payment_type: 'tabungan_custom',
    installmentamount: safeNumber(formData.installment_amount),
    installmentfrequency: safeString(formData.installment_frequency) || 'flexible',
    installmentnotes: safeString(formData.installment_notes),

    // --- Meta ---
    registerdate: safeDate(formData.register_date) || new Date().toISOString(), // UI: registerdate
    submission_date: new Date().toISOString(),
    termsofservice: safeBoolean(formData.termsofservice),
    status: 'pending_review',
  }
}

// ==========================================
// EXPORTED SERVER ACTIONS
// ==========================================

export async function getUmrahPackageOptions() {
  try {
    const payload = await getPayload({ config })
    const packages = await payload.find({
      collection: 'umrah-package',
      sort: 'name',
      select: { id: true, name: true, price: true, duration: true },
      limit: 100,
    })

    const options = packages.docs.map((pkg: any) => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      duration: pkg.duration,
    }))

    return { success: true, data: options }
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil opsi paket',
      data: [],
    }
  }
}

export async function submitHematUmrahForm(formData: any): Promise<SubmitResponse> {
  try {
    if (!formData) return { success: false, error: 'Form data is missing' }

    // 1. Validasi
    const validation = validateHematForm(formData)
    if (!validation.success) {
      return {
        success: false,
        error: 'Validasi gagal',
        errors: validation.errors,
      }
    }

    // 2. Bersihkan & Strukturkan Data (Sertakan SEMUA field)
    const cleanData = buildCleanDataHemat(formData)
    const payload = await getPayload({ config })

    // 3. Simpan ke Payload CMS
    // Pastikan slug collection benar: 'hemat-umrah-daftar'
    const result = await payload.create({
      collection: 'hemat-umrah-daftar', 
      data: cleanData,
    })

    const bookingId = (result as any).booking_id || `HU-${Date.now()}`
    const baseUrl = resolveBaseUrl()

    // 4. Siapkan Data untuk WhatsApp & PDF
    const customerPhone = formatPhoneForWhatsApp(cleanData.whatsapp_number || cleanData.phone_number)
    const adminPhone = formatPhoneForWhatsApp(process.env.ADMIN_WA_PHONE || '') // Pastikan ENV ini ada

    // Format Rupiah untuk caption
    const formattedInstallment = cleanData.installmentamount?.toLocaleString('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }) || '0'

    const captionCustomer = `🕌 *Konfirmasi Pendaftaran Umrah Hemat (Tabungan)*

Assalamu'alaikum ${cleanData.name},

Alhamdulillah! Pendaftaran program tabungan umrah Anda telah berhasil dicatat.

📋 *Detail Pendaftaran:*
• Booking ID: ${bookingId}
• Nama: ${cleanData.name}
• Rencana Setoran: ${formattedInstallment}
• Frekuensi: ${cleanData.installmentfrequency === 'monthly' ? 'Bulanan' : cleanData.installmentfrequency === 'weekly' ? 'Mingguan' : cleanData.installmentfrequency === 'daily' ? 'Harian' : 'Fleksibel'}

Terlampir dokumen konfirmasi pendaftaran lengkap (PDF). 
Tim kami akan segera menghubungi Anda untuk verifikasi selanjutnya.

Jazakallahu khairan,
*Rehla Tours Team*`

    const captionAdmin = `📥 *Pendaftaran Umrah Hemat Baru*
    
ID: ${bookingId}
Nama: ${cleanData.name}
WA: ${customerPhone}
Paket ID: ${cleanData.umrahpackage}
Setoran: ${formattedInstallment}
Kota: ${cleanData.city}`

    // Data yang dikirim ke generator PDF (API Route)
    // Kita kirim 'cleanData' yang sudah lengkap field-nya + booking_id
    const dataForPdf = { ...cleanData, booking_id: bookingId }

    // 5. Kirim WhatsApp (Parallel)
    Promise.allSettled([
      customerPhone
        ? sendPdfToWhatsapp({
            baseUrl,
            phone: customerPhone,
            bookingId,
            umrahFormData: dataForPdf,
            caption: captionCustomer,
          })
        : Promise.resolve(),

      adminPhone
        ? sendPdfToWhatsapp({
            baseUrl,
            phone: adminPhone,
            bookingId,
            umrahFormData: dataForPdf,
            caption: captionAdmin,
          })
        : Promise.resolve(),
    ])

    return {
      success: true,
      data: {
        id: result.id,
        booking_id: bookingId,
        message: `Pendaftaran berhasil! ID Booking: ${bookingId}. Dokumen konfirmasi sedang dikirim ke WhatsApp Anda.`,
      },
    }
  } catch (error) {
    console.error('submitHematUmrahForm error:', error)
    return { success: false, error: 'Terjadi kesalahan sistem saat memproses pendaftaran. Silakan coba lagi.' }
  }
}
