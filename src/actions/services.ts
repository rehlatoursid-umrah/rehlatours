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
  
  console.log(`📱 Phone formatted: ${phone} → ${formatted}`)
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

  // Format phone number dengan benar
  const formattedPhone = formatPhoneForWhatsApp(phone)
  
  if (!formattedPhone) {
    throw new Error('Phone number is empty or invalid')
  }

  console.log('📤 Sending WhatsApp PDF to:', formattedPhone)

  const fd = new FormData()
  fd.append('phone', formattedPhone) // Gunakan formatted phone
  fd.append('bookingId', bookingId)
  fd.append('umrahFormData', JSON.stringify(umrahFormData))
  if (caption) fd.append('caption', caption)

  const res = await fetch(`${baseUrl}/api/send-file`, {
    method: 'POST',
    body: fd,
  })

  const text = await res.text()
  let payload: any = null
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { raw: text }
  }

  if (!res.ok) {
    throw new Error(
      `WA API failed (${res.status}) for ${formattedPhone}. Response: ${JSON.stringify(payload)}`,
    )
  }

  console.log('✅ WhatsApp sent successfully to:', formattedPhone)
  return payload
}

export async function getUmrahPackageOptions() {
  try {
    const payload = await getPayload({ config })

    const packages = await payload.find({
      collection: 'umrah-package',
      sort: 'name',
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
      },
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
    if (!formData) {
      return { success: false, error: 'Form data is missing' }
    }

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

    console.log('✅ Data saved to database. Booking ID:', bookingId)

    // Cek BASE_URL dengan fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    
    if (!baseUrl) {
      console.error('❌ NEXT_PUBLIC_BASE_URL is missing. Cannot send WhatsApp.')
      return {
        success: true,
        data: {
          id: result.id,
          booking_id: bookingId,
          message: `Pendaftaran berhasil! ID Booking Anda: ${bookingId}. (WhatsApp notification disabled - BASE_URL not configured)`,
        },
      }
    }

    // Pastikan baseUrl memiliki https://
    const fullBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
    console.log('🌐 Using BASE_URL:', fullBaseUrl)

    // Format phone numbers dengan benar
    const customerPhone = formatPhoneForWhatsApp(
      cleanData.whatsapp_number || cleanData.phone_number || ''
    )
    const adminPhone = formatPhoneForWhatsApp(process.env.ADMIN_WA_PHONE || '')

    const captionCustomer = `🕌 *Konfirmasi Pendaftaran Umrah*

Assalamu'alaikum ${cleanData.name},

Alhamdulillah! Pendaftaran umrah Anda telah berhasil dicatat.

📋 *Detail Pendaftaran:*
• Booking ID: ${bookingId}
• Nama: ${cleanData.name}
• Email: ${cleanData.email}

Terlampir adalah konfirmasi pendaftaran Anda dalam format PDF.

Tim kami akan segera menghubungi Anda dalam 1x24 jam untuk konfirmasi lebih lanjut.

Jazakallahu khairan,
*Rehla Tours Team*`

    const captionAdmin = `📥 *Pendaftaran Umrah Baru*

ID Booking: ${bookingId}
Nama: ${cleanData.name}
Email: ${cleanData.email}
WhatsApp: ${customerPhone}
Paket: ${cleanData.umrah_package}
Payment: ${cleanData.payment_method}

Silakan follow up dalam 1x24 jam.`

    let waCustomer: any = null
    let waAdmin: any = null

    // Kirim WhatsApp ke customer
    if (customerPhone) {
      try {
        console.log('📤 Sending WhatsApp to customer...')
        waCustomer = await sendPdfToWhatsapp({
          baseUrl: fullBaseUrl,
          phone: customerPhone,
          bookingId,
          umrahFormData: cleanData,
          caption: captionCustomer,
        })
        console.log('✅ WhatsApp sent to customer successfully')
      } catch (e) {
        console.error('❌ Failed sending WA to customer:', e)
        // Jangan fail seluruh proses, hanya log error
      }
    } else {
      console.warn('⚠️ Customer phone/whatsapp number is empty; skip sending to customer.')
    }

    // Kirim WhatsApp ke admin
    if (adminPhone) {
      try {
        console.log('📤 Sending WhatsApp to admin...')
        waAdmin = await sendPdfToWhatsapp({
          baseUrl: fullBaseUrl,
          phone: adminPhone,
          bookingId,
          umrahFormData: cleanData,
          caption: captionAdmin,
        })
        console.log('✅ WhatsApp sent to admin successfully')
      } catch (e) {
        console.error('❌ Failed sending WA to admin:', e)
        // Jangan fail seluruh proses, hanya log error
      }
    } else {
      console.warn('⚠️ ADMIN_WA_PHONE is not set; skip sending to admin.')
    }

    console.log('=== SUBMIT FORM SUCCESS ===')

    return {
      success: true,
      data: {
        id: result.id,
        booking_id: bookingId,
        message: `Pendaftaran berhasil! ID Booking Anda: ${bookingId}.`,
        waCustomer,
        waAdmin,
      },
    }
  } catch (error) {
    console.log('=== SUBMIT FORM ERROR ===')
    console.error(error)
    return {
      success: false,
      error: 'Terjadi kesalahan sistem. Silakan coba lagi atau hubungi customer service.',
    }
  }
}
