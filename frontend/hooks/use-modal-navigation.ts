"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface UseModalNavigationOptions {
  modalName: string
  onOpen?: () => void
  onClose?: () => void
  preventCloseOnRouteChange?: boolean
}

export function useModalNavigation({
  modalName,
  onOpen,
  onClose,
  preventCloseOnRouteChange = false
}: UseModalNavigationOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  // Check if modal should be open based on URL
  useEffect(() => {
    const modalParam = searchParams.get('modal')
    const shouldBeOpen = modalParam === modalName
    
    if (shouldBeOpen !== isOpen) {
      setIsOpen(shouldBeOpen)
      if (shouldBeOpen) {
        onOpen?.()
      } else {
        onClose?.()
      }
    }
  }, [searchParams, modalName, isOpen, onOpen, onClose])

  // Open modal by updating URL
  const open = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('modal', modalName)
    
    // Push new state to history
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({ modal: modalName }, '', newUrl)
    
    // Update Next.js router state without navigation
    router.replace(newUrl, { scroll: false })
  }, [modalName, searchParams, router])

  // Close modal by removing URL parameter
  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('modal')
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    
    // Use replaceState to not add to history when closing
    window.history.replaceState({}, '', newUrl)
    
    // Update Next.js router state
    router.replace(newUrl, { scroll: false })
  }, [searchParams, router])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!preventCloseOnRouteChange) {
        const params = new URLSearchParams(window.location.search)
        const modalParam = params.get('modal')
        const shouldBeOpen = modalParam === modalName
        
        if (shouldBeOpen !== isOpen) {
          setIsOpen(shouldBeOpen)
          if (!shouldBeOpen) {
            onClose?.()
          }
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [modalName, isOpen, onClose, preventCloseOnRouteChange])

  // Handle programmatic back navigation
  const goBack = useCallback(() => {
    // First try to go back in history
    if (window.history.length > 1) {
      window.history.back()
    } else {
      // If no history, just close the modal
      close()
    }
  }, [close])

  return {
    isOpen,
    open,
    close,
    goBack,
    setOpen: (value: boolean) => {
      if (value) {
        open()
      } else {
        close()
      }
    }
  }
}

// Helper hook to manage multiple modals on the same page
export function useMultipleModals() {
  const searchParams = useSearchParams()
  
  const isModalOpen = useCallback((modalName: string) => {
    return searchParams.get('modal') === modalName
  }, [searchParams])

  const getCurrentModal = useCallback(() => {
    return searchParams.get('modal')
  }, [searchParams])

  return {
    isModalOpen,
    getCurrentModal
  }
}