'use client'

import { Button } from '@/components/ui/button'

export function ReloadActions({
  primaryLabel = 'Coba Lagi',
  secondaryLabel = 'Kembali ke Beranda',
}: {
  primaryLabel?: string
  secondaryLabel?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        onClick={() => location.reload()}
        variant="outline"
        className="flex-1 transition-all duration-200 hover:scale-105"
      >
        {primaryLabel}
      </Button>

      <Button
        onClick={() => (window.location.href = '/')}
        className="flex-1 text-white transition-all duration-200 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #3a0519 0%, #5d1f35 100%)' }}
      >
        {secondaryLabel}
      </Button>
    </div>
  )
}
