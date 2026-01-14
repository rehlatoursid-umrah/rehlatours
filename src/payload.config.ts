import path from 'path'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

// ====== COLLECTIONS ======
import { Hematumrahdaftar } from './collections/Hematumrahdaftar'
import { UmrahPackage } from './collections/UmrahPackage'

// (opsional) Users kalau kamu pakai auth
// import { Users } from './collections/Users'

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL,
  secret: process.env.PAYLOAD_SECRET || 'PLEASE_SET_PAYLOAD_SECRET',

  db: mongooseAdapter({
    url: process.env.DATABASE_URI || process.env.MONGODB_URI || '',
  }),

  admin: {
    user: 'users', // kalau kamu belum punya collection users, comment baris ini
  },

  editor: lexicalEditor({}),

  collections: [
    // Users, // kalau kamu pakai auth, aktifkan ini juga
    UmrahPackage,
    Hematumrahdaftar,
  ],

  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
})

