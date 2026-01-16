import { PDFDownloadLink } from '@react-pdf/renderer'
import HematConfirmationPDF, { HematFormData } from '@/components/HematConfirmationPDF'

// Siapkan data dari form atau database
const formData: HematFormData = {
  namaLengkap: 'Ahmad Sulaiman',
  jenisKelamin: 'Laki-laki',
  tempatLahir: 'Jakarta',
  tglLahir: '1990-05-15',
  namaAyah: 'Sulaiman Hassan',
  namaIbu: 'Nur Azizah',
  statusPernikahan: 'Menikah',
  pekerjaan: 'Karyawan Swasta',
  email: 'ahmad@email.com',
  nomorTelepon: '08123456789',
  whatsapp: '08123456789',
  alamatLengkap: 'Jl. Merdeka No. 123 RT/RW',
  kota: 'Surabaya',
  provinsi: 'Jawa Timur',
  kodePos: '60123',
  namaKontakDarurat: 'Siti Nur',
  hubunganKontak: 'Istri',
  telpKontakDarurat: '08987654321',
  nik: '3501051990051001',
  nomorPaspor: 'A12345678',
  tglPenerbitanPaspor: '2022-01-15',
  tglKadaluarsaPaspor: '2032-01-15',
  tempatPenerbitanPaspor: 'Jakarta',
  memilikiPenyakit: false,
  detailPenyakit: '',
  kebutuhanKhusus: false,
  butuhKursiRoda: false,
  pernahUmrah: true,
  pernahHaji: false,
  paketUmrah: 'Umrah Hemat Juli 2026',
  hargaPaket: 15500000,
  metodePembayaran: 'Cicilan Bulanan',
  rencanaSetoran: 500000,
  frekuensiSetoran: 'Bulanan',
  catatanTabungan: 'Setor setiap tanggal 25',
  tglPendaftaran: '2026-01-16',
}

export default function BookingPage() {
  return (
    <PDFDownloadLink
      document={<HematConfirmationPDF formData={formData} bookingId="HEMAT-2026-001" />}
      fileName={`Konfirmasi-Umrah-${formData.namaLengkap}.pdf`}
    >
      {({ loading }) => (loading ? 'Loading PDF...' : 'Download Konfirmasi PDF')}
    </PDFDownloadLink>
  )
}



