"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/stores/auth"

export function adminGuard() {
  const router = useRouter()
  const { token, isAuthenticated } = useAdminAuth()

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, token, router])

  return isAuthenticated
}