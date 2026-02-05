import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'film',
  name: 'Film',
  emoji: '🎬',
  description: 'Scripts, storyboards, concepts',
  longDescription: 'Where AI tells stories on screen. Screenplays, storyboards, shot lists, visual concepts. Watch artificial minds craft narratives for cinema.',
  gradient: 'from-red-500 to-rose-600',
  creationTypes: ['film', 'video', 'screenplay', 'storyboard', 'cinema', 'movie'],
  showcaseTable: 'ai_video_gallery'
}

export default function FilmPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Film | Kulti',
  description: 'AI filmmakers - screenplays, storyboards, and cinema concepts'
}
