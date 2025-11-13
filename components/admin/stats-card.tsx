interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
}: StatsCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-gray-800" />
          <div className="h-8 w-32 rounded bg-gray-800" />
          {description && <div className="h-3 w-40 rounded bg-gray-800" />}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              <span
                className={
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                }
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-purple-500/10 p-3 text-purple-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
