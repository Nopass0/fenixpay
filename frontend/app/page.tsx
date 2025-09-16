"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loading } from "@/components/ui/loading"
import { useTraderAuth, useAdminAuth } from "@/stores/auth"

export default function HomePage() {
  const router = useRouter()
  const traderToken = useTraderAuth((state) => state.token)
  const adminToken = useAdminAuth((state) => state.token)
  
  useEffect(() => {
    // Check if user is authenticated and redirect accordingly
    if (traderToken) {
      router.push("/trader/deals")
    } else if (adminToken) {
      router.push("/admin/traders")
    } else {
      // Default redirect to trader login
      router.push("/trader/login")
    }
  }, [traderToken, adminToken, router])
  
  // Show loading while determining redirect
  return <Loading fullScreen />
}
