'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Home,
  Download,
  Share2,
  Sparkles,
  Heart,
  Star,
  Gift,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

interface SubmissionData {
  id: string
  booking_id: string
  name: string
  message: string
}

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)

  // Custom animation styles
  const fadeInUpKeyframes = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out;
    }
  `

  useEffect(() => {
    // Get data dari URL params
    const id = searchParams.get('id')
    const booking_id = searchParams.get('booking_id')
    const name = searchParams.get('name')
    const message = searchParams.get('message')

    if (id && booking_id && name && message) {
      setSubmissionData({
        id,
        booking_id,
        name,
        message: decodeURIComponent(message),
      })

      // Animated sequence
      setTimeout(() => setAnimationStep(1), 500)
      setTimeout(() => setAnimationStep(2), 1000)
      setTimeout(() => setShowConfetti(true), 1500)

      // Show success toast with delay
      setTimeout(() => {
        toast.success('🎉 Pendaftaran Berhasil!', {
          description: `Booking ID: ${booking_id} telah tersimpan`,
          duration: 6000,
          action: {
            label: 'Tutup',
            onClick: () => toast.dismiss(),
          },
        })
      }, 2000)
    } else {
      // Jika tidak ada data, redirect ke home
      router.push('/')
    }

    setIsLoading(false)
  }, [searchParams, router])

  const handleShare = async () => {
    const shareData = {
      title: '🕌 Pendaftaran Umroh Berhasil - Alhamdulillah!',
      text: `Alhamdulillah! Pendaftaran umroh saya telah berhasil dengan Booking ID: ${submissionData?.booking_id}. Semoga Allah SWT mudahkan langkah selanjutnya. 🤲`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        toast.success('🎉 Berhasil dibagikan!', {
          description: 'Terima kasih telah membagikan kabar baik ini',
          duration: 3000,
        })
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.log('Error sharing:', err)
          // Fallback to clipboard
          navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`)
          toast.success('📋 Link disalin ke clipboard!', {
            description: 'Anda bisa paste di media sosial favorit',
          })
        }
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`)
      toast.success('📋 Link disalin ke clipboard!', {
        description: 'Anda bisa paste di media sosial favorit',
        duration: 4000,
      })
    }
  }

  const handleDownloadReceipt = () => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => resolve('success'), 2000)
      }),
      {
        loading: '📄 Mempersiapkan receipt...',
        success: '✅ Receipt siap! Fitur download akan segera tersedia',
        error: '❌ Gagal mempersiapkan receipt',
      },
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div
              className="animate-spin rounded-full h-16 w-16 border-4 mx-auto mb-6"
              style={{ borderColor: '#3a051940', borderTopColor: '#3a0519' }}
            ></div>
            <div
              className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 opacity-20"
              style={{ borderColor: '#3a051960' }}
            ></div>
          </div>
          <p className="text-gray-600 text-lg font-medium animate-pulse">
            Memuat halaman sukses...
          </p>
          <div className="mt-4 flex justify-center space-x-1">
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#3a0519' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#3a0519', animationDelay: '0.1s' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#3a0519', animationDelay: '0.2s' }}
            ></div>
          </div>
        </div>
      </div>
    )
  }

  if (!submissionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data tidak ditemukan</h3>
            <p className="text-gray-600 mb-4">Halaman ini tidak dapat diakses secara langsung.</p>
            <Button onClick={() => router.push('/')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div
          className="absolute top-1/2 -right-4 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute -bottom-8 left-1/2 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>
      <div className="max-w-4xl mx-auto relative z-20">
        {/* Header Success Animation */}
        <div className="text-center mb-8">
          <div
            className={`relative inline-flex items-center justify-center transform transition-all duration-1000 ${animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          >
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl relative"
              style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
            >
              <CheckCircle className="w-16 h-16 text-white" />
              {animationStep >= 2 && (
                <div
                  className="absolute inset-0 rounded-full border-4 animate-ping"
                  style={{ borderColor: '#3a051980' }}
                ></div>
              )}
            </div>
            <div
              className="absolute -top-4 -right-4 animate-bounce"
              style={{ animationDelay: '1s' }}
            >
              <Sparkles className="w-10 h-10 text-yellow-500" />
            </div>
            <div
              className="absolute -bottom-2 -left-4 animate-bounce"
              style={{ animationDelay: '1.5s' }}
            >
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
          </div>

          <div
            className={`transform transition-all duration-1000 delay-500 ${animationStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
          >
            {/* --- FIX ICON START --- */}
            <h1 className="text-5xl md:text-6xl font-bold mb-4 flex items-center justify-center gap-3">
              <span
                style={{
                  background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Alhamdulillah!
              </span>
              {/* Emoji dipisah supaya tidak kena style gradient text */}
              <span className="text-5xl md:text-6xl text-yellow-500 drop-shadow-sm">🤲</span>
            </h1>
            {/* --- FIX ICON END --- */}

            <p className="text-2xl text-gray-600 mb-4 font-medium">
              Pendaftaran Umroh Anda Berhasil
            </p>
            <div className="flex justify-center">
              <Badge
                variant="secondary"
                className="px-6 py-2 text-lg border"
                style={{
                  background: 'linear-gradient(135deg, #3a051920 0%, #5d1f3520 100%)',
                  color: '#3a0519',
                  borderColor: '#3a051960',
                }}
              >
                <Heart className="w-5 h-5 mr-2" />
                Semoga diterima di sisi Allah SWT
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Success Card */}
        <div
          className={`transform transition-all duration-1000 delay-700 ${animationStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
        >
          <Card
            className="mb-8 shadow-2xl bg-white/80 backdrop-blur-sm p-0"
            style={{ borderColor: '#3a051940' }}
          >
            <CardHeader
              className="text-white py-5 rounded-t-lg relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <CardTitle className="text-xl flex items-center relative z-10">
                Detail Pendaftaran
              </CardTitle>
              <CardDescription className="text-emerald-50 relative z-10">
                Simpan informasi berikut untuk referensi Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="group hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                        style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
                      >
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Booking ID</p>
                        <p className="font-bold text-xl tracking-wide" style={{ color: '#3a0519' }}>
                          {submissionData.booking_id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="group hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Nama Pendaftar</p>
                        <p className="font-semibold text-lg">{submissionData.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="group hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-4">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Tanggal Pendaftaran</p>
                        <p className="font-semibold">
                          {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="p-8 rounded-xl border relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #3a051910 0%, #5d1f3510 100%)',
                    borderColor: '#3a051940',
                  }}
                >
                  <div
                    className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-10 translate-x-10 opacity-20"
                    style={{ backgroundColor: '#3a051930' }}
                  ></div>
                  <div
                    className="absolute bottom-0 left-0 w-16 h-16 rounded-full translate-y-8 -translate-x-8 opacity-20"
                    style={{ backgroundColor: '#5d1f3530' }}
                  ></div>

                  <h3
                    className="font-semibold mb-4 flex items-center text-xl"
                    style={{ color: '#3a0519' }}
                  >
                    <Heart className="w-6 h-6 mr-2" />
                    Pesan untuk Anda
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                    {submissionData.message}
                  </p>
                  <div
                    className="text-sm p-4 rounded-lg border-l-4 relative"
                    style={{
                      color: '#3a0519',
                      backgroundColor: '#3a051920',
                      borderLeftColor: '#3a0519',
                    }}
                  >
                    <div className="flex items-start">
                      <Clock className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Info Penting:</strong> Tim kami akan segera menghubungi Anda dalam
                        1x24 jam untuk konfirmasi lebih lanjut dan panduan selanjutnya.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div
          className={`transform transition-all duration-1000 delay-1000 ${animationStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Button
              onClick={handleShare}
              variant="outline"
              className="group flex items-center justify-center h-14 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 bg-white/80 backdrop-blur-sm"
              style={{
                borderColor: '#3a051960',
                color: '#3a0519',
              }}
            >
              <Share2 className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
              Bagikan Kabar Baik
            </Button>

            <Button
              onClick={() => router.push('/')}
              className="group flex items-center justify-center h-14 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)',
                border: 'none',
              }}
            >
              <Home className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
              Kembali ke Beranda
            </Button>
          </div>
        </div>

        {/* Next Steps Info */}
        <div
          className={`transform transition-all duration-1000 delay-1200 ${animationStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          <Card
            className="mb-8 shadow-lg bg-white/80 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, #3a051910 0%, #5d1f3510 100%)',
              borderColor: '#3a051940',
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center text-xl" style={{ color: '#3a0519' }}>
                <MapPin className="w-6 h-6 mr-2" style={{ color: '#3a0519' }} />
                Langkah Selanjutnya
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div
                  className="group hover:scale-105 transition-all duration-300 relative overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, #3a051930 0%, #5d1f3530 100%)' }}
                  ></div>
                  <div
                    className="flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 relative z-10"
                    style={{ backgroundColor: '#3a051920', border: '1px solid #3a051940' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transform group-hover:scale-110 transition-transform duration-300 relative"
                      style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
                    >
                      1
                      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                    <div>
                      <h4
                        className="font-semibold mb-2 transition-colors duration-300"
                        style={{ color: '#3a0519' }}
                      >
                        Menunggu Konfirmasi
                      </h4>
                      <p
                        className="text-sm leading-relaxed transition-colors duration-300"
                        style={{ color: '#3a0519' }}
                      >
                        Tim kami akan menghubungi Anda untuk verifikasi data dan informasi tambahan
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  className="group hover:scale-105 transition-all duration-300 relative overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, #3a051930 0%, #5d1f3530 100%)' }}
                  ></div>
                  <div
                    className="flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 relative z-10"
                    style={{ backgroundColor: '#3a051920', border: '1px solid #3a051940' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transform group-hover:scale-110 transition-transform duration-300 relative"
                      style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
                    >
                      2
                      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                    <div>
                      <h4
                        className="font-semibold mb-2 transition-colors duration-300"
                        style={{ color: '#3a0519' }}
                      >
                        Pembayaran
                      </h4>
                      <p
                        className="text-sm leading-relaxed transition-colors duration-300"
                        style={{ color: '#3a0519' }}
                      >
                        Ikuti instruksi pembayaran yang akan diberikan sesuai paket yang dipilih
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  className="group hover:scale-105 transition-all duration-300 relative overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, #3a051930 0%, #5d1f3530 100%)' }}
                  ></div>
                  <div
                    className="flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 relative z-10"
                    style={{ backgroundColor: '#3a051920', border: '1px solid #3a051940' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transform group-hover:scale-110 transition-transform duration-300 relative"
                      style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
                    >
                      3
                      <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </div>
                    <div>
                      <h4
                        className="font-semibold mb-2 transition-colors duration-300"
                        style={{ color: '#3a0519' }}
                      >
                        Persiapan Keberangkatan
                      </h4>
                      <p
                        className="text-sm leading-relaxed transition-colors duration-300"
                        style={{ color: '#3a0519' }}
                      >
                        Persiapkan dokumen dan perlengkapan umroh sesuai panduan yang diberikan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <div
          className={`transform transition-all duration-1000 delay-1400 ${animationStep >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          <Card
            className="shadow-lg bg-white/80 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, #3a051910 0%, #5d1f3510 100%)',
              borderColor: '#3a051940',
            }}
          >
            <CardContent className="p-8">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
                >
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold mb-3 text-xl" style={{ color: '#3a0519' }}>
                  Butuh Bantuan?
                </h3>
                <p className="mb-6 text-lg" style={{ color: '#3a0519' }}>
                  Tim customer service kami siap membantu Anda 24/7
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    className="group transition-all duration-300 hover:scale-105"
                    style={{ borderColor: '#3a051960', color: '#3a0519' }}
                    onClick={() => window.open('https://wa.me/6281234567890', '_blank')}
                  >
                    <Phone className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    WhatsApp: +62 831-9732-1658
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="group transition-all duration-300 hover:scale-105"
                    style={{ borderColor: '#3a051960', color: '#3a0519' }}
                    onClick={() => window.open('mailto:info@rehlatours.com', '_blank')}
                  >
                    <Mail className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    Email: info@rehlatours.com
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div
              className="animate-spin rounded-full h-16 w-16 border-4 mx-auto mb-6"
              style={{ borderColor: '#3a051940', borderTopColor: '#3a0519' }}
            ></div>
            <div
              className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 opacity-20"
              style={{ borderColor: '#3a051960' }}
            ></div>
          </div>
          <p className="text-gray-600 text-lg font-medium animate-pulse">
            Memuat halaman sukses...
          </p>
          <div className="mt-4 flex justify-center space-x-1">
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#3a0519' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#3a0519', animationDelay: '0.1s' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: '#3a0519', animationDelay: '0.2s' }}
            ></div>
          </div>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  )
}

