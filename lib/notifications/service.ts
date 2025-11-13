import { createClient } from '@/lib/supabase/server'

export interface Notification {
  id: string
  user_id: string
  type: 'tip_received' | 'badge_earned' | 'match_found' | 'topic_streamed' | 'session_started' | 'presenter_invited' | 'message_reply'
  title: string
  message: string
  link?: string
  read: boolean
  metadata: Record<string, any>
  created_at: string
}

export interface CreateNotificationParams {
  userId: string
  type: Notification['type']
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
}

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata = {}
}: CreateNotificationParams) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      metadata
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }

  return data
}

/**
 * Notify user they received a tip
 */
export async function notifyTipReceived(
  userId: string,
  amount: number,
  fromUser: string,
  fromUserId?: string
) {
  return createNotification({
    userId,
    type: 'tip_received',
    title: 'You received a tip!',
    message: `${fromUser} tipped you ${amount} credits`,
    link: '/credits',
    metadata: { amount, fromUser, fromUserId }
  })
}

/**
 * Notify user they earned a badge
 */
export async function notifyBadgeEarned(
  userId: string,
  badgeId: string,
  badgeName: string
) {
  return createNotification({
    userId,
    type: 'badge_earned',
    title: 'New badge earned!',
    message: `You earned the ${badgeName} badge`,
    link: `/profile/${userId}`,
    metadata: { badgeId, badgeName }
  })
}

/**
 * Notify user a match was found
 */
export async function notifyMatchFound(
  userId: string,
  sessionId: string,
  topicName: string
) {
  return createNotification({
    userId,
    type: 'match_found',
    title: 'Match found!',
    message: `A session for "${topicName}" is ready`,
    link: `/session/${sessionId}`,
    metadata: { sessionId, topicName }
  })
}

/**
 * Notify user their topic is being streamed
 */
export async function notifyTopicStreamed(
  userId: string,
  sessionId: string,
  topicName: string
) {
  return createNotification({
    userId,
    type: 'topic_streamed',
    title: 'Your topic is live!',
    message: `"${topicName}" is now being streamed`,
    link: `/session/${sessionId}`,
    metadata: { sessionId, topicName }
  })
}

/**
 * Notify engaged users about a topic stream
 * Sends notifications to users who voted, commented, or created the topic
 */
export async function notifyTopicStreamStarted(
  sessionId: string,
  topicTitle: string,
  roomName: string,
  hostName: string,
  hostId: string,
  engagedUsers: Array<{ user_id: string; engagement_type: string }>
): Promise<{ notified: number; errors: number }> {
  let notified = 0
  let errors = 0

  // Filter out the host from notifications
  const usersToNotify = engagedUsers.filter(u => u.user_id !== hostId)

  // Send notifications in parallel
  const results = await Promise.allSettled(
    usersToNotify.map(async ({ user_id, engagement_type }) => {
      let message = ''

      // Customize message based on engagement type
      switch (engagement_type) {
        case 'creator':
          message = `${hostName} is streaming your topic "${topicTitle}" in ${roomName}`
          break
        case 'voter':
          message = `${hostName} is streaming "${topicTitle}" that you voted for in ${roomName}`
          break
        case 'commenter':
          message = `${hostName} is streaming "${topicTitle}" that you commented on in ${roomName}`
          break
        default:
          message = `${hostName} started streaming "${topicTitle}" in ${roomName}`
      }

      return createNotification({
        userId: user_id,
        type: 'topic_streamed',
        title: 'Topic is now live!',
        message,
        link: `/session/${sessionId}`,
        metadata: {
          sessionId,
          topicTitle,
          roomName,
          hostName,
          engagementType: engagement_type
        }
      })
    })
  )

  // Count successful notifications
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      notified++
    } else {
      errors++
      console.error('Failed to send notification:', result.reason)
    }
  })

  return { notified, errors }
}

/**
 * Notify user a session they requested has started
 */
export async function notifySessionStarted(
  userId: string,
  sessionId: string,
  topicName: string
) {
  return createNotification({
    userId,
    type: 'session_started',
    title: 'Session started!',
    message: `"${topicName}" session is now live`,
    link: `/session/${sessionId}`,
    metadata: { sessionId, topicName }
  })
}

/**
 * Notify user they were invited as a presenter
 */
export async function notifyPresenterInvited(
  userId: string,
  sessionId: string,
  invitedBy: string
) {
  return createNotification({
    userId,
    type: 'presenter_invited',
    title: 'Presenter invitation',
    message: `${invitedBy} invited you to present`,
    link: `/session/${sessionId}`,
    metadata: { sessionId, invitedBy }
  })
}

/**
 * Notify user someone replied to their message
 */
export async function notifyMessageReply(
  userId: string,
  sessionId: string,
  replierName: string,
  messagePreview: string
) {
  return createNotification({
    userId,
    type: 'message_reply',
    title: 'New reply',
    message: `${replierName}: ${messagePreview}`,
    link: `/session/${sessionId}`,
    metadata: { sessionId, replierName, messagePreview }
  })
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Error getting unread count:', error)
    return 0
  }

  return count || 0
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}
