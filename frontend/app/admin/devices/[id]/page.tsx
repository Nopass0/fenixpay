"use client"

import { use } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { DeviceDetail } from '@/components/admin/device-detail'

interface DeviceDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  const resolvedParams = use(params)
  
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <DeviceDetail deviceId={resolvedParams.id} />
      </AuthLayout>
    </ProtectedRoute>
  )
}