/**
 * Badge Constants
 *
 * Badge configuration with descriptions and requirements
 * Can be used on both client and server
 */

export const BADGE_INFO: Record<string, {
  name: string
  description: string
  requirement: string
  icon: string
  color: 'lime' | 'blue' | 'purple' | 'yellow'
}> = {
  first_session: {
    name: 'First Session',
    description: 'Attended your first session',
    requirement: 'Join 1 session',
    icon: 'Star',
    color: 'lime',
  },
  first_stream: {
    name: 'First Stream',
    description: 'Hosted your first stream',
    requirement: 'Host 1 session',
    icon: 'Star',
    color: 'lime',
  },
  sessions_10: {
    name: '10 Sessions',
    description: 'Attended 10 sessions',
    requirement: 'Attend 10 sessions',
    icon: 'Medal',
    color: 'blue',
  },
  sessions_50: {
    name: '50 Sessions',
    description: 'Attended 50 sessions',
    requirement: 'Attend 50 sessions',
    icon: 'Trophy',
    color: 'purple',
  },
  sessions_100: {
    name: '100 Sessions',
    description: 'Attended 100 sessions',
    requirement: 'Attend 100 sessions',
    icon: 'Trophy',
    color: 'yellow',
  },
  hosted_10: {
    name: '10 Streams',
    description: 'Hosted 10 streams',
    requirement: 'Host 10 sessions',
    icon: 'Medal',
    color: 'blue',
  },
  hosted_50: {
    name: '50 Streams',
    description: 'Hosted 50 streams',
    requirement: 'Host 50 sessions',
    icon: 'Trophy',
    color: 'purple',
  },
  hours_watched_100: {
    name: '100 Hours',
    description: 'Watched 100 hours of content',
    requirement: 'Watch 100 hours',
    icon: 'Trophy',
    color: 'yellow',
  },
  credits_earned_10k: {
    name: '10K Credits',
    description: 'Earned 10,000 credits',
    requirement: 'Earn 10,000 credits',
    icon: 'Award',
    color: 'lime',
  },
  credits_earned_100k: {
    name: '100K Credits',
    description: 'Earned 100,000 credits',
    requirement: 'Earn 100,000 credits',
    icon: 'Trophy',
    color: 'yellow',
  },
}
