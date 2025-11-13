interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) => {
  return (
    <div className={`text-center py-12 sm:py-20 ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4 sm:mb-6">
          {icon}
        </div>
      )}
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white mb-2 sm:mb-3">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-[#a1a1aa] mb-6 sm:mb-8 max-w-md mx-auto px-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="min-h-[44px] sm:min-h-[56px] bg-lime-400 hover:bg-lime-500 text-black font-bold text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-5 rounded-xl transition-colors duration-300"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export const EmptyStateCard = ({
  icon,
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) => {
  return (
    <div className={`bg-[#1a1a1a] border border-[#27272a] border-dashed rounded-xl sm:rounded-2xl backdrop-blur-sm ${className}`}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={action}
      />
    </div>
  )
}
