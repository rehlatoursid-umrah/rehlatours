

import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer'

// --- Type Definition ---
export interface HematFormData {
  // Data Pribadi
  namaLengkap: string
  jenisKelamin: string
  tempatLahir: string
  tglLahir: string
  namaAyah: string
  namaIbu: string
  statusPernikahan: string
  pekerjaan: string

  // Informasi Kontak
  email: string
  nomorTelepon: string
  whatsapp: string
  alamatLengkap: string
  kota: string
  provinsi: string
  kodePos: string

  // Kontak Darurat
  namaKontakDarurat: string
  hubunganKontak: string
  telpKontakDarurat: string

  // Informasi Dokumen
  nik: string
  nomorPaspor: string
  tglPenerbitanPaspor: string
  tglKadaluarsaPaspor: string
  tempatPenerbitanPaspor: string

  // Informasi Kesehatan
  memilikiPenyakit: boolean
  detailPenyakit: string
  kebutuhanKhusus: boolean
  butuhKursiRoda: boolean

  // Pengalaman Ibadah
  pernahUmrah: boolean
  pernahHaji: boolean

  // Informasi Paket
  paketUmrah: string
  hargaPaket: number
  metodePembayaran: string
  rencanaSetoran: number
  frekuensiSetoran: string
  catatanTabungan: string
  tglPendaftaran: string
}

// --- Font Registration (Handle errors gracefully) ---
try {
  Font.register({
    family: 'Helvetica',
    fonts: [
      { src: 'Helvetica' },
    ],
  })
  Font.register({
    family: 'Helvetica-Bold',
    fonts: [
      { src: 'Helvetica-Bold' },
    ],
  })
} catch (error) {
  console.warn('Font registration warning:', error)
}

// --- Styles (Matching umrah.rehlatours.id design) ---
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

// --- Helper Functions ---
const safeGet = (value: any, defaultValue: any = '-'): any => {
  if (value === null || value === undefined || value === '') return defaultValue
  return value
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

const formatCurrency = (value: number | string): string => {
  if (!value) return '-'
  const num = typeof value === 'string' ? parseInt(value) : value
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num)
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (typeof value === 'string') return value
  return String(value)
}

// --- Component Props ---
interface ConfirmationPDFProps {
  formData: HematFormData
  bookingId: string
}

// --- Main Component ---
export default function HematConfirmationPDF({ formData, bookingId }: ConfirmationPDFProps) {
  const safeFormData = formData || {}
  const safeBookingId = bookingId || `HEMAT-${Date.now()}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <Image
            style={styles.logo}
            src="https://raw.githubusercontent.com/rehlatoursid-umrah/rehlatours/refs/heads/main/public/rehla.png"
          />

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>KONFIRMASI PEMESANAN</Text>
            <Text style={styles.subtitle}>Rehla Indonesia Tours & Travel</Text>
            <Text style={[styles.subtitle, { fontSize: 10, marginTop: 2, opacity: 0.9 }]}>
              www.rehlatours.id
            </Text>
          </View>
        </View>

        {/* ===== CONTENT ===== */}
        <View style={styles.content}>
          <Text style={styles.bookingId}>ID Pemesanan: {safeBookingId}</Text>

          {/* ===== 1. INFORMASI PRIBADI ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Pribadi</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.namaLengkap))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Jenis Kelamin</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.jenisKelamin))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tempat Lahir</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.tempatLahir))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Lahir</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData.tglLahir, ''))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama Ayah</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.namaAyah))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama Ibu</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.namaIbu))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status Pernikahan</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.statusPernikahan))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Pekerjaan</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.pekerjaan))}</Text>
            </View>
          </View>

          {/* ===== 2. INFORMASI KONTAK ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Kontak</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.email))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>No. Telepon</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.nomorTelepon))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>WhatsApp</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.whatsapp))}</Text>
            </View>
          </View>

          {/* ===== 3. INFORMASI ALAMAT ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Alamat</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Alamat</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.alamatLengkap))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Kota</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.kota))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Provinsi</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.provinsi))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Kode Pos</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.kodePos))}</Text>
            </View>
          </View>

          {/* ===== 4. INFORMASI DOKUMEN ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Dokumen</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>NIK</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.nik))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>No. Paspor</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.nomorPaspor))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Terbit</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData.tglPenerbitanPaspor, ''))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tanggal Berakhir</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData.tglKadaluarsaPaspor, ''))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Tempat Terbit</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.tempatPenerbitanPaspor))}</Text>
            </View>
          </View>

          {/* ===== 5. INFORMASI KESEHATAN ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Kesehatan</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Penyakit Khusus</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.memilikiPenyakit))}</Text>
            </View>
            {safeFormData.memilikiPenyakit && safeFormData.detailPenyakit && (
              <View style={styles.row}>
                <Text style={styles.label}>Detail Penyakit</Text>
                <Text style={styles.value}>{formatValue(safeGet(safeFormData.detailPenyakit))}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Kebutuhan Khusus</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.kebutuhanKhusus))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Kursi Roda</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.butuhKursiRoda))}</Text>
            </View>
          </View>

          {/* ===== 6. PENGALAMAN IBADAH ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pengalaman Ibadah</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pernah Umrah</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.pernahUmrah))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Pernah Haji</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.pernahHaji))}</Text>
            </View>
          </View>

          {/* ===== 7. KONTAK DARURAT ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Kontak Darurat</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nama</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.namaKontakDarurat))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Hubungan</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.hubunganKontak))}</Text>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>No. Telepon</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.telpKontakDarurat))}</Text>
            </View>
          </View>

          {/* ===== 8. INFORMASI PAKET ===== */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Informasi Paket Umrah Hemat</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Paket Umrah</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.paketUmrah))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Harga Paket</Text>
              <Text style={styles.value}>{formatCurrency(safeGet(safeFormData.hargaPaket, 0))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Metode Pembayaran</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.metodePembayaran))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Rencana Setoran</Text>
              <Text style={styles.value}>{formatCurrency(safeGet(safeFormData.rencanaSetoran, 0))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Frekuensi Setoran</Text>
              <Text style={styles.value}>{formatValue(safeGet(safeFormData.frekuensiSetoran))}</Text>
            </View>
            {safeFormData.catatanTabungan && (
              <View style={styles.row}>
                <Text style={styles.label}>Catatan Tabungan</Text>
                <Text style={styles.value}>{formatValue(safeGet(safeFormData.catatanTabungan))}</Text>
              </View>
            )}
            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Tanggal Pendaftaran</Text>
              <Text style={styles.value}>{formatDate(safeGet(safeFormData.tglPendaftaran, ''))}</Text>
            </View>
          </View>

          {/* ===== NOTE BOX ===== */}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>INFORMASI PENTING</Text>
            <Text style={styles.noteText}>
              Mohon simpan dokumen ini sebagai bukti pemesanan Anda. Tim kami akan menghubungi Anda
              melalui WhatsApp atau email untuk konfirmasi lebih lanjut mengenai persiapan
              keberangkatan dan dokumen yang diperlukan.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ===== FOOTER ===== */}
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
