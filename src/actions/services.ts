'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { validateUmrahFormSimple } from '@/lib/validations-simple'

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

function safeExtract(value: any): any {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.toString()
  if (typeof value === 'number') return Number(value)
  if (typeof value === 'boolean') return Boolean(value)
  if (value instanceof Date) return new Date(value.getTime())
  if (typeof value === 'object' && value.toString) return value.toString()
  return String(value)
}

// Helper format phone number (WA)
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  let formatted = phone.replace(/\D/g, '')
  if (formatted.startsWith('0')) formatted = '62' + formatted.substring(1)
  else if (!formatted.startsWith('62')) formatted = '62' + formatted
  return formatted
}

function resolveBaseUrl(): string {
  // untuk WA API route (/api/send-file) di project hematumrah
  let baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL ||
    'https://hematumrah.rehlatours.id'

  if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`
  return baseUrl.replace(/\/$/, '')
}

async function sendPdfToWhatsapp(params: {
  baseUrl: string
  phone: string
  bookingId: string
  umrahFormData: any
  caption?: string
}) {
  const { baseUrl, phone, bookingId, umrahFormData, caption } = params

  const formattedPhone = formatPhoneForWhatsApp(phone)
  if (!formattedPhone) throw new Error('Invalid phone number')

  const apiUrl = `${baseUrl}/api/send-file`
  console.log(`📤 Sending PDF to ${formattedPhone} via ${apiUrl}`)

  const fd = new FormData()
  fd.append('phone', formattedPhone)
  fd.append('bookingId', bookingId)
  fd.append('umrahFormData', JSON.stringify(umrahFormData))
  if (caption) fd.append('caption', caption)

  const res = await fetch(apiUrl, { method: 'POST', body: fd })
  const text = await res.text()

  if (!res.ok) {
    console.error(`❌ WA API Error (${res.status}): ${text}`)
    return { success: false, error: text }
  }

  console.log(`✅ WA Success to ${formattedPhone}`)
  return JSON.parse(text)
}

/**
 * Mapping data untuk Umrah Hemat (tabungan/cicilan custom).
 * NOTE: field cicilan baru:
 * - installment_amount
 * - installment_frequency
 * - installment_notes
 */
function buildCleanDataHemat(formData: any) {
  return {
    booking_id: '',

    // data umum (sama seperti sebelumnya)
    name: safeExtract(formData.name) || '',
    register_date: formData.register_date
      ? new Date(formData.register_date).toISOString()
      : new Date().toISOString(),
    gender: safeExtract(formData.gender) || 'male',
    place_of_birth: safeExtract(formData.place_of_birth) || '',
    birth_date: formData.birth_date ? new Date(formData.birth_date).toISOString() : null,
    father_name: safeExtract(formData.father_name) || '',
    mother_name: safeExtract(formData.mother_name) || '',
    address: safeExtract(formData.address) || '',
    city: safeExtract(formData.city) || '',
    province: safeExtract(formData.province) || '',
    postal_code: safeExtract(formData.postal_code) || '',
    occupation: safeExtract(formData.occupation) || '',

    specific_disease: Boolean(formData.specific_disease) || false,
    illness: safeExtract(formData.illness) || null,
    special_needs: Boolean(formData.special_needs) || false,
    wheelchair: Boolean(formData.wheelchair) || false,

    nik_number: safeExtract(formData.nik_number) || '',
    passport_number: safeExtract(formData.passport_number) || '',
    date_of_issue: formData.date_of_issue ? new Date(formData.date_of_issue).toISOString() : null,
    expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
    place_of_issue: safeExtract(formData.place_of_issue) || '',

    phone_number: safeExtract(formData.phone_number) || '',
    whatsapp_number: safeExtract(formData.whatsapp_number) || '',
    email: safeExtract(formData.email) || '',

    has_performed_umrah: Boolean(formData.has_performed_umrah) || false,
    has_performed_hajj: Boolean(formData.has_performed_hajj) || false,

    emergency_contact_name: safeExtract(formData.emergency_contact_name) || '',
    relationship: safeExtract(formData.relationship) || 'parents',
    emergency_contact_phone: safeExtract(formData.emergency_contact_phone) || '',
    mariage_status: safeExtract(formData.mariage_status) || 'single',

    umrah_package: safeExtract(formData.umrah_package) || '',

    // pembayaran khusus hemat (tabungan)
    payment_type: 'tabungan_custom',
    installment_amount:
      formData.installment_amount !== undefined && formData.installment_amount !== null
        ? Number(formData.installment_amount)
        : null,
    installment_frequency: safeExtract(formData.installment_frequency) || 'flexible',
    installment_notes: safeExtract(formData.installment_notes) || '',

    terms_of_service: Boolean(formData.terms_of_service) || false,
    submission_date: new Date().toISOString(),
    status: 'pending_review',
  }
}

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
    console.error('Error fetching package options:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil opsi paket',
      data: [],
    }
  }
}

export async function submitHematUmrahForm(formData: any): Promise<SubmitResponse> {
  console.log('=== SUBMIT HEMAT FORM START ===')

  try {
    if (!formData) return { success: false, error: 'Form data is missing' }

    // VALIDASI SEMENTARA:
    // Kalau validateUmrahFormSimple belum mengenal field cicilan baru,
    // kamu bisa:
    // - update validatornya, ATAU
    // - comment validasi ini sementara untuk memastikan flow end-to-end jalan.
    const simpleValidationResult = validateUmrahFormSimple(formData)
    if (!simpleValidationResult.success) {
      return {
        success: false,
        error: `Simple validation failed: ${simpleValidationResult.error}`,
        errors: simpleValidationResult.errors,
      }
    }

    const cleanData = buildCleanDataHemat(formData)
    const payload = await getPayload({ config })

    // SIMPAN KE COLLECTION BARU (HEMAT)
    const result = await payload.create({
      collection: 'hemat-umrah-daftar', // <-- pastikan slug collection kamu sama
      data: cleanData,
    })

    const bookingId = (result as any).booking_id || `HU-${Date.now()}`
    console.log('✅ Hemat data saved. Booking ID:', bookingId)

    // WA API base URL (route /api/send-file ada di project hematumrah)
    const baseUrl = resolveBaseUrl()
    console.log('🌐 Base URL for WA API:', baseUrl)

    const customerPhone = formatPhoneForWhatsApp(
      cleanData.whatsapp_number || cleanData.phone_number || '',
    )
    const adminPhone = formatPhoneForWhatsApp(process.env.ADMIN_WA_PHONE || '')

    const captionCustomer = `🕌 *Konfirmasi Pendaftaran Umrah Hemat (Tabungan)*

Assalamu'alaikum ${cleanData.name},

Alhamdulillah! Pendaftaran program tabungan umrah Anda telah berhasil dicatat.

📋 *Detail Pendaftaran:*
• Booking ID: ${bookingId}
• Nama: ${cleanData.name}
• Rencana setoran: Rp ${cleanData.installment_amount?.toLocaleString?.('id-ID') || cleanData.installment_amount}
• Frekuensi: ${cleanData.installment_frequency}

Terlampir konfirmasi pendaftaran (PDF). Tim kami akan segera menghubungi Anda.

Jazakallahu khairan,
*Rehla Tours Team*`

    const captionAdmin = `📥 *Pendaftaran Umrah Hemat Baru*
ID: ${bookingId}
Nama: ${cleanData.name}
WA: ${customerPhone}
Paket: ${cleanData.umrah_package}
Setoran: ${cleanData.installment_amount} (${cleanData.installment_frequency})`

    // kirim WA background (non-blocking)
    Promise.allSettled([
      customerPhone
        ? sendPdfToWhatsapp({
            baseUrl,
            phone: customerPhone,
            bookingId,
            umrahFormData: cleanData,
            caption: captionCustomer,
          })
        : Promise.resolve(),

      adminPhone
        ? sendPdfToWhatsapp({
            baseUrl,
            phone: adminPhone,
            bookingId,
            umrahFormData: cleanData,
            caption: captionAdmin,
          })
        : Promise.resolve(),
    ]).then((results) => {
      console.log('📝 Background WhatsApp tasks completed')
      results.forEach((res, idx) => {
        if (res.status === 'rejected') console.error(`❌ WA Task ${idx} failed:`, res.reason)
      })
    })

    return {
      success: true,
      data: {
        id: result.id,
        booking_id: bookingId,
        message: `Pendaftaran Umrah Hemat berhasil! ID Booking: ${bookingId}. Notifikasi WhatsApp sedang dikirim.`,
      },
    }
  } catch (error) {
    console.error('=== SUBMIT HEMAT FORM ERROR ===', error)
    return {
      success: false,
      error: 'Terjadi kesalahan sistem. Silakan coba lagi.',
    }
  }
}

