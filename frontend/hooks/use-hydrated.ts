import { useEffect, useState } from 'react'
import { useTraderAuth, useAdminAuth } from '@/stores/auth'

export const useHydrated = () => {
  const [hydrated, setHydrated] = useState(false)
  const traderHydrated = useTraderAuth((state) => state.hasHydrated)
  const adminHydrated = useAdminAuth((state) => state.hasHydrated)

  useEffect(() => {
    setHydrated(traderHydrated && adminHydrated)
  }, [traderHydrated, adminHydrated])

  return hydrated
}