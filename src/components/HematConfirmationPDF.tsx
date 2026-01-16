// src/components/HematConfirmationPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// --- 1. Interface untuk Tipe Data ---
// Sesuaikan dengan struktur data di database/form Anda
export interface HematConfirmationData {
  // Data Paket
  bookingId: string;
  tanggalCetak: string;
  paketUmrah: string;
  hargaPaket: number;
  metodePembayaran: string;
  rencanaSetoran: number;
  frekuensiSetoran: string;
  catatanTabungan: string;
  tanggalPendaftaran: string;

  // Informasi Pribadi
  namaLengkap: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  namaAyah: string;
  namaIbu: string;
  jenisKelamin: string;
  statusPernikahan: string;
  pekerjaan: string;

  // Informasi Kontak
  nomorTelepon: string;
  email: string;
  alamatLengkap: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  nomorWhatsApp: string;
  
  // Kontak Darurat
  kontakDaruratNama: string;
  kontakDaruratTelepon: string;
  kontakDaruratHubungan: string;

  // Informasi Paspor
  nomorPaspor: string;
  tanggalTerbitPaspor: string;
  tanggalKadaluarsaPaspor: string;
  tempatTerbitPaspor: string;

  // Informasi Kesehatan
  memilikiPenyakit: boolean;
  kebutuhanKhusus: boolean;
  butuhKursiRoda: boolean;
  detailPenyakit?: string; // Opsional jika ada input teks tambahan

  // Pengalaman Ibadah
  pernahUmrah: boolean;
  pernahHaji: boolean;
}

interface Props {
  data: HematConfirmationData;
}

// --- 2. Styles ---
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#800000', // Maroon
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#800000',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  headerRight: {
    textAlign: 'right',
  },
  logoPlaceholder: {
    width: 100,
    height: 40,
    backgroundColor: '#eee', // Ganti dengan <Image src="..." /> jika ada logo
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#fafafa',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#800000',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  colFull: {
    width: '100%',
  },
  colHalf: {
    width: '50%',
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    width: '60%',
    color: '#000',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkboxLabel: {
    marginLeft: 5,
  },
  checkedBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#800000',
  },
  uncheckedBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#aaa',
    backgroundColor: '#fff',
  },
});

// --- 3. Helper Component untuk Checkbox ---
const CheckboxDisplay = ({ label, checked }: { label: string, checked: boolean }) => (
  <View style={styles.checkboxRow}>
    <View style={checked ? styles.checkedBox : styles.uncheckedBox} />
    <Text style={styles.checkboxLabel}>{label}: {checked ? 'Ya' : 'Tidak'}</Text>
  </View>
);

// --- 4. Helper untuk Format Rupiah ---
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

// --- 5. Main Component ---
const HematConfirmationPDF: React.FC<Props> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Konfirmasi Pendaftaran</Text>
            <Text style={styles.headerSubtitle}>Rehlatours.id - Umrah Hemat & Berkualitas</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>No. Reg: {data.bookingId}</Text>
            <Text>Tanggal: {data.tanggalCetak}</Text>
          </View>
        </View>

        {/* 1. Informasi Paket (Paling Atas karena Penting) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilihan Paket Umrah</Text>
          <View style={styles.row}>
            <View style={styles.colHalf}>
              <View style={styles.row}>
                <Text style={styles.label}>Nama Paket:</Text>
                <Text style={styles.value}>{data.paketUmrah}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Harga:</Text>
                <Text style={styles.value}>{formatRupiah(data.hargaPaket)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tgl Daftar:</Text>
                <Text style={styles.value}>{data.tanggalPendaftaran}</Text>
              </View>
            </View>
            <View style={styles.colHalf}>
              <View style={styles.row}>
                <Text style={styles.label}>Pembayaran:</Text>
                <Text style={styles.value}>{data.metodePembayaran}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Rencana Setoran:</Text>
                <Text style={styles.value}>{formatRupiah(data.rencanaSetoran)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Frekuensi:</Text>
                <Text style={styles.value}>{data.frekuensiSetoran}</Text>
              </View>
            </View>
          </View>
          {data.catatanTabungan && (
             <View style={{ marginTop: 5 }}>
               <Text style={styles.label}>Catatan Rencana Tabungan:</Text>
               <Text style={{ ...styles.value, width: '100%', fontStyle: 'italic' }}>"{data.catatanTabungan}"</Text>
             </View>
          )}
        </View>

        {/* 2. Informasi Pribadi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
          <View style={styles.row}>
            <View style={styles.colHalf}>
              <View style={styles.row}>
                <Text style={styles.label}>Nama Lengkap:</Text>
                <Text style={styles.value}>{data.namaLengkap}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>NIK:</Text>
                <Text style={styles.value}>{data.nik}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tempat/Tgl Lahir:</Text>
                <Text style={styles.value}>{data.tempatLahir}, {data.tanggalLahir}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Jenis Kelamin:</Text>
                <Text style={styles.value}>{data.jenisKelamin}</Text>
              </View>
            </View>
            <View style={styles.colHalf}>
              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>{data.statusPernikahan}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Pekerjaan:</Text>
                <Text style={styles.value}>{data.pekerjaan}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nama Ayah:</Text>
                <Text style={styles.value}>{data.namaAyah}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nama Ibu:</Text>
                <Text style={styles.value}>{data.namaIbu}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Informasi Kontak & Darurat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontak & Alamat</Text>
          <View style={styles.row}>
            <View style={styles.colHalf}>
               <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Kontak Pribadi</Text>
               <View style={styles.row}><Text style={styles.label}>No. HP:</Text><Text style={styles.value}>{data.nomorTelepon}</Text></View>
               <View style={styles.row}><Text style={styles.label}>WhatsApp:</Text><Text style={styles.value}>{data.nomorWhatsApp}</Text></View>
               <View style={styles.row}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{data.email}</Text></View>
               <View style={styles.row}><Text style={styles.label}>Alamat:</Text><Text style={styles.value}>{data.alamatLengkap}</Text></View>
               <View style={styles.row}><Text style={styles.label}>Kota/Prov:</Text><Text style={styles.value}>{data.kota}, {data.provinsi} {data.kodePos}</Text></View>
            </View>
            <View style={styles.colHalf}>
               <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Kontak Darurat</Text>
               <View style={styles.row}><Text style={styles.label}>Nama:</Text><Text style={styles.value}>{data.kontakDaruratNama}</Text></View>
               <View style={styles.row}><Text style={styles.label}>Hubungan:</Text><Text style={styles.value}>{data.kontakDaruratHubungan}</Text></View>
               <View style={styles.row}><Text style={styles.label}>Telepon:</Text><Text style={styles.value}>{data.kontakDaruratTelepon}</Text></View>
            </View>
          </View>
        </View>

        {/* 4. Paspor, Kesehatan & Pengalaman (Digabung agar hemat tempat) */}
        <View style={styles.row}>
          {/* Kolom Kiri: Paspor */}
          <View style={[styles.colHalf, { paddingRight: 5 }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Paspor</Text>
              <View style={styles.row}><Text style={styles.label}>Nomor:</Text><Text style={styles.value}>{data.nomorPaspor}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Tempat Terbit:</Text><Text style={styles.value}>{data.tempatTerbitPaspor}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Tgl Terbit:</Text><Text style={styles.value}>{data.tanggalTerbitPaspor}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Tgl Exp:</Text><Text style={styles.value}>{data.tanggalKadaluarsaPaspor}</Text></View>
            </View>
          </View>

          {/* Kolom Kanan: Kesehatan & Pengalaman */}
          <View style={[styles.colHalf, { paddingLeft: 5 }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kesehatan & Pengalaman</Text>
              
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 2 }}>Riwayat Kesehatan:</Text>
              <CheckboxDisplay label="Penyakit Tertentu" checked={data.memilikiPenyakit} />
              <CheckboxDisplay label="Kebutuhan Khusus" checked={data.kebutuhanKhusus} />
              <CheckboxDisplay label="Kursi Roda" checked={data.butuhKursiRoda} />
              
              <Text style={{ fontSize: 9, fontWeight: 'bold', marginTop: 6 }}>Pengalaman Ibadah:</Text>
              <CheckboxDisplay label="Pernah Umrah" checked={data.pernahUmrah} />
              <CheckboxDisplay label="Pernah Haji" checked={data.pernahHaji} />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Dokumen ini dibuat secara otomatis oleh sistem Rehlatours.id.</Text>
          <Text>Harap simpan dokumen ini sebagai bukti pendaftaran awal Anda.</Text>
        </View>

      </Page>
    </Document>
  );
};

export default HematConfirmationPDF;


