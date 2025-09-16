"use client"

import { useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface UseUrlModalOptions {
  modalName: string
  onOpen?: () => void
  onClose?: () => void
}

export function useUrlModal({
  modalName,
  onOpen,
  onClose
}: UseUrlModalOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Check if modal is open based on URL
  const isOpen = searchParams.get('modal') === modalName

  // Open modal by updating URL
  const open = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('modal', modalName)
    
    // Push new state to history
    const newUrl = `${pathname}?${params.toString()}`
    window.history.pushState({ modal: modalName }, '', newUrl)
    
    // Trigger onOpen callback
    onOpen?.()
  }, [modalName, pathname, searchParams, onOpen])

  // Close modal by removing URL parameter
  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('modal')
    
    const newUrl = params.toString() 
      ? `${pathname}?${params.toString()}`
      : pathname
    
    // Update URL without adding to history
    router.replace(newUrl, { scroll: false })
    
    // Trigger onClose callback
    onClose?.()
  }, [pathname, searchParams, router, onClose])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search)
      const modalParam = currentParams.get('modal')
      
      if (!modalParam || modalParam !== modalName) {
        onClose?.()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [modalName, onClose])

  // Handle programmatic open/close
  const setOpen = useCallback((value: boolean) => {
    if (value && !isOpen) {
      open()
    } else if (!value && isOpen) {
      close()
    }
  }, [isOpen, open, close])

  return {
    isOpen,
    open,
    close,
    setOpen
  }
}