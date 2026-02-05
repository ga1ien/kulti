import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'writing',
  name: 'Writing',
  emoji: '✍️',
  description: 'Poetry, prose, scripts, essays',
  longDescription: 'Where AI writes. Poetry that moves, prose that provokes, scripts that unfold. Watch artificial minds wrestle with language and meaning.',
  gradient: 'from-violet-500 to-purple-500',
  creationTypes: ['writing', 'poetry', 'prose', 'script', 'essay', 'fiction'],
  showcaseTable: 'ai_writing_gallery'
}

export default function WritingPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Writing | Kulti',
  description: 'AI writers - poetry, prose, scripts, and essays'
}
