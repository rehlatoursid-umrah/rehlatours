import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer'
import { UmrahFormData } from '@/types/form'

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
  // --- BATAS PERUBAHAN HEADER ---
  
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
  formData: UmrahFormData
  bookingId: string
}

// Helper functions (tetap sama)
const safeGet = (obj: any, path: string, defaultValue: any = '-'): any => {
  if (!obj || typeof obj !== 'object') return defaultValue
  return obj[path] !== undefined && obj[path] !== null && obj[path] !== '' ? obj[path] : defaultValue
}

const formatDate = (dateString: string): string => {
  try {
    if (!dateString || dateString === '-') return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString || '-'
  }
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'string') return value
  return String(value)
}

const getGenderLabel = (gender: string): string => {
  if (!gender) return '-'
  return gender === 'male' ? 'Laki-laki' : gender === 'female' ? 'Perempuan' : gender
}

const getRelationshipLabel = (relationship: string): string => {
  if (!relationship) return '-'
  const labels: Record<string, string> = {
    parents: 'Orang Tua',
    spouse: 'Suami/Istri',
    children: 'Anak',
    sibling: 'Saudara',
    relative: 'Kerabat',
  }
  return labels[relationship] || relationship
}

const getMaritalStatusLabel = (status: string): string => {
  if (!status) return '-'
  const labels: Record<string, string> = {
    single: 'Belum Menikah',
    married: 'Menikah',
    divorced: 'Cerai',
  }
  return labels[status] || status
}

const getPaymentMethodLabel = (method: string): string => {
  if (!method) return '-'
  const labels: Record<string, string> = {
    lunas: 'Lunas',
    '60_percent': '60% (Cicilan)',
  }
  return labels[method] || method
}

export default function ConfirmationPDF({ formData, bookingId }: ConfirmationPDFProps) {
  const safeFormData = formData || {}
  const safeBookingId = bookingId || `RT-${Date.now()}`
  
  // Pastikan URL domain sesuai environment (Production/Local)
  // Atau gunakan path relatif jika di local, tapi untuk PDF generator biasanya butuh full URL atau base64
  // Di sini saya asumsikan logo ada di public folder dan bisa diakses via window.location.origin
  // Jika error di server-side, ganti 'window.location.origin' dengan process.env.NEXT_PUBLIC_BASE_URL
  const logoUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/logo.png` 
    : '/logo.png'; 

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image 
            style={styles.logo} 
            src={/rehla.png}
          />
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>KONFIRMASI PEMESANAN</Text>
            <Text style={styles.subtitle}>Rehla Indonesia Tours & Travel</Text>
            <Text style={[styles.subtitle, { fontSize: 10, marginTop: 2, opacity: 0.9 }]}>www.rehlatours.id</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.bookingId}>ID Pemesanan: {safeBookingId}</Text>

          {/* Sisa konten ke bawah TETAP SAMA seperti kode asli ... */}
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Pribadi</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'name'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jenis Kelamin</Text>
              <Text style={styles.value}>{getGenderLabel(safeGet(safeFormData, 'gender'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tempat Lahir</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'place_of_birth'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Lahir</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData, 'birth_date'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama Ayah</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'father_name'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama Ibu</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'mother_name'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status Pernikahan</Text>
              <Text style={styles.value}>{getMaritalStatusLabel(safeGet(safeFormData, 'mariage_status'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Pekerjaan</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'occupation'))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Kontak</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'email'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>No. Telepon</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'phone_number'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>WhatsApp</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'whatsapp_number'))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Alamat</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Alamat</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'address'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Kota</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'city'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Provinsi</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'province'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Kode Pos</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'postal_code'))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Dokumen</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>NIK</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'nik_number'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>No. Paspor</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'passport_number'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Terbit</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData, 'date_of_issue'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Berakhir</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData, 'expiry_date'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Tempat Terbit</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'place_of_issue'))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Kesehatan</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Penyakit Khusus</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'specific_disease'))}</Text>
            </View>
            {safeGet(safeFormData, 'specific_disease') && safeGet(safeFormData, 'illness') && (
              <View style={styles.row}>
                <Text style={styles.label}>Detail Penyakit</Text>
                <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'illness'))}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Kebutuhan Khusus</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'special_needs'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Kursi Roda</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'wheelchair'))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Kontak Darurat</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'emergency_contact_name'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Hubungan</Text>
              <Text style={styles.value}>{getRelationshipLabel(safeGet(safeFormData, 'relationship'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>No. Telepon</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'emergency_contact_phone'))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Paket</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Paket Umrah</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'umrah_package'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Metode Pembayaran</Text>
              <Text style={styles.value}>{getPaymentMethodLabel(safeGet(safeFormData, 'payment_method'))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pernah Umrah</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'has_performed_umrah'))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Pernah Haji</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData, 'has_performed_hajj'))}</Text>
            </View>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>INFORMASI PENTING</Text>
            <Text style={styles.noteText}>
              Mohon simpan dokumen ini sebagai bukti pemesanan Anda. Tim kami akan menghubungi Anda
              melalui WhatsApp atau email untuk konfirmasi lebih lanjut mengenai persiapan
              keberangkatan dan dokumen yang diperlukan.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.footer}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 6, fontSize: 10 }}>
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
