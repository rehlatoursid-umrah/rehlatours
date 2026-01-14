import path from 'path'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

// ====== COLLECTIONS ======
import { Admins } from './collections/Admins'
import { Hematumrahdaftar } from './collections/Hematumrahdaftar'
import { UmrahPackage } from './collections/UmrahPackage'

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL,
  secret: process.env.PAYLOAD_SECRET || 'PLEASE_SET_PAYLOAD_SECRET',

  db: mongooseAdapter({
    url: process.env.DATABASE_URI || process.env.MONGODB_URI || '',
  }),

  admin: {
    user: 'admins',
  },

  editor: lexicalEditor({}),

  collections: [
    Admins,
    UmrahPackage,
    Hematumrahdaftar,
  ],

  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
})


