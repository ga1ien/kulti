'use client'

import { StatsCard } from '@/components/admin/stats-card'
import {
  BarChart3,
  Users,
  DollarSign,
} from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-2 text-gray-400">
          Platform metrics and insights
        </p>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
        <BarChart3 className="mx-auto h-16 w-16 text-gray-600" />
        <h2 className="mt-4 text-xl font-semibold text-white">
          Analytics Dashboard Coming Soon
        </h2>
        <p className="mt-2 text-gray-400">
          Advanced analytics and reporting features will be available here.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-800 p-4">
            <Users className="mx-auto h-8 w-8 text-purple-500" />
            <h3 className="mt-2 text-sm font-medium text-white">
              User Growth
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Track signup trends over time
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 p-4">
            <BarChart3 className="mx-auto h-8 w-8 text-purple-500" />
            <h3 className="mt-2 text-sm font-medium text-white">
              Session Metrics
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Analyze engagement and duration
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 p-4">
            <DollarSign className="mx-auto h-8 w-8 text-purple-500" />
            <h3 className="mt-2 text-sm font-medium text-white">
              Credit Economy
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Monitor credit circulation
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
