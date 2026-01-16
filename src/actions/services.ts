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

function buildCleanData(formData: any) {
  return {
    booking_id: '',
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
    payment_method: safeExtract(formData.payment_method) || 'lunas',
    terms_of_service: Boolean(formData.terms_of_service) || false,
    submission_date: new Date().toISOString(),
    status: 'pending_review',
  }
}

// Helper function untuk format phone number dengan benar
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ''
  
  // Hapus semua karakter non-digit
  let formatted = phone.replace(/\D/g, '')
  
  // Ganti 0 di awal dengan 62
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1)
  }
  // Tambahkan 62 kalau belum ada
  else if (!formatted.startsWith('62')) {
    formatted = '62' + formatted
  }
  
  return formatted
}

async function sendPdfToWhatsapp(params: {
  baseUrl: string
  phone: string
  bookingId: string
  umrahFormData: any
  caption?: string
}) {
  const { baseUrl, phone, bookingId, umrahFormData, caption } = params

  try {
    const formattedPhone = formatPhoneForWhatsApp(phone)
    if (!formattedPhone) throw new Error('Invalid phone number')

    const apiUrl = `${baseUrl}/api/send-file`
    console.log(`📤 Sending PDF to ${formattedPhone} via ${apiUrl}`)

    const fd = new FormData()
    fd.append('phone', formattedPhone)
    fd.append('bookingId', bookingId)
    fd.append('umrahFormData', JSON.stringify(umrahFormData))
    if (caption) fd.append('caption', caption)

    const res = await fetch(apiUrl, {
      method: 'POST',
      body: fd,
    })

    const text = await res.text()
    if (!res.ok) {
      console.error(`❌ WA API Error (${res.status}): ${text}`)
      return { success: false, error: text }
    }

    console.log(`✅ WA Success to ${formattedPhone}`)
    return JSON.parse(text)
  } catch (error: any) {
    console.error(`❌ SendPdfToWhatsapp Failed: ${error.message}`)
    throw error
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

export async function submitUmrahForm(formData: any): Promise<SubmitResponse> {
  console.log('=== SUBMIT FORM START ===')

  try {
    if (!formData) return { success: false, error: 'Form data is missing' }

    const simpleValidationResult = validateUmrahFormSimple(formData)
    if (!simpleValidationResult.success) {
      return {
        success: false,
        error: `Simple validation failed: ${simpleValidationResult.error}`,
        errors: simpleValidationResult.errors,
      }
    }

    const cleanData = buildCleanData(formData)
    const payload = await getPayload({ config })

    const result = await payload.create({
      collection: 'umrah-form-minimal',
      data: cleanData,
    })

    const bookingId = (result as any).booking_id || `RT-${Date.now()}`
    console.log('✅ Data saved. ID:', bookingId)

    // --- FIX URL HANDLING ---
    // Gunakan environment variable atau fallback hardcoded jika perlu
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'https://umrah.rehlatours.id'
    
    // Pastikan URL valid
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`
    }
    
    // Hapus trailing slash jika ada
    baseUrl = baseUrl.replace(/\/$/, '')

    console.log('🌐 Base URL for API:', baseUrl)

    // --- PREPARE WHATSAPP DATA ---
    const customerPhone = formatPhoneForWhatsApp(cleanData.whatsapp_number || cleanData.phone_number || '')
    const adminPhone = formatPhoneForWhatsApp(process.env.ADMIN_WA_PHONE || '')

    const captionCustomer = `🕌 *Konfirmasi Pendaftaran Umrah*

Assalamu'alaikum ${cleanData.name},

Alhamdulillah! Pendaftaran umrah Anda telah berhasil dicatat.

📋 *Detail Pendaftaran:*
• Booking ID: ${bookingId}
• Nama: ${cleanData.name}

Terlampir konfirmasi pendaftaran (PDF). Tim kami akan segera menghubungi Anda.

Jazakallahu khairan,
*Rehla Tours Team*`

    const captionAdmin = `📥 *Pendaftaran Umrah Baru*
ID: ${bookingId}
Nama: ${cleanData.name}
WA: ${customerPhone}
Paket: ${cleanData.umrah_package}`

    // --- SEND WHATSAPP (NON-BLOCKING / BACKGROUND) ---
    // Kita tidak menggunakan 'await' di sini agar user langsung dapat response sukses
    // Promise.allSettled memastikan error di satu request tidak menghentikan yang lain
    Promise.allSettled([
      customerPhone ? sendPdfToWhatsapp({
        baseUrl,
        phone: customerPhone,
        bookingId,
        umrahFormData: cleanData,
        caption: captionCustomer,
      }) : Promise.resolve(),
      
      adminPhone ? sendPdfToWhatsapp({
        baseUrl,
        phone: adminPhone,
        bookingId,
        umrahFormData: cleanData,
        caption: captionAdmin,
      }) : Promise.resolve()
    ]).then((results) => {
      console.log('📝 Background WhatsApp tasks completed')
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
           console.error(`❌ WA Task ${idx} failed:`, res.reason)
        }
      })
    })

    return {
      success: true,
      data: {
        id: result.id,
        booking_id: bookingId,
        message: `Pendaftaran berhasil! ID Booking: ${bookingId}. Notifikasi WhatsApp sedang dikirim.`,
      },
    }

  } catch (error) {
    console.error('=== SUBMIT FORM ERROR ===', error)
    return {
      success: false,
      error: 'Terjadi kesalahan sistem. Silakan coba lagi.',
    }
  }
}
