"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { PayoutsList } from "@/components/payouts/payouts-list-updated"

export default function TraderPayoutsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <PayoutsList />
      </AuthLayout>
    </ProtectedRoute>
  )
}