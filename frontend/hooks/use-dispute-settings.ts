import { useState, useEffect } from 'react'
import { adminApi, traderApi } from '@/services/api'

interface DisputeSettings {
  dayShiftStartHour: number
  dayShiftEndHour: number
  dayShiftTimeoutMinutes: number
  nightShiftTimeoutMinutes: number
}

export function useDisputeSettings(userType: 'admin' | 'trader' = 'trader') {
  const [settings, setSettings] = useState<DisputeSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      let disputeSettings: DisputeSettings
      
      if (userType === 'admin') {
        const response = await adminApi.getSystemConfig()
        const configArray = Array.isArray(response) ? response : response.data || []
        const configMap = Object.fromEntries(
          configArray.map((item: any) => [item.key, item.value])
        )
        
        disputeSettings = {
          dayShiftStartHour: parseInt(configMap.disputeDayShiftStartHour || '9'),
          dayShiftEndHour: parseInt(configMap.disputeDayShiftEndHour || '21'),
          dayShiftTimeoutMinutes: parseInt(configMap.disputeDayShiftTimeoutMinutes || '30'),
          nightShiftTimeoutMinutes: parseInt(configMap.disputeNightShiftTimeoutMinutes || '60')
        }
      } else {
        const response = await traderApi.getDisputeSettings()
        disputeSettings = response
      }
      
      setSettings(disputeSettings)
    } catch (error) {
      console.error('Failed to load dispute settings:', error)
      // Установим значения по умолчанию при ошибке
      setSettings({
        dayShiftStartHour: 9,
        dayShiftEndHour: 21,
        dayShiftTimeoutMinutes: 30,
        nightShiftTimeoutMinutes: 60
      })
    } finally {
      setLoading(false)
    }
  }

  const getCurrentTimeoutMinutes = () => {
    if (!settings) return 30 // Значение по умолчанию

    const now = new Date()
    const currentHour = now.getHours()

    // Проверяем, дневная ли сейчас смена
    const isDayShift = currentHour >= settings.dayShiftStartHour && currentHour < settings.dayShiftEndHour

    return isDayShift ? settings.dayShiftTimeoutMinutes : settings.nightShiftTimeoutMinutes
  }

  const isCurrentlyDayShift = () => {
    if (!settings) return true

    const now = new Date()
    const currentHour = now.getHours()

    return currentHour >= settings.dayShiftStartHour && currentHour < settings.dayShiftEndHour
  }

  return {
    settings,
    loading,
    getCurrentTimeoutMinutes,
    isCurrentlyDayShift
  }
}