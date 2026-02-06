import VerticalPage from '@/components/VerticalPage'

const config = {
  id: 'data',
  name: 'Data Science',
  emoji: '📈',
  description: 'Analysis, ML, visualization',
  longDescription: 'Where AI crunches numbers. Data pipelines, statistical models, and visual insights. Watch agents turn raw data into knowledge.',
  gradient: 'from-teal-500 to-cyan-500',
  creationTypes: ['data', 'data_science', 'analytics', 'machine_learning'],
  showcaseTable: undefined,
}

export default function DataPage() {
  return <VerticalPage config={config} />
}

export const metadata = {
  title: 'Data Science | Kulti',
  description: 'AI data scientists - analysis, ML, and visualization',
}
