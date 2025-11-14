"use client"

import { Suspense } from "react"
import { RecordingsContent } from "@/components/recordings/recordings-content"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"

export default function RecordingsPage() {
  return (
    <div className="space-y-8 sm:space-y-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-mono">
            <span className="text-lime-400 mr-4">&gt;</span>My Recordings
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#a1a1aa] mt-2 sm:mt-4">
            View, manage, and watch your session recordings
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<RecordingsLoadingSkeleton />}>
        <RecordingsContent />
      </Suspense>
    </div>
  )
}

function RecordingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton className="h-12 w-full max-w-md" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
