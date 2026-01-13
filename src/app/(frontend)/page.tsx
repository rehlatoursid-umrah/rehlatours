// src/app/(frontend)/page.tsx
// Server Component: fetch paket di server, lalu render UmrahForm (client) sebagai child.

import { UmrahForm } from '@/components/umrah-form'
import { getUmrahPackageOptions } from '@/actions/umrahform' // TODO: sesuaikan path sesuai project kamu
import { AlertCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function UmrahFormPage() {
  let packages: any[] = []
  let error: string | null = null

  try {
    const result = await getUmrahPackageOptions()

    if (result?.success && result.data) {
      packages = result.data
    } else {
      error = result?.error || 'Gagal mengambil daftar paket'
      packages = []
    }
  } catch (e) {
    error = 'Terjadi kesalahan saat mengambil daftar paket'
    packages = []
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-8 py-6">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Terjadi Kesalahan
              </h2>
            </div>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Gagal Memuat Data</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => location.reload()}
                  variant="outline"
                  className="flex-1 transition-all duration-200 hover:scale-105"
                >
                  Coba Lagi
                </Button>
                <Button
                  onClick={() => (window.location.href = '/')}
                  className="flex-1 text-white transition-all duration-200 hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
                >
                  Kembali ke Beranda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 py-8 px-4">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
          >
            <Package className="w-8 h-8 text-white" />
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Pendaftaran Umroh
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Daftarkan diri Anda untuk perjalanan spiritual yang tak terlupakan dengan paket umroh
            terbaik kami.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-8 py-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Informasi Penting
                </h2>
              </div>
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Tidak Ada Paket Tersedia
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Saat ini tidak ada paket umroh yang tersedia. Silakan hubungi admin untuk
                  informasi lebih lanjut atau coba lagi nanti.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => location.reload()}
                    variant="outline"
                    className="flex-1 transition-all duration-200 hover:scale-105"
                  >
                    Refresh
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/')}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white transition-all duration-200 hover:scale-105"
                  >
                    Kembali ke Beranda
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <UmrahForm packages={packages as any} />
        )}
      </div>
    </div>
  )
}

