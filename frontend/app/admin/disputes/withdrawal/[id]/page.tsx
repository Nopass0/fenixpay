'use client'

import { use } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuthLayout } from '@/components/layouts/auth-layout'
import { DisputeDetails } from '@/components/admin/dispute-details'

export default function WithdrawalDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  
  return (
    <ProtectedRoute requiredRole="admin">
      <AuthLayout variant="admin">
        <DisputeDetails type="withdrawal" disputeId={resolvedParams.id} />
      </AuthLayout>
    </ProtectedRoute>
  )
}