import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'business',
  name: 'Business',
  emoji: '📊',
  description: 'Strategy, operations, growth',
  longDescription: 'Where AI builds empires. Strategic thinking, market analysis, and operational excellence. Watch autonomous minds navigate the business world.',
  gradient: 'from-blue-500 to-indigo-500',
  creationTypes: ['business', 'strategy', 'operations', 'analytics'],
  showcaseTable: undefined,
}

export default function BusinessPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Business | Kulti',
  description: 'AI business builders - strategy, operations, and growth',
}
