import { CollectionConfig } from 'payload'

export const UmrahFormMinimal: CollectionConfig = {
  slug: 'umrah-form-minimal',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'booking_id', 'status', 'createdAt'],
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
      required: false, // Make it optional to avoid validation issues
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
        { label: 'Diproses', value: 'processing' },
        { label: 'Diterima', value: 'approved' },
        { label: 'Ditolak', value: 'rejected' },
        { label: 'Selesai', value: 'completed' },
      ],
    },
    {
      name: 'name',
      type: 'text',
      required: false,
      label: 'Nama',
    },
    {
      name: 'email',
      type: 'email',
      required: false,
      label: 'Email',
    },
    {
      name: 'phone_number',
      type: 'text',
      required: false,
      label: 'Nomor Telepon',
    },
    {
      name: 'register_date',
      type: 'date',
      required: false,
      label: 'Tanggal Pendaftaran',
    },
    {
      name: 'gender',
      type: 'select',
      required: false,
      label: 'Jenis Kelamin',
      options: [
        { label: 'Laki-Laki', value: 'male' },
        { label: 'Perempuan', value: 'female' },
      ],
    },
    {
      name: 'place_of_birth',
      type: 'text',
      required: false,
      label: 'Tempat Lahir',
    },
    {
      name: 'birth_date',
      type: 'date',
      required: false,
      label: 'Tanggal Lahir',
    },
    {
      name: 'father_name',
      type: 'text',
      required: false,
      label: 'Nama Ayah',
    },
    {
      name: 'mother_name',
      type: 'text',
      required: false,
      label: 'Nama Ibu',
    },
    {
      name: 'address',
      type: 'textarea',
      required: false,
      label: 'Alamat',
    },
    {
      name: 'city',
      type: 'text',
      required: false,
      label: 'Kota',
    },
    {
      name: 'province',
      type: 'text',
      required: false,
      label: 'Provinsi',
    },
    {
      name: 'postal_code',
      type: 'text',
      required: false,
      label: 'Kode Pos',
    },
    {
      name: 'occupation',
      type: 'text',
      required: false,
      label: 'Pekerjaan',
    },
    {
      name: 'specific_disease',
      type: 'checkbox',
      required: false,
      label: 'Penyakit Khusus',
    },
    {
      name: 'illness',
      type: 'textarea',
      required: false,
      label: 'Detail Penyakit',
    },
    {
      name: 'special_needs',
      type: 'checkbox',
      required: false,
      label: 'Kebutuhan Khusus',
    },
    {
      name: 'wheelchair',
      type: 'checkbox',
      required: false,
      label: 'Kursi Roda',
    },
    {
      name: 'nik_number',
      type: 'text',
      required: false,
      label: 'NIK',
    },
    {
      name: 'passport_number',
      type: 'text',
      required: false,
      label: 'Nomor Paspor',
    },
    {
      name: 'date_of_issue',
      type: 'date',
      required: false,
      label: 'Tanggal Terbit Paspor',
    },
    {
      name: 'expiry_date',
      type: 'date',
      required: false,
      label: 'Tanggal Berakhir Paspor',
    },
    {
      name: 'place_of_issue',
      type: 'text',
      required: false,
      label: 'Tempat Terbit Paspor',
    },
    {
      name: 'whatsapp_number',
      type: 'text',
      required: false,
      label: 'WhatsApp',
    },
    {
      name: 'has_performed_umrah',
      type: 'checkbox',
      required: false,
      label: 'Pernah Umrah',
    },
    {
      name: 'has_performed_hajj',
      type: 'checkbox',
      required: false,
      label: 'Pernah Haji',
    },
    {
      name: 'emergency_contact_name',
      type: 'text',
      required: false,
      label: 'Kontak Darurat',
    },
    {
      name: 'relationship',
      type: 'select',
      required: false,
      label: 'Hubungan',
      options: [
        { label: 'Orang Tua', value: 'parents' },
        { label: 'Suami/Istri', value: 'spouse' },
        { label: 'Anak', value: 'children' },
        { label: 'Saudara', value: 'sibling' },
        { label: 'Kerabat', value: 'relative' },
      ],
    },
    {
      name: 'emergency_contact_phone',
      type: 'text',
      required: false,
      label: 'Telepon Kontak Darurat',
    },
    {
      name: 'mariage_status',
      type: 'select',
      required: false,
      label: 'Status Pernikahan',
      options: [
        { label: 'Belum Menikah', value: 'single' },
        { label: 'Menikah', value: 'married' },
        { label: 'Janda/Duda', value: 'divorced' },
      ],
    },
    {
      name: 'umrah_package',
      type: 'relationship',
      relationTo: 'umrah-package',
      hasMany: false,
      required: true,
      label: 'Paket Umrah',
    },
    {
      name: 'payment_method',
      type: 'select',
      required: false,
      label: 'Metode Pembayaran',
      options: [
        { label: 'Lunas', value: 'lunas' },
        { label: 'Cicilan 60%', value: '60_percent' },
      ],
    },
    {
      name: 'terms_of_service',
      type: 'checkbox',
      required: false,
      label: 'Syarat dan Ketentuan',
    },
    {
      name: 'submission_date',
      type: 'date',
      required: false,
      label: 'Tanggal Submit',
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Simple booking ID generation without complex logic
        if (operation === 'create' && !data.booking_id) {
          const timestamp = Date.now().toString().slice(-4)
          data.booking_id = `RT-${timestamp}`
        }
        return data
      },
    ],
      afterChange: [
    async ({ doc, req, operation }) => {
      if (operation === 'create') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://umrah.rehlatours.id'
        await fetch(`${baseUrl}/api/send-file`, ...)
      }
    }
  ]
}

        // Send WhatsApp notification with PDF confirmation for both create and update
        try {
          const phone = doc.whatsapp_number || doc.phone_number
          if (phone) {
            // Prepare booking data for PDF generation
            const bookingData = {
              bookingId: doc.booking_id,
              customerName: doc.name,
              email: doc.email,
              whatsappNumber: doc.whatsapp_number,
              phoneNumber: doc.phone_number,
              packageName: doc.umrah_package?.name || 'Paket Umrah',
              paymentMethod: doc.payment_method === 'lunas' ? 'Lunas' : 'Cicilan 60%',
            }

            // Determine caption based on operation
            const caption =
              operation === 'create'
                ? `Terima kasih atas pemesanan Anda. Berikut adalah konfirmasi pemesanan dengan ID: ${doc.booking_id}`
                : `Update informasi pemesanan Anda dengan ID: ${doc.booking_id}`

            // Create form data for WhatsApp API
            const formData = new FormData()
            formData.append('phone', `${phone}@s.whatsapp.net`)
            formData.append('bookingData', JSON.stringify(bookingData))
            formData.append('caption', caption)
            formData.append('is_forwarded', 'false')
            formData.append('duration', '3600')

            // Send to our API endpoint that generates and sends PDF
            const response = await fetch(`${process.env.BASE_URL}/api/send-file`, {
              method: 'POST',
              body: formData,
              headers: {
                Authorization: `Basic ${Buffer.from('username:password').toString('base64')}`,
              },
            })

            if (response.ok) {
              console.log(
                `PDF confirmation sent via WhatsApp for booking ${doc.booking_id} (${operation})`,
              )
            } else {
              console.error('Failed to send PDF confirmation:', await response.text())
            }
          }
        } catch (error) {
          console.error('Failed to send WhatsApp PDF notification:', error)
        }
      },
    ],
  },
}
