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

function validateHematForm(formData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = []
  const requiredFields = [
    { key: 'name', label: 'Nama Lengkap' },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Nomor Telepon' },
    { key: 'whatsapp_number', label: 'Nomor WhatsApp' },
    { key: 'umrah_package', label: 'Pilihan Paket' }, 
    { key: 'installment_frequency', label: 'Frekuensi Setoran' },
  ]

  requiredFields.forEach((field) => {
    if (!safeString(formData?.[field.key])) {
      errors.push(`${field.label} wajib diisi`)
    }
  })

  const installmentAmount = safeNumber(formData?.installment_amount)
  if (installmentAmount === null || installmentAmount <= 0) {
    errors.push('Rencana setoran wajib diisi dan harus lebih dari 0')
  }

  return errors.length ? { success: false, errors } : { success: true }
}

function buildCleanDataHemat(formData: any) {
  return {
    // --- Identitas Utama ---
    name: safeString(formData.name),
    niknumber: safeString(formData.nik_number || formData.niknumber), 
    gender: safeString(formData.gender),
    place_of_birth: safeString(formData.place_of_birth), 
    birth_date: safeDate(formData.birth_date),
    mariagestatus: safeString(formData.mariage_status || formData.mariagestatus),
    occupation: safeString(formData.occupation),

    // --- Keluarga / Orang Tua ---
    fathername: safeString(formData.father_name || formData.fathername),
    mothername: safeString(formData.mother_name || formData.mothername),

    // --- Kontak ---
    email: safeString(formData.email),
    phone_number: safeString(formData.phone_number), 
    whatsapp_number: safeString(formData.whatsapp_number), 
    address: safeString(formData.address),
    city: safeString(formData.city),
    province: safeString(formData.province),
    postalcode: safeString(formData.postal_code || formData.postalcode),

    // --- Kontak Darurat ---
    emergencycontactname: safeString(formData.emergency_contact_name || formData.emergencycontactname),
    emergencycontactphone: safeString(formData.emergency_contact_phone || formData.emergencycontactphone),
    relationship: safeString(formData.relationship),

    // --- Dokumen Paspor ---
    passportnumber: safeString(formData.passport_number || formData.passportnumber),
    dateofissue: safeDate(formData.date_of_issue || formData.dateofissue),
    expirydate: safeDate(formData.expiry_date || formData.expirydate),
    placeofissue: safeString(formData.place_of_issue || formData.placeofissue),

    // --- Kesehatan ---
    specificdisease: safeBoolean(formData.specific_disease || formData.specificdisease),
    illness: safeString(formData.illness), 
    specialneeds: safeBoolean(formData.special_needs || formData.specialneeds),
    wheelchair: safeBoolean(formData.wheelchair),

    // --- Pengalaman Ibadah ---
    hasperformedumrah: safeBoolean(formData.has_performed_umrah || formData.hasperformedumrah),
    hasperformedhajj: safeBoolean(formData.has_performed_hajj || formData.hasperformedhajj),

    // --- Paket & Pembayaran ---
    umrahpackage: safeString(formData.umrah_package), 
    payment_type: 'tabungan_custom',
    installmentamount: safeNumber(formData.installment_amount),
    installmentfrequency: safeString(formData.installment_frequency) || 'flexible',
    installmentnotes: safeString(formData.installment_notes || formData.installmentnotes),

    // --- Meta ---
    registerdate: safeDate(formData.register_date) || new Date().toISOString(), 
    submission_date: new Date().toISOString(),
    termsofservice: safeBoolean(formData.terms_of_service || formData.termsofservice),
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
    })
    return { success: true, data: packages.docs }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function submitHematUmrahForm(formData: any): Promise<SubmitResponse> {
  try {
    if (!formData) return { success: false, error: 'Form data is missing' }

    // 1. Validasi
    const validation = validateHematForm(formData)
    if (!validation.success) {
      return { success: false, error: 'Validasi gagal', errors: validation.errors }
    }

    // 2. Data Cleaning
    const cleanData = buildCleanDataHemat(formData)
    const payload = await getPayload({ config })

    // 3. 🔥 GET PACKAGE DETAIL (Lookup Nama & Harga)
    let packageDetail = { name: 'Paket Umrah Hemat', price: 0 }
    if (cleanData.umrahpackage) {
      try {
        const pkg = await payload.findByID({
          collection: 'umrah-package',
          id: cleanData.umrahpackage,
        })
        if (pkg) {
          packageDetail = {
            name: (pkg as any).name || 'Paket Umrah Hemat',
            price: (pkg as any).price || 0
          }
        }
      } catch (err) {
        console.warn('Gagal lookup paket:', err)
      }
    }

    // 4. Save to DB
    const result = await payload.create({
      collection: 'hemat-umrah-daftar', 
      data: cleanData,
    })

    const bookingId = (result as any).booking_id || `HU-${Date.now()}`
    const baseUrl = resolveBaseUrl()

    // 5. Prepare Data for PDF & WA
    const customerPhone = formatPhoneForWhatsApp(cleanData.whatsapp_number || cleanData.phone_number)
    const adminPhone = formatPhoneForWhatsApp(process.env.ADMIN_WA_PHONE || '')

    const formattedInstallment = cleanData.installmentamount?.toLocaleString('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }) || '0'

    const freqMap: Record<string, string> = {
      daily: 'Harian',
      weekly: 'Mingguan',
      monthly: 'Bulanan',
      flexible: 'Fleksibel'
    }
    const freqLabel = freqMap[cleanData.installmentfrequency] || cleanData.installmentfrequency

    // 🔥 Gabungkan Data Paket Asli ke Data Form untuk PDF
    const dataForPdf = { 
      ...cleanData, 
      booking_id: bookingId,
      package_name: packageDetail.name, 
      package_price: packageDetail.price 
    }

    // 🔥 UPDATE: Caption BC sesuai permintaan Anda
    const captionCustomer = `Assalamu'alaikum ${cleanData.name},

Alhamdulillah! Pendaftaran program tabungan umrah Anda telah berhasil dicatat.

📋 Detail Pendaftaran:
* Booking ID: ${bookingId}
* Nama: ${cleanData.name}
* Paket: ${packageDetail.name}
* Rencana Setoran: ${formattedInstallment}
* Frekuensi: ${freqLabel}

Terlampir dokumen konfirmasi pendaftaran lengkap (PDF). 
Tim kami akan segera menghubungi Anda untuk verifikasi selanjutnya.

Jazakallahu khairan,
Rehla Tours Team`

    const captionAdmin = `📥 *Pendaftaran Baru*
    
ID: ${bookingId}
Nama: ${cleanData.name}
Paket: ${packageDetail.name}
Setoran: ${formattedInstallment}
Frekuensi: ${freqLabel}`

    // 6. Send WA
    Promise.allSettled([
      customerPhone
        ? sendPdfToWhatsapp({ baseUrl, phone: customerPhone, bookingId, umrahFormData: dataForPdf, caption: captionCustomer })
        : Promise.resolve(),
      adminPhone
        ? sendPdfToWhatsapp({ baseUrl, phone: adminPhone, bookingId, umrahFormData: dataForPdf, caption: captionAdmin })
        : Promise.resolve(),
    ])

    return {
      success: true,
      data: {
        id: result.id,
        booking_id: bookingId,
        message: `Pendaftaran berhasil! ID: ${bookingId}. Cek WhatsApp Anda.`,
      },
    }
  } catch (error) {
    console.error('submitHematUmrahForm error:', error)
    return { success: false, error: 'Terjadi kesalahan sistem.' }
  }
}


