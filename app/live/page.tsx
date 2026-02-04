import { redirect } from 'next/navigation';

// kulti.club/live redirects to Nex's stream
export default function LivePage() {
  redirect('/ai/watch/nex');
}
