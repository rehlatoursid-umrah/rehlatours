import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Register font jika ingin mirip (opsional, default Helvetica sudah cukup bagus)
// Font.register({ family: 'Helvetica', fonts: [...] });

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
  // Tambahan field untuk kompatibilitas jika ada data payment_method
  payment_type?: string
}

// Style yang disesuaikan dengan gaya Rehla Tours Regular (bersih & profesional)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#8B2346', // Warna Merah Marun khas Rehla
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B2346',
    textTransform: 'uppercase',
  },
  companySub: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
  },
  bookingId: {
    fontSize: 10,
    color: '#8B2346',
    fontWeight: 'bold',
    marginTop: 4,
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B2346',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '35%',
    fontSize: 9,
    color: '#666',
    fontWeight: 'bold',
  },
  value: {
    width: '65%',
    fontSize: 9,
    color: '#333',
  },
  // Box Khusus untuk Paket & Pembayaran (Highlight)
  highlightBox: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFF5F7', // Background pink sangat muda
    borderWidth: 1,
    borderColor: '#8B2346',
    borderRadius: 6,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B2346',
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B2346',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
  },
  qrPlaceholder: {
    marginTop: 10,
    alignSelf: 'center',
    width: 60,
    height: 60,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  }
})

export default function HematConfirmationPDF({
  formData,
  bookingId,
}: {
  formData: HematFormData
  bookingId?: string
}) {
  const formatRupiah = (amount: number | string) => {
    return `Rp ${Number(amount || 0)
      .toLocaleString('id-ID')
      .replace(/,/g, '.')}`
  }

  const isTabungan = !formData.payment_type || formData.payment_type === 'tabungan_custom'
  
  const freqLabel = {
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    flexible: 'Fleksibel',
  }[formData.installmentfrequency || ''] || formData.installmentfrequency

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>Rehla Tours & Travel</Text>
            <Text style={styles.companySub}>PT. Arsy Buana Travelindo</Text>
            <Text style={styles.companySub}>hematumrah.rehlatours.id</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>KONFIRMASI PENDAFTARAN</Text>
            <Text style={styles.bookingId}>NO. BOOKING: {bookingId || formData.booking_id || '-'}</Text>
            <Text style={styles.companySub}>Tgl: {formData.submission_date?.split('T')[0]}</Text>
          </View>
        </View>

        {/* DATA JAMAAH */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Data Jamaah</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <Text style={styles.value}>: {formData.name?.toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>No. Identitas (KTP)</Text>
            <Text style={styles.value}>: -</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Jenis Kelamin</Text>
            <Text style={styles.value}>: {formData.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tempat, Tgl Lahir</Text>
            <Text style={styles.value}>: {formData.place_of_birth}, {formData.birth_date?.split('T')[0]}</Text>
          </View>
        </View>

        {/* KONTAK & ALAMAT */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Informasi Kontak</Text>
          <View style={styles.row}>
            <Text style={styles.label}>No. WhatsApp</Text>
            <Text style={styles.value}>: {formData.whatsapp_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>: {formData.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Alamat Domisili</Text>
            <Text style={styles.value}>: {formData.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Kota / Provinsi</Text>
            <Text style={styles.value}>: {formData.city} / {formData.province}</Text>
          </View>
        </View>

        {/* PAKET & PEMBAYARAN (HIGHLIGHT) */}
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>DETAIL PAKET UMRAH</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Nama Paket</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>: {formData.umrahpackage}</Text>
          </View>

          {isTabungan ? (
            <>
              <View style={[styles.row, { marginTop: 5 }]}>
                <Text style={styles.label}>Skema Pembayaran</Text>
                <Text style={styles.value}>: TABUNGAN UMRAH HEMAT</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Frekuensi Setoran</Text>
                <Text style={styles.value}>: {freqLabel}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Catatan</Text>
                <Text style={styles.value}>: {formData.installmentnotes || '-'}</Text>
              </View>
              
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>RENCANA SETORAN:</Text>
                <Text style={styles.priceValue}>{formatRupiah(formData.installmentamount)}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>METODE BAYAR:</Text>
                <Text style={styles.priceValue}>{formData.payment_type?.toUpperCase()}</Text>
              </View>
            </>
          )}
        </View>

        {/* INFO TAMBAHAN */}
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>Catatan Penting:</Text>
          <Text style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>
            1. Dokumen ini adalah bukti pendaftaran awal yang sah.
          </Text>
          <Text style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>
            2. Harap simpan bukti ini untuk keperluan administrasi selanjutnya.
          </Text>
          <Text style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>
            3. Tim kami akan segera menghubungi Anda untuk konfirmasi jadwal dan teknis setoran.
          </Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>PT. Arsy Buana Travelindo | PPIU No. 123 Tahun 2024</Text>
          <Text>Office: Jl. Contoh Alamat Kantor No. 123, Jakarta Selatan</Text>
          <Text style={{ marginTop: 4 }}>www.rehlatours.id | hematumrah.rehlatours.id</Text>
        </View>
      </Page>
    </Document>
  )
}

