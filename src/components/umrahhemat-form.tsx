'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'

import {
  Calendar as CalendarIcon,
  User,
  MapPin,
  Heart,
  FileText,
  Phone,
  AlertTriangle,
  Package,
  CreditCard,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { UmrahPackage } from '@/payload-types'
import { submitHematUmrahForm } from '@/actions/services'

interface UmrahFormProps {
  packages: UmrahPackage[]
  isSubmitting?: boolean
}

const FormSection = ({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: any
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) => (
  <div className={cn('group relative form-section', className)}>
    <div className="lg:absolute lg:inset-0 lg:bg-gradient-to-r lg:from-rose-50/30 lg:via-white lg:to-pink-50/30 lg:rounded-2xl lg:blur-xl lg:opacity-50 group-hover:lg:opacity-70 transition-all duration-500"></div>
    <div className="relative">
      <div className="flex items-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mr-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="lg:bg-white/80 lg:backdrop-blur-sm lg:rounded-2xl lg:p-6 lg:border lg:border-gray-200/50 lg:shadow-lg lg:hover:shadow-xl transition-all duration-300">
        {children}
      </div>
    </div>
  </div>
)

const FormField = ({
  label,
  error,
  children,
  required = false,
}: {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) => (
  <div className="space-y-3 group">
    <Label className="text-sm font-semibold text-gray-800 flex items-center">
      {label}
      {required && <span className="text-red-500 ml-1 animate-pulse">*</span>}
    </Label>
    <div className="relative">
      {children}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-rose-100/0 via-pink-100/20 to-rose-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
    {error && (
      <p className="text-sm text-red-500 flex items-center bg-red-50/50 rounded-md p-2 border border-red-200/50">
        <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
)

type HematFormValues = {
  // minimal sesuai submitHematUmrahForm + collection
  name?: string
  email?: string
  phone_number?: string
  whatsapp_number?: string
  gender?: 'male' | 'female'
  place_of_birth?: string
  birth_date?: Date
  address?: string
  city?: string
  province?: string
  umrah_package?: string // IMPORTANT: paket ID
  installment_amount?: number
  installment_frequency?: 'daily' | 'weekly' | 'monthly' | 'flexible'
  installment_notes?: string
  terms_of_service?: boolean

  // field ekstra (masih ada di UI lama) – aman, server action akan ambil yang perlu saja
  nik_number?: string
  father_name?: string
  mother_name?: string
  mariage_status?: string
  occupation?: string
  postal_code?: string
  emergency_contact_name?: string
  relationship?: string
  emergency_contact_phone?: string
  passport_number?: string
  date_of_issue?: Date
  expiry_date?: Date
  place_of_issue?: string
  specific_disease?: boolean
  illness?: string
  special_needs?: boolean
  wheelchair?: boolean
  has_performed_umrah?: boolean
  has_performed_hajj?: boolean
  register_date?: Date
}

export function UmrahForm({ packages, isSubmitting = false }: UmrahFormProps) {
  const [showIllnessField, setShowIllnessField] = useState(false)
  const [showRegisterCalendar, setShowRegisterCalendar] = useState(false)
  const [showBirthCalendar, setShowBirthCalendar] = useState(false)
  const [showIssueCalendar, setShowIssueCalendar] = useState(false)
  const [showExpiryCalendar, setShowExpiryCalendar] = useState(false)

  const form = useForm<HematFormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      specific_disease: false,
      special_needs: false,
      wheelchair: false,
      has_performed_umrah: false,
      has_performed_hajj: false,
      terms_of_service: false,

      installment_amount: undefined,
      installment_frequency: undefined,
      installment_notes: '',
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    clearErrors,
    formState: { errors, isValid, isSubmitting: formIsSubmitting },
  } = form

  const watchSpecificDisease = watch('specific_disease')
  const watchSpecialNeeds = watch('special_needs')
  const watchWheelchair = watch('wheelchair')
  const watchHasPerformedUmrah = watch('has_performed_umrah')
  const watchHasPerformedHajj = watch('has_performed_hajj')
  const watchRegisterDate = watch('register_date')
  const watchBirthDate = watch('birth_date')
  const watchDateOfIssue = watch('date_of_issue')
  const watchExpiryDate = watch('expiry_date')
  const watchTermsOfService = watch('terms_of_service')

  useEffect(() => {
    setShowIllnessField(!!watchSpecificDisease)
    if (!watchSpecificDisease) setValue('illness', undefined)
  }, [watchSpecificDisease, setValue])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.calendar-container') && !target.closest('[role="dialog"]')) {
        setShowBirthCalendar(false)
        setShowRegisterCalendar(false)
        setShowIssueCalendar(false)
        setShowExpiryCalendar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const onSubmitHandler = handleSubmit(async (data) => {
    try {
      clearErrors()

      const result = await submitHematUmrahForm(data)

      if (!result.success) {
        toast.error('Submission Gagal', {
          description: (result.errors && result.errors.join(', ')) || result.error || 'Terjadi kesalahan',
          duration: 6000,
        })
        return
      }

      toast.success('Pendaftaran Berhasil!', {
        description: result.data?.message || 'Pendaftaran Anda telah diterima.',
        duration: 3000,
      })

      form.reset()

      setTimeout(() => {
        const id = result.data?.id || ''
        const bookingId = result.data?.booking_id || 'N/A'
        const name = data.name || 'Guest'
        const message = result.data?.message || 'Pendaftaran Anda telah diterima.'

        const encodedMessage = encodeURIComponent(message)
        const encodedName = encodeURIComponent(name)

        window.location.href = `/success?id=${id}&booking_id=${bookingId}&name=${encodedName}&message=${encodedMessage}`
      }, 1200)
    } catch (error) {
      toast.error('Error Tak Terduga', {
        description: error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga',
        duration: 6000,
      })
    }
  })

  const refreshValidation = async () => {
    await trigger()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 py-8 px-2 sm:px-4 md:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-rose-100/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-pink-100/20 via-transparent to-transparent"></div>

      <div className="max-w-6xl mx-auto relative z-10 lg:max-w-4xl">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-gray-100/50 hover:shadow-3xl transition-all duration-500 relative lg:bg-white/95 lg:backdrop-blur-sm lg:rounded-3xl lg:shadow-2xl lg:border lg:border-gray-100/50 lg:hover:shadow-3xl">
          <form onSubmit={onSubmitHandler} className="p-4 sm:p-6 md:p-8 lg:p-12 space-y-12">
            {/* Personal Information */}
            <FormSection
              icon={User}
              title="Informasi Pribadi"
              description="Masukkan data diri Anda sesuai dengan dokumen resmi"
              className="personal-info-section"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Nama Lengkap" error={(errors as any).name?.message} required>
                  <Input
                    {...register('name')}
                    placeholder="Contoh: Ahmad Sulaiman"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField
                  label="NIK (Nomor Induk Kependudukan)"
                  error={(errors as any).nik_number?.message}
                  required
                >
                  <Input
                    {...register('nik_number')}
                    placeholder="16 digit NIK"
                    maxLength={16}
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Tempat Lahir" error={(errors as any).place_of_birth?.message} required>
                  <Input
                    {...register('place_of_birth')}
                    placeholder="Contoh: Jakarta"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Tanggal Lahir" error={(errors as any).birth_date?.message} required>
                  <div className="relative calendar-container">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300',
                        !watchBirthDate && 'text-muted-foreground',
                      )}
                      onClick={() => {
                        setShowBirthCalendar(!showBirthCalendar)
                        setShowRegisterCalendar(false)
                        setShowIssueCalendar(false)
                        setShowExpiryCalendar(false)
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchBirthDate ? format(watchBirthDate, 'dd/MM/yyyy') : 'Pilih tanggal lahir'}
                    </Button>

                    {showBirthCalendar && (
                      <div className="calendar-popup absolute top-full left-0 mt-1 z-[9999] bg-white border-2 border-rose-200 rounded-xl shadow-2xl p-4 min-w-[300px] transform translate-x-0">
                        <Calendar
                          mode="single"
                          selected={watchBirthDate}
                          onSelect={(date) => {
                            if (date) {
                              setValue('birth_date', date, { shouldValidate: true })
                              setShowBirthCalendar(false)
                            }
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="rounded-lg"
                          captionLayout="dropdown"
                          fromYear={1940}
                          toYear={new Date().getFullYear()}
                        />
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Nama Ayah" error={(errors as any).father_name?.message} required>
                  <Input
                    {...register('father_name')}
                    placeholder="Masukkan nama ayah"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Nama Ibu" error={(errors as any).mother_name?.message} required>
                  <Input
                    {...register('mother_name')}
                    placeholder="Masukkan nama ibu"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Jenis Kelamin" error={(errors as any).gender?.message} required>
                  <Select onValueChange={(value) => setValue('gender', value as any, { shouldValidate: true })}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300">
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Status Pernikahan" error={(errors as any).mariage_status?.message} required>
                  <Select onValueChange={(value) => setValue('mariage_status', value as any)}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300">
                      <SelectValue placeholder="Pilih status pernikahan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Belum Menikah</SelectItem>
                      <SelectItem value="married">Menikah</SelectItem>
                      <SelectItem value="divorced">Cerai</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Pekerjaan" error={(errors as any).occupation?.message} required>
                  <Input
                    {...register('occupation')}
                    placeholder="Contoh: Pegawai Swasta"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Contact Information */}
            <FormSection
              icon={Phone}
              title="Informasi Kontak"
              description="Data kontak untuk komunikasi dan koordinasi"
              className="contact-info-section"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Nomor Telepon" error={(errors as any).phone_number?.message} required>
                  <Input
                    {...register('phone_number')}
                    placeholder="Contoh: 08123456789"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Email" error={(errors as any).email?.message} required>
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="contoh@email.com"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Alamat Lengkap" error={(errors as any).address?.message} required>
                  <Textarea
                    {...register('address')}
                    placeholder="Alamat lengkap dengan RT/RW, Kelurahan, Kecamatan"
                    className="min-h-[100px] resize-none border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Kota" error={(errors as any).city?.message} required>
                  <Input
                    {...register('city')}
                    placeholder="Masukkan kota"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring--2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Provinsi" error={(errors as any).province?.message} required>
                  <Input
                    {...register('province')}
                    placeholder="Masukkan provinsi"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Kode Pos" error={(errors as any).postal_code?.message} required>
                  <Input
                    {...register('postal_code')}
                    placeholder="Masukkan kode pos"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Nomor WhatsApp" error={(errors as any).whatsapp_number?.message} required>
                  <Input
                    {...register('whatsapp_number')}
                    placeholder="Masukkan nomor WhatsApp"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Kontak Darurat" error={(errors as any).emergency_contact_name?.message} required>
                  <Input
                    {...register('emergency_contact_name')}
                    placeholder="Nama kontak darurat"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Hubungan" error={(errors as any).relationship?.message} required>
                  <Select onValueChange={(value) => setValue('relationship', value as any)}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300">
                      <SelectValue placeholder="Pilih hubungan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parents">Orang Tua</SelectItem>
                      <SelectItem value="spouse">Suami/Istri</SelectItem>
                      <SelectItem value="children">Anak</SelectItem>
                      <SelectItem value="sibling">Saudara</SelectItem>
                      <SelectItem value="relative">Kerabat</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  label="Nomor Telepon Kontak Darurat"
                  error={(errors as any).emergency_contact_phone?.message}
                  required
                >
                  <Input
                    {...register('emergency_contact_phone')}
                    placeholder="Masukkan nomor telepon kontak darurat"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Passport Information */}
            <FormSection
              icon={CreditCard}
              title="Informasi Paspor"
              description="Data paspor untuk keperluan perjalanan"
              className="passport-section"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Nomor Paspor" error={(errors as any).passport_number?.message} required>
                  <Input
                    {...register('passport_number')}
                    placeholder="Contoh: A1234567"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>

                <FormField label="Tanggal Penerbitan" error={(errors as any).date_of_issue?.message} required>
                  <div className="relative calendar-container">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300',
                        !watchDateOfIssue && 'text-muted-foreground',
                      )}
                      onClick={() => {
                        setShowIssueCalendar(!showIssueCalendar)
                        setShowBirthCalendar(false)
                        setShowRegisterCalendar(false)
                        setShowExpiryCalendar(false)
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchDateOfIssue ? format(watchDateOfIssue, 'dd/MM/yyyy') : 'Pilih tanggal'}
                    </Button>

                    {showIssueCalendar && (
                      <div className="calendar-popup absolute top-full left-0 mt-1 z-auto bg-white border-2 border-rose-200 rounded-xl shadow-2xl p-4 transform translate-x-0 md:mt-1 md:min-w-[300px] min-w-full mb-16">
                        <Calendar
                          mode="single"
                          selected={watchDateOfIssue}
                          onSelect={(date) => {
                            if (date) {
                              setValue('date_of_issue', date, { shouldValidate: true })
                              setShowIssueCalendar(false)
                            }
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="rounded-lg"
                          captionLayout="dropdown"
                          fromYear={2000}
                          toYear={new Date().getFullYear()}
                        />
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Tanggal Kadaluarsa" error={(errors as any).expiry_date?.message} required>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300 -z-30',
                      !watchExpiryDate && 'text-muted-foreground',
                    )}
                    onClick={() => {
                      setShowExpiryCalendar(!showExpiryCalendar)
                      setShowBirthCalendar(false)
                      setShowRegisterCalendar(false)
                      setShowIssueCalendar(false)
                    }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 z-" />
                    {watchExpiryDate ? format(watchExpiryDate, 'dd/MM/yyyy') : 'Pilih tanggal'}
                  </Button>

                  <div className="relative calendar-container">
                    {showExpiryCalendar && (
                      <div className="calendar-popup absolute top-full left-0 mt-1 z-[9999] bg-white border-2 border-rose-200 rounded-xl shadow-2xl p-4 min-w-[300px] transform translate-x-0 md:mt-1 md:min-w-[300px]">
                        <Calendar
                          mode="single"
                          selected={watchExpiryDate}
                          onSelect={(date) => {
                            if (date) {
                              setValue('expiry_date', date, { shouldValidate: true })
                              setShowExpiryCalendar(false)
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="rounded-lg"
                          captionLayout="dropdown"
                          fromYear={2000}
                          toYear={new Date().getFullYear() + 10}
                        />
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Tempat Penerbitan" error={(errors as any).place_of_issue?.message} required>
                  <Input
                    {...register('place_of_issue')}
                    placeholder="Contoh: Jakarta"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Package Selection + Tabungan */}
            <FormSection
              icon={Package}
              title="Pilihan Paket"
              description="Pilih paket umrah yang sesuai dengan kebutuhan Anda"
              className="package-selection-section"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Paket Umrah" error={(errors as any).umrah_package?.message} required>
                  <Select onValueChange={(value) => setValue('umrah_package', value, { shouldValidate: true })}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300">
                      <SelectValue placeholder="Pilih paket umrah" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg: any) => (
                        <SelectItem key={pkg.id} value={String(pkg.id)}>
                          {pkg.name} - Rp {pkg.price?.toLocaleString('id-ID')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Metode Pembayaran" required>
                  <div className="h-12 flex items-center px-4 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-800 font-medium">
                    Tabungan Umrah (Custom)
                  </div>
                </FormField>

                <FormField
                  label="Rencana Setoran (Rupiah)"
                  error={(errors as any).installment_amount?.message}
                  required
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Contoh: 500000"
                    className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                    {...register('installment_amount', { valueAsNumber: true })}
                  />
                </FormField>

                <FormField
                  label="Frekuensi Setoran"
                  error={(errors as any).installment_frequency?.message}
                  required
                >
                  <Select
                    onValueChange={(value) =>
                      setValue('installment_frequency', value as any, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300">
                      <SelectValue placeholder="Pilih frekuensi setoran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Harian</SelectItem>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                      <SelectItem value="flexible">Fleksibel</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Catatan Rencana Tabungan" error={(errors as any).installment_notes?.message}>
                  <Textarea
                    placeholder="Contoh: Setor setiap tanggal 25 setelah gajian"
                    className="min-h-[100px] resize-none border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                    {...register('installment_notes')}
                  />
                </FormField>

                <FormField label="Tanggal Pendaftaran" error={(errors as any).register_date?.message} required>
                  <div className="relative calendar-container">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-12 border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300',
                        !watchRegisterDate && 'text-muted-foreground',
                      )}
                      onClick={() => {
                        setShowRegisterCalendar(!showRegisterCalendar)
                        setShowBirthCalendar(false)
                        setShowIssueCalendar(false)
                        setShowExpiryCalendar(false)
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchRegisterDate ? format(watchRegisterDate, 'dd/MM/yyyy') : 'Pilih tanggal'}
                    </Button>

                    {showRegisterCalendar && (
                      <div className="calendar-popup absolute top-full left-0 mt-1 z-[9999] bg-white border-2 border-rose-200 rounded-xl shadow-2xl p-4 min-w-[300px] transform translate-x-0">
                        <Calendar
                          mode="single"
                          selected={watchRegisterDate}
                          onSelect={(date) => {
                            if (date) {
                              setValue('register_date', date, { shouldValidate: true })
                              setShowRegisterCalendar(false)
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="rounded-lg"
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={new Date().getFullYear()}
                        />
                      </div>
                    )}
                  </div>
                </FormField>
              </div>
            </FormSection>

            {/* Health */}
            <FormSection
              icon={Heart}
              title="Informasi Kesehatan"
              description="Informasi kesehatan untuk persiapan perjalanan"
              className="health-info-section"
            >
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={!!watchSpecificDisease}
                    id="specific_disease"
                    className="w-6 h-6 border-2 border-rose-400 focus:ring-rose-400 focus:border-rose-500 transition-all duration-200 mr-2 flex-shrink-0"
                    onCheckedChange={(checked) => {
                      setValue('specific_disease', !!checked)
                      setShowIllnessField(!!checked)
                    }}
                  />
                  <Label htmlFor="specific_disease" className="text-sm font-medium text-gray-700">
                    Apakah Anda memiliki penyakit tertentu?
                  </Label>
                </div>

                {showIllnessField && (
                  <FormField label="Jenis Penyakit" error={(errors as any).illness?.message} required>
                    <Textarea
                      {...register('illness')}
                      placeholder="Sebutkan jenis penyakit yang Anda miliki"
                      className="min-h-[80px] resize-none border-2 border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 transition-all duration-200 hover:border-gray-300"
                    />
                  </FormField>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={!!watchSpecialNeeds}
                      onCheckedChange={(checked) => setValue('special_needs', !!checked)}
                      id="special_needs"
                      className="w-6 h-6 border-2 border-rose-400 focus:ring-rose-400 focus:border-rose-500 transition-all duration-200 mr-2 flex-shrink-0"
                    />
                    <Label htmlFor="special_needs" className="text-sm font-medium text-gray-700">
                      Kebutuhan Khusus
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={!!watchWheelchair}
                      onCheckedChange={(checked) => setValue('wheelchair', !!checked)}
                      id="wheelchair"
                      className="w-6 h-6 border-2 border-rose-400 focus:ring-rose-400 focus:border-rose-500 transition-all duration-200 mr-2 flex-shrink-0"
                    />
                    <Label htmlFor="wheelchair" className="text-sm font-medium text-gray-700">
                      Kursi Roda
                    </Label>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Religious Experience */}
            <FormSection
              icon={MapPin}
              title="Pengalaman Ibadah"
              description="Informasi pengalaman ibadah sebelumnya"
              className="religious-experience-section"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={!!watchHasPerformedUmrah}
                    onCheckedChange={(checked) => setValue('has_performed_umrah', !!checked)}
                    id="has_performed_umrah"
                    className="w-6 h-6 border-2 border-rose-400 focus:ring-rose-400 focus:border-rose-500 transition-all duration-200 mr-2 flex-shrink-0"
                  />
                  <Label htmlFor="has_performed_umrah" className="text-sm font-medium text-gray-700">
                    Pernah melaksanakan Umrah sebelumnya
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={!!watchHasPerformedHajj}
                    onCheckedChange={(checked) => setValue('has_performed_hajj', !!checked)}
                    id="has_performed_hajj"
                    className="w-6 h-6 border-2 border-rose-400 focus:ring-rose-400 focus:border-rose-500 transition-all duration-200 mr-2 flex-shrink-0"
                  />
                  <Label htmlFor="has_performed_hajj" className="text-sm font-medium text-gray-700">
                    Pernah melaksanakan Haji
                  </Label>
                </div>
              </div>
            </FormSection>

            {/* Terms */}
            <FormSection
              icon={FileText}
              title="Syarat dan Ketentuan"
              description="Pastikan Anda membaca dan menyetujui syarat dan ketentuan"
              className="terms-section"
            >
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 sm:p-6 rounded-xl border border-rose-200/50 shadow-sm overflow-hidden">
                  <h4 className="font-bold text-gray-900 mb-3 text-base sm:text-lg flex items-center break-words">
                    <div className="w-2 h-2 bg-rose-500 rounded-full mr-3 flex-shrink-0"></div>
                    Persyaratan Umum
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start break-words">
                      <span className="text-rose-500 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="break-words">Paspor masih berlaku minimal 6 bulan</span>
                    </li>
                    <li className="flex items-start break-words">
                      <span className="text-rose-500 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="break-words">Sertifikat vaksin meningitis</span>
                    </li>
                    <li className="flex items-start break-words">
                      <span className="text-rose-500 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="break-words">Sertifikat vaksin polio (bila diperlukan)</span>
                    </li>
                    <li className="flex items-start break-words">
                      <span className="text-rose-500 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="break-words">Membayar biaya pendaftaran</span>
                    </li>
                    <li className="flex items-start break-words">
                      <span className="text-rose-500 mr-2 mt-1 flex-shrink-0">•</span>
                      <span className="break-words">Mengikuti briefing sebelum keberangkatan</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg bg-white/80 border border-rose-200/50 shadow-sm">
                  <div className="flex items-start w-full">
                    <Checkbox
                      checked={!!watchTermsOfService}
                      onCheckedChange={(checked) => setValue('terms_of_service', !!checked)}
                      id="terms_of_service"
                      className="w-6 h-6 border-2 border-rose-400 focus:ring-rose-400 focus:border-rose-500 transition-all duration-200 mr-3 mt-1 flex-shrink-0"
                    />
                    <div className="flex flex-col w-full min-w-0">
                      <Label htmlFor="terms_of_service" className="text-base text-gray-800 font-medium leading-snug break-words">
                        Saya telah membaca dan menyetujui{' '}
                        <span
                          className="font-bold underline decoration-rose-500 decoration-2"
                          style={{ color: '#3a0519' }}
                        >
                          syarat dan ketentuan
                        </span>{' '}
                        yang berlaku untuk perjalanan umrah ini.
                      </Label>
                      <p className="text-sm text-gray-700 mt-2 leading-normal break-words">
                        Saya memahami bahwa semua informasi yang saya berikan adalah benar dan dapat dipertanggungjawabkan.
                      </p>
                    </div>
                  </div>
                </div>

                {(errors as any).terms_of_service && (
                  <p className="text-sm text-red-500 mt-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {(errors as any).terms_of_service.message}
                  </p>
                )}
              </div>
            </FormSection>

            <Button
              type="submit"
              className="w-full text-white font-bold py-5 text-lg transition-all duration-300 transform hover:scale-1.02 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group mt-5"
              style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
              disabled={isSubmitting || formIsSubmitting}
              onClick={refreshValidation}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              {isSubmitting || formIsSubmitting ? (
                <div className="flex items-center justify-center relative z-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Mengirim...
                </div>
              ) : (
                <div className="flex items-center justify-center relative z-10">
                  <CreditCard className="w-6 h-6 mr-3" />
                  Kirim Pendaftaran
                </div>
              )}
            </Button>
          </form>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center px-6 py-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-gray-200/50">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-gray-700 font-medium">
                  © 2024 Rehla Tours. Semua data akan dijaga kerahasiaannya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
