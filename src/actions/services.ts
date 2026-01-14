'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

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

function safeString(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function safeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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

  const fd = new FormData()
  fd.append('phone', formattedPhone)
  fd.append('bookingId', bookingId)
  fd.append('umrahFormData', JSON.stringify(umrahFormData))
  if (caption) fd.append('caption', caption)

  const res = await fetch(apiUrl, { method: 'POST', body: fd })
  const text = await res.text()

  if (!res.ok) return { success: false, error: text }
  return JSON.parse(text)
}

/**
 * Validator minimal khusus Umrah Hemat (sesuai collection Hematumrahdaftar.ts)
 */
function validateHematForm(formData: any): { success: boolean; errors?: string[] } {
  const errors: string[] = []

  const name = safeString(formData?.name)
  const email = safeString(formData?.email)
  const phone = safeString(formData?.phone_number)
  const wa = safeString(formData?.whatsapp_number)
  const gender = safeString(formData?.gender)
  const pob = safeString(formData?.place_of_birth)
  const birthDate = formData?.birth_date
  const address = safeString(formData?.address)
  const city = safeString(formData?.city)
  const province = safeString(formData?.province)
  const pkg = safeString(formData?.umrah_package)
  const installmentAmount = safeNumber(formData?.installment_amount)
  const installmentFrequency = safeString(formData?.installment_frequency)

  if (!name) errors.push('Nama wajib diisi')
  if (!email) errors.push('Email wajib diisi')
  if (!phone) errors.push('Nomor telepon wajib diisi')
  if (!wa) errors.push('Nomor WhatsApp wajib diisi')
  if (!gender) errors.push('Gender wajib diisi')
  if (!pob) errors.push('Tempat lahir wajib diisi')
  if (!birthDate) errors.push('Tanggal lahir wajib diisi')
  if (!address) errors.push('Alamat wajib diisi')
  if (!city) errors.push('Kota wajib diisi')
  if (!province) errors.push('Provinsi wajib diisi')
  if (!pkg) errors.push('Paket umrah wajib dipilih')
  if (installmentAmount === null || installmentAmount <= 0)
    errors.push('Rencana setoran wajib diisi dan harus > 0')
  if (!installmentFrequency) errors.push('Frekuensi setoran wajib dipilih')

  return errors.length ? { success: false, errors } : { success: true }
}

/**
 * Clean data sesuai Collection Hematumrahdaftar.ts
 * - umrah_package harus berupa ID (relationship)
 */
function buildCleanDataHemat(formData: any) {
  return {
    // booking_id di-generate via hook collection
    name: safeString(formData.name),
    email: safeString(formData.email),
    phone_number: safeString(formData.phone_number),
    whatsapp_number: safeString(formData.whatsapp_number),
    gender: safeString(formData.gender),
    place_of_birth: safeString(formData.place_of_birth),
    birth_date: formData.birth_date ? new Date(formData.birth_date).toISOString() : null,
    address: safeString(formData.address),
    city: safeString(formData.city),
    province: safeString(formData.province),

    // relationship -> ID paket
    umrah_package: safeString(formData.umrah_package),

    payment_type: 'tabungan_custom',
    installment_amount: safeNumber(formData.installment_amount),
    installment_frequency: safeString(formData.installment_frequency) || 'flexible',
    installment_notes: safeString(formData.installment_notes),

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

    const validation = validateHematForm(formData)
    if (!validation.success) {
      return {
        success: false,
        error: 'Validasi gagal',
        errors: validation.errors,
      }
    }

    const cleanData = buildCleanDataHemat(formData)
    const payload = await getPayload({ config })

    const result = await payload.create({
      collection: 'hemat-umrah-daftar', // slug sudah sesuai dengan file Hematumrahdaftar.ts
      data: cleanData,
    })

    const bookingId = (result as any).booking_id || `HU-${Date.now()}`
    const baseUrl = resolveBaseUrl()

    const customerPhone = formatPhoneForWhatsApp(cleanData.whatsapp_number || cleanData.phone_number)
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
Paket(ID): ${cleanData.umrah_package}
Setoran: ${cleanData.installment_amount} (${cleanData.installment_frequency})`

    Promise.allSettled([
      customerPhone
        ? sendPdfToWhatsapp({
            baseUrl,
            phone: customerPhone,
            bookingId,
            umrahFormData: { ...cleanData, booking_id: bookingId },
            caption: captionCustomer,
          })
        : Promise.resolve(),

      adminPhone
        ? sendPdfToWhatsapp({
            baseUrl,
            phone: adminPhone,
            bookingId,
            umrahFormData: { ...cleanData, booking_id: bookingId },
            caption: captionAdmin,
          })
        : Promise.resolve(),
    ])

    return {
      success: true,
      data: {
        id: result.id,
        booking_id: bookingId,
        message: `Pendaftaran Umrah Hemat berhasil! ID Booking: ${bookingId}. Notifikasi WhatsApp sedang dikirim.`,
      },
    }
  } catch (error) {
    console.error('submitHematUmrahForm error:', error)
    return { success: false, error: 'Terjadi kesalahan sistem. Silakan coba lagi.' }
  }
}


