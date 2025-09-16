"use client"

import { use } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { ServiceDetail } from '@/components/admin/service-detail'

interface ServiceDetailPageProps {
  params: Promise<{
    serviceName: string
  }>
}

export default function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const resolvedParams = use(params)
  
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <ServiceDetail serviceName={resolvedParams.serviceName} />
      </AuthLayout>
    </ProtectedRoute>
  )
}