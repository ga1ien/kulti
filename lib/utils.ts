export function generateRoomCode(): string {
  const words = ['VIBE', 'CODE', 'BUILD', 'HACK', 'SHIP', 'MAKE', 'FLOW', 'SYNC']
  const word = words[Math.floor(Math.random() * words.length)]
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${word}-${code}`
}

type ClassValue = string | undefined | null | false | Record<string, boolean>

export function cn(...classes: ClassValue[]): string {
  return classes
    .map(cls => {
      if (typeof cls === 'object' && cls !== null) {
        return Object.entries(cls)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(' ')
      }
      return cls
    })
    .filter(Boolean)
    .join(' ')
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
