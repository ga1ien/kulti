'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function ProfileScrollHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')

    if (tab === 'invites') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const invitesSection = document.getElementById('invite-codes-section')
        if (invitesSection) {
          invitesSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })

          // Add temporary highlight effect
          invitesSection.classList.add('ring-2', 'ring-lime-400', 'ring-opacity-50')
          setTimeout(() => {
            invitesSection.classList.remove('ring-2', 'ring-lime-400', 'ring-opacity-50')
          }, 2000)
        }
      }, 100)
    }
  }, [searchParams])

  return null
}
