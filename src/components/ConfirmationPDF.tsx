'use client'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface FormData {
  name: string
  email: string
  phone_number: string
  whatsapp_number: string
  umrahpackage: string
  payment_method?: string
  payment_type?: string
  installmentamount?: string | number
  installmentfrequency?: string
  booking_id?: string
  // Kompatibel hemat fields
  city?: string
  province?: string
  address?: string
  submission_date?: string
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 12,
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2px solid #1976D2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  bookingId: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
    textDecoration: 'underline',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: '5px 0',
  },
  label: { fontWeight: 600, color: '#333', width: '40%' },
  value: { color: '#000', width: '55%', textAlign: 'right' },
  paymentBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    border: '2px solid #2196F3',
    marginVertical: 15,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
    textAlign: 'center',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #DDD',
    textAlign: 'center',
    fontSize: 10,
    color: '#888',
  },
})

export default function ConfirmationPDF({
  formData,
  bookingId,
}: {
  formData: FormData
  bookingId?: string
}) {
  // Kompatibel hemat/regular
  const isHemat = formData.payment_type === 'tabungan_custom' || bookingId?.startsWith('HU-')
  const paymentTitle = isHemat 
    ? 'Rencana Tabungan' 
    : 'Metode Pembayaran'
  
  const paymentMethod = formData.payment_method || formData.payment_type || 'Belum ditentukan'
  const amount = formData.installmentamount || '0'
  
  const formatRupiah = (amount: number | string) => {
    return `Rp ${Number(amount)
      .toLocaleString('id-ID')
      .replace(/,/g, '.')}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>✈️ KONFIRMASI PENDAFTARAN UMRAH</Text>
          <Text style={styles.subtitle}>
            {isHemat ? 'Program Tabungan Hemat' : 'Pendaftaran Langsung'}
          </Text>
          {bookingId && (
            <Text style={styles.bookingId}>ID Booking: {bookingId}</Text>
          )}
        </View>

        {/* IDENTITAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. DATA PELANGGAN</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Lengkap:</Text>
            <Text style={styles.value}>{formData.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{formData.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>WhatsApp:</Text>
            <Text style={styles.value}>{formData.whatsapp_number}</Text>
          </View>
          {formData.city && (
            <View style={styles.row}>
              <Text style={styles.label}>Lokasi:</Text>
              <Text style={styles.value}>{`${formData.city}, ${formData.province}`}</Text>
            </View>
          )}
        </View>

        {/* PAKET */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. PAKET UMRAH</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Paket Dipilih:</Text>
            <Text style={styles.value}>{formData.umrahpackage}</Text>
          </View>
        </View>

        {/* PEMBAYARAN - UNIVERSAL */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>💳 {paymentTitle}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Metode:</Text>
            <Text style={styles.value}>{paymentMethod}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nominal:</Text>
            <Text style={[styles.value, styles.amount]}>
              {formatRupiah(amount)}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>Tanggal: {formData.submission_date?.slice(0, 10) || new Date().toISOString().slice(0, 10)}</Text>
          <Text>
            Terima kasih telah mempercayakan perjalanan ibadah Anda kepada Rehla Tours.
          </Text>
          <Text style={{ marginTop: 10 }}>
            Rehla Tours | umrah.rehlatours.id | WhatsApp: 62xxxxxxxxx
          </Text>
        </View>
      </Page>
    </Document>
  )
}
