import { CollectionConfig } from 'payload'

export const Hematumrahdaftar: CollectionConfig = {
  slug: 'hemat-umrah-daftar', // Nama slug database (tabel)
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'booking_id', 'status', 'installment_amount', 'createdAt'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'booking_id',
      type: 'text',
      required: false, // Digenerate otomatis di hooks
      label: 'ID Pemesanan',
    },
    {
      name: 'status',
      type: 'select',
      required: false,
      label: 'Status Pendaftaran',
      defaultValue: 'pending_review',
      options: [
        { label: 'Menunggu Review', value: 'pending_review' },
        { label: 'Aktif Menabung', value: 'active_saving' }, // Status khusus tabungan
        { label: 'Lunas', value: 'completed' },
        { label: 'Dibatalkan', value: 'cancelled' },
      ],
    },
    // --- DATA PRIBADI (Sama dengan form lama) ---
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nama Lengkap',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'Email',
    },
    {
      name: 'phone_number',
      type: 'text',
      required: true,
      label: 'Nomor Telepon',
    },
    {
      name: 'whatsapp_number',
      type: 'text',
      required: true,
      label: 'WhatsApp',
    },
    {
      name: 'gender',
      type: 'select',
      required: true,
      label: 'Jenis Kelamin',
      options: [
        { label: 'Laki-Laki', value: 'male' },
        { label: 'Perempuan', value: 'female' },
      ],
    },
    {
      name: 'place_of_birth',
      type: 'text',
      required: true,
      label: 'Tempat Lahir',
    },
    {
      name: 'birth_date',
      type: 'date',
      required: true,
      label: 'Tanggal Lahir',
    },
    {
      name: 'address',
      type: 'textarea',
      required: true,
      label: 'Alamat Lengkap',
    },
    {
      name: 'city',
      type: 'text',
      required: true,
      label: 'Kota',
    },
    {
      name: 'province',
      type: 'text',
      required: true,
      label: 'Provinsi',
    },
    
    // --- HUBUNGAN PAKET (Tetap ada biar tau dia mau paket apa) ---
    {
      name: 'umrah_package',
      type: 'relationship',
      relationTo: 'umrah-package',
      hasMany: false,
      required: true,
      label: 'Paket Umrah yang Diminati',
    },

    // --- BAGIAN BARU: TABUNGAN / CICILAN CUSTOM ---
    {
      name: 'payment_type',
      type: 'select',
      required: true,
      defaultValue: 'tabungan_custom',
      label: 'Tipe Pembayaran',
      options: [
        { label: 'Tabungan Umrah (Custom)', value: 'tabungan_custom' },
      ],
      admin: {
        readOnly: true, // Biar admin tau ini pasti tabungan
      }
    },
    {
      name: 'installment_amount',
      type: 'number',
      required: true,
      label: 'Rencana Setoran (Rupiah)',
      admin: {
        description: 'Nominal yang akan disetor customer secara rutin',
      }
    },
    {
      name: 'installment_frequency',
      type: 'select',
      required: true,
      label: 'Frekuensi Setoran',
      options: [
        { label: 'Harian', value: 'daily' },
        { label: 'Mingguan', value: 'weekly' },
        { label: 'Bulanan', value: 'monthly' },
        { label: 'Fleksibel (Semaunya)', value: 'flexible' },
      ],
    },
    {
      name: 'installment_notes',
      type: 'textarea',
      required: false,
      label: 'Catatan Rencana Tabungan',
      admin: {
        description: 'Contoh: Saya akan setor setiap tanggal 25 setelah gajian',
      }
    },

    // --- LOG DATA (Timestamp) ---
    {
      name: 'submission_date',
      type: 'date',
      required: false,
      label: 'Tanggal Submit',
      defaultValue: () => new Date().toISOString(),
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Generate booking ID khusus Hemat Umrah (Kode HU-)
        if (operation === 'create' && !data.booking_id) {
          const timestamp = Date.now().toString().slice(-5)
          data.booking_id = `HU-${timestamp}` // HU = Hemat Umrah
        }
        return data
      },
    ],
  },
}
