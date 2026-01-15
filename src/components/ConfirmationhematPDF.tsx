import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer'

type HematFormData = Record<string, any>

try {
  Font.register({
    family: 'Inter',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7SUc.woff2' },
      { src: 'Helvetica', fontWeight: 'normal' },
    ],
  })
  Font.register({
    family: 'Inter-Bold',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2' },
      { src: 'Helvetica-Bold', fontWeight: 'bold' },
    ],
  })
  Font.register({
    family: 'Inter-SemiBold',
    fonts: [
      { src: 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2pL7SUc.woff2' },
      { src: 'Helvetica-Bold', fontWeight: 600 },
    ],
  })
} catch (error) {
  console.warn('Failed to register custom fonts, using system fonts:', error)
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
    paddingHorizontal: 32,
    paddingBottom: 28,
    fontSize: 10,
  },
  header: {
    backgroundColor: '#3A0519',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
    objectFit: 'contain',
  },
  headerTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#F3E7EB',
    fontFamily: 'Helvetica',
    textAlign: 'left',
  },
  content: {
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cardHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    minHeight: 20,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'Helvetica',
    width: '45%',
    paddingRight: 8,
  },
  value: {
    fontSize: 11,
    color: '#0F172A',
    fontFamily: 'Helvetica-Bold',
    width: '55%',
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  footer: {
    textAlign: 'center',
    fontSize: 9,
    color: '#4B5563',
    fontFamily: 'Helvetica',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  noteBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#FFF7FA',
    marginTop: 8,
  },
  noteTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  noteText: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  bookingId: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'Helvetica',
  },
})

interface ConfirmationPDFProps {
  formData: HematFormData
  bookingId: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const hasValue = (v: any): boolean => {
  if (v === null || v === undefined || v === '') return false
  if (typeof v === 'string') return v.trim() !== ''
  return true
}

const safeGet = (obj: any, key: string, defaultValue: any = ''): any => {
  if (!obj || typeof obj !== 'object') return defaultValue
  const v = obj[key]
  return hasValue(v) ? v : defaultValue
}

const formatValue = (value: any): string => {
  if (!hasValue(value)) return ''
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'string') return value
  return String(value)
}

const formatDate = (dateString: string): string => {
  try {
    if (!hasValue(dateString)) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return String(dateString)
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return hasValue(dateString) ? String(dateString) : ''
  }
}

const getGenderLabel = (gender: string): string => {
  if (!hasValue(gender)) return ''
  return gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : gender
}

const getPaymentTypeLabel = (paymentType: string): string => {
  if (!hasValue(paymentType)) return ''
  const labels: Record<string, string> = {
    tabungan_custom: 'Tabungan Umrah (Custom)',
    lunas: 'Lunas',
    dp: 'DP (Down Payment)',
    cicilan: 'Cicilan',
  }
  return labels[paymentType] || paymentType
}

const getFrequencyLabel = (freq: string): string => {
  if (!hasValue(freq)) return ''
  const labels: Record<string, string> = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    flexible: 'Fleksibel',
  }
  return labels[freq] || freq
}

const formatRupiah = (value: any): string => {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(String(value).replace(/[^\d.-]/g, ''))
        : NaN

  if (!isFinite(n)) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

// ============================================
// SAFEROW COMPONENT (Render only if value exists)
// ============================================

interface SafeRowProps {
  label: string
  value: any
  isLast?: boolean
  isCurrency?: boolean
}

const SafeRow = ({ label, value, isLast = false, isCurrency = false }: SafeRowProps) => {
  if (!hasValue(value)) return null

  const displayValue = isCurrency ? formatRupiah(value) : formatValue(value)

  return (
    <View style={[styles.row, isLast && styles.lastRow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayValue}</Text>
    </View>
  )
}

// ============================================
// MAIN CONFIRMATIONPDF COMPONENT
// ============================================

export default function ConfirmationPDF({ formData, bookingId }: ConfirmationPDFProps) {
  const safeFormData = formData || {}
  const safeBookingId = bookingId || `HU-${Date.now()}`

  const logoSrc =
    'https://raw.githubusercontent.com/rehlatoursid-umrah/rehlatours/refs/heads/main/public/rehla.png'

  // ============================================
  // EXTRACT DATA SESUAI SCHEMA HematUmrahdaftar
  // ============================================

  // Informasi Pribadi
  const name = safeGet(safeFormData, 'name', '')
  const gender = safeGet(safeFormData, 'gender', '')
  const placeOfBirth = safeGet(safeFormData, 'place_of_birth', '')
  const birthDate = safeGet(safeFormData, 'birth_date', '')

  // Informasi Kontak
  const email = safeGet(safeFormData, 'email', '')
  const phoneNumber = safeGet(safeFormData, 'phone_number', '')
  const whatsappNumber = safeGet(safeFormData, 'whatsapp_number', '')

  // Informasi Alamat
  const address = safeGet(safeFormData, 'address', '')
  const city = safeGet(safeFormData, 'city', '')
  const province = safeGet(safeFormData, 'province', '')

  // Paket & Tabungan
  const umrahPackage = safeGet(safeFormData, 'umrahpackage', '')
  const paymentType = safeGet(safeFormData, 'payment_type', 'tabungan_custom')
  const installmentAmount = safeGet(safeFormData, 'installmentamount', '')
  const installmentFrequency = safeGet(safeFormData, 'installmentfrequency', '')
  const installmentNotes = safeGet(safeFormData, 'installmentnotes', '')
  const submissionDate = safeGet(safeFormData, 'submission_date', '')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ============================================
            HEADER
            ============================================ */}
        <View style={styles.header}>
          <Image style={styles.logo} src={logoSrc} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>KONFIRMASI PENDAFTARAN</Text>
            <Text style={styles.subtitle}>Rehla Indonesia Tours & Travel</Text>
            <Text style={[styles.subtitle, { fontSize: 10, marginTop: 2, opacity: 0.9 }]}>
              hematumrah.rehlatours.id
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.bookingId}>ID Pendaftaran: {safeBookingId}</Text>

          {/* ============================================
              INFORMASI PRIBADI
              ============================================ */}
          {(hasValue(name) ||
            hasValue(gender) ||
            hasValue(placeOfBirth) ||
            hasValue(birthDate)) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Informasi Pribadi</Text>
              </View>

              <SafeRow label="Nama Lengkap" value={name} />
              <SafeRow label="Jenis Kelamin" value={getGenderLabel(gender)} />
              <SafeRow label="Tempat Lahir" value={placeOfBirth} />
              <SafeRow label="Tanggal Lahir" value={formatDate(birthDate)} isLast />
            </View>
          )}

          {/* ============================================
              INFORMASI KONTAK
              ============================================ */}
          {(hasValue(email) || hasValue(phoneNumber) || hasValue(whatsappNumber)) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Informasi Kontak</Text>
              </View>

              <SafeRow label="Email" value={email} />
              <SafeRow label="No. Telepon" value={phoneNumber} />
              <SafeRow label="WhatsApp" value={whatsappNumber} isLast />
            </View>
          )}

          {/* ============================================
              INFORMASI ALAMAT
              ============================================ */}
          {(hasValue(address) || hasValue(city) || hasValue(province)) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Informasi Alamat</Text>
              </View>

              <SafeRow label="Alamat Lengkap" value={address} />
              <SafeRow label="Kota" value={city} />
              <SafeRow label="Provinsi" value={province} isLast />
            </View>
          )}

          {/* ============================================
              INFORMASI PROGRAM TABUNGAN UMRAH
              ============================================ */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Program Tabungan Umrah</Text>
            </View>

            <SafeRow label="Paket Umrah" value={umrahPackage} />
            <SafeRow label="Metode Pembayaran" value={getPaymentTypeLabel(paymentType)} />

            {(hasValue(installmentAmount) ||
              hasValue(installmentFrequency) ||
              hasValue(installmentNotes)) && (
              <>
                <SafeRow
                  label="Nominal Setoran Rutin"
                  value={installmentAmount}
                  isCurrency
                />
                <SafeRow
                  label="Frekuensi Setoran"
                  value={getFrequencyLabel(installmentFrequency)}
                />
                <SafeRow label="Catatan Rencana Tabungan" value={installmentNotes} />
              </>
            )}

            <SafeRow label="Tanggal Pendaftaran" value={formatDate(submissionDate)} isLast />
          </View>

          {/* ============================================
              CATATAN PENTING
              ============================================ */}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>INFORMASI PENTING</Text>
            <Text style={styles.noteText}>
              Mohon simpan dokumen ini sebagai bukti pendaftaran program tabungan umrah Anda.
              Tim kami akan segera menghubungi Anda melalui WhatsApp atau email untuk konfirmasi
              lebih lanjut mengenai jadwal setoran, paket pilihan, dan dokumen yang diperlukan.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ============================================
              FOOTER
              ============================================ */}
          <View style={styles.footer}>
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                color: '#111827',
                marginBottom: 6,
                fontSize: 10,
              }}
            >
              Terima kasih telah mempercayakan perjalanan Anda kepada Rehla Indonesia Tours & Travel
            </Text>
            <Text style={{ marginBottom: 4, fontSize: 9 }}>
              Untuk informasi lebih lanjut, hubungi kami di +62 831-9732-1658
            </Text>
            <Text style={{ marginTop: 6, fontSize: 8, color: '#6B7280' }}>
              Dokumen ini dihasilkan otomatis pada{' '}
              {new Date().toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
