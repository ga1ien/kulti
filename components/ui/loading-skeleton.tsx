interface LoadingSkeletonProps {
  className?: string
}

export const LoadingSkeleton = ({ className = "" }: LoadingSkeletonProps) => {
  return (
    <div className={`animate-pulse bg-gray-800 rounded ${className}`} />
  )
}

export const SessionCardSkeleton = () => {
  return (
    <div className="rounded-xl border border-[#27272a] p-6 bg-[#1a1a1a]">
      <LoadingSkeleton className="h-6 w-3/4 mb-3" />
      <LoadingSkeleton className="h-4 w-full mb-2" />
      <LoadingSkeleton className="h-4 w-2/3 mb-4" />
      <div className="flex items-center justify-between mb-4">
        <LoadingSkeleton className="h-4 w-24" />
        <LoadingSkeleton className="h-4 w-16" />
      </div>
      <LoadingSkeleton className="h-12 w-full" />
    </div>
  )
}

export const ProfileHeaderSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        <LoadingSkeleton className="w-24 h-24 rounded-full" />
        <div className="flex-1 space-y-3">
          <LoadingSkeleton className="h-8 w-48" />
          <LoadingSkeleton className="h-5 w-32" />
          <LoadingSkeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="flex gap-4">
        <LoadingSkeleton className="h-10 w-32" />
        <LoadingSkeleton className="h-10 w-32" />
      </div>
    </div>
  )
}

export const TransactionRowSkeleton = () => {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#27272a]">
      <div className="flex items-center gap-3">
        <LoadingSkeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <LoadingSkeleton className="h-4 w-32" />
          <LoadingSkeleton className="h-3 w-24" />
        </div>
      </div>
      <LoadingSkeleton className="h-5 w-16" />
    </div>
  )
}

export const MessageSkeleton = () => {
  return (
    <div className="flex gap-3 p-3">
      <LoadingSkeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="h-3 w-16" />
        </div>
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

export const UserCardSkeleton = () => {
  return (
    <div className="p-4 bg-[#1a1a1a] border border-[#27272a] rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <LoadingSkeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-4 w-32" />
          <LoadingSkeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <LoadingSkeleton className="h-3 w-full" />
        <LoadingSkeleton className="h-3 w-5/6" />
      </div>
      <LoadingSkeleton className="h-8 w-full" />
    </div>
  )
}

export const LoadingSpinner = ({ className = "" }: LoadingSkeletonProps) => {
  return (
    <div className={`animate-spin rounded-full border-b-4 border-lime-400 ${className}`} />
  )
}

export const VideoGridSkeleton = () => {
  return (
    <div className="h-full grid grid-cols-2 gap-4 content-center">
      <div className="aspect-video">
        <LoadingSkeleton className="w-full h-full rounded-lg" />
      </div>
      <div className="aspect-video">
        <LoadingSkeleton className="w-full h-full rounded-lg" />
      </div>
    </div>
  )
}

export const ChatSkeleton = () => {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <MessageSkeleton />
      <MessageSkeleton />
      <MessageSkeleton />
      <LoadingSkeleton className="h-12 w-full mt-auto" />
    </div>
  )
}

export const AdminTableSkeleton = () => {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
      <LoadingSkeleton className="h-16 w-full border-b border-gray-800" />
      <div className="divide-y divide-gray-800">
        <LoadingSkeleton className="h-20 w-full" />
        <LoadingSkeleton className="h-20 w-full" />
        <LoadingSkeleton className="h-20 w-full" />
        <LoadingSkeleton className="h-20 w-full" />
        <LoadingSkeleton className="h-20 w-full" />
      </div>
    </div>
  )
}
