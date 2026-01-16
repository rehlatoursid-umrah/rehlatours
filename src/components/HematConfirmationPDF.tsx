import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

interface HematFormData {
  name: string
  email: string
  phone_number: string
  whatsapp_number: string
  gender: string
  place_of_birth: string
  birth_date: string
  address: string
  city: string
  province: string
  umrahpackage: string
  installmentamount: number | string
  installmentfrequency: string
  installmentnotes: string
  submission_date: string
  booking_id?: string
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
    borderBottom: '2px solid #2E7D32',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
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
    color: '#2E7D32',
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
  tabunganBox: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 8,
    border: '2px solid #4CAF50',
    marginVertical: 15,
  },
  tabunganTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
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

export default function HematConfirmationPDF({
  formData,
  bookingId,
}: {
  formData: HematFormData
  bookingId?: string
}) {
  const freqLabel = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    flexible: 'Fleksibel',
  }[formData.installmentfrequency || ''] || formData.installmentfrequency

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
          <Text style={styles.title}>🕌 KONFIRMASI PENDAFTARAN</Text>
          <Text style={styles.subtitle}>PROGRAM TABUNGAN UMRAH HEMAT</Text>
          {bookingId && (
            <Text style={styles.bookingId}>ID Booking: {bookingId}</Text>
          )}
        </View>

        {/* IDENTITAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. DATA IDENTITAS</Text>
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
          <View style={styles.row}>
            <Text style={styles.label}>Jenis Kelamin:</Text>
            <Text style={styles.value}>
              {formData.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tempat/Tgl Lahir:</Text>
            <Text style={styles.value}>
              {formData.place_of_birth}, {formData.birth_date?.slice(0, 10) || ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Alamat:</Text>
            <Text style={styles.value}>{formData.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Kota/Provinsi:</Text>
            <Text style={styles.value}>{`${formData.city}, ${formData.province}`}</Text>
          </View>
        </View>

        {/* PAKET */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. PAKET UMRAH</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Paket Dipilih:</Text>
            <Text style={styles.value}>{formData.umrahpackage}</Text>
          </View>
        </View>

        {/* TABUNGAN - HIGHLIGHT BESAR */}
        <View style={styles.tabunganBox}>
          <Text style={styles.tabunganTitle}>💰 RENCANA TABUNGAN UMRAH</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nominal Setoran:</Text>
            <Text style={[styles.value, styles.amount]}>
              {formatRupiah(formData.installmentamount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Frekuensi:</Text>
            <Text style={styles.value}>{freqLabel}</Text>
          </View>
          {formData.installmentnotes && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Catatan:</Text>
              <Text style={styles.value}>{formData.installmentnotes}</Text>
            </View>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>Tanggal Submit: {formData.submission_date?.slice(0, 10) || ''}</Text>
          <Text>
            Simpan dokumen ini sebagai bukti pendaftaran. Tim Rehla Tours akan menghubungi
            Anda.
          </Text>
          <Text style={{ marginTop: 10 }}>
            Rehla Tours - Program Tabungan Umrah Hemat | hematumrah.rehlatours.id
          </Text>
        </View>
      </Page>
    </Document>
  )
}
