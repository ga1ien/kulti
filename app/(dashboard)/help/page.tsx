"use client"

import { useState } from "react"
import { SearchHelp } from "@/components/help/search-help"
import { FAQSection, FAQItem } from "@/components/help/faq-section"
import { HelpCircle } from "lucide-react"

const gettingStartedFAQs: FAQItem[] = [
  {
    question: "How do I create an account on Kulti?",
    answer: "To create an account, click the 'Sign Up' button on the homepage. You'll need to provide your phone number to receive a verification code via SMS. After entering the code, complete your profile by choosing a username, display name, and adding a bio. Kulti uses phone authentication for enhanced security.",
  },
  {
    question: "How do I complete my profile setup?",
    answer: "After signing up, you'll be guided through an onboarding flow. Fill in your display name (how others see you), choose a unique username (for your profile URL), and optionally add a bio. You can update these details later in Settings > Account. A complete profile helps others recognize you in sessions.",
  },
  {
    question: "What are invite codes and why do I need one?",
    answer: "Kulti is currently in invite-only mode to ensure a high-quality community. Invite codes are unique tokens that grant access to the platform. You'll need one to complete registration. Each user receives invite codes they can share with others once they join.",
  },
  {
    question: "How do I use an invite code?",
    answer: "During the signup process, you'll be prompted to enter your invite code. Simply paste or type the code you received into the 'Invite Code' field. If valid, you'll be able to complete registration. Invalid or used codes will show an error message.",
  },
  {
    question: "What is the credit system?",
    answer: "Credits are Kulti's internal currency used for premium features like session boosts (higher quality/longer duration), tipping creators, and accessing special features. You earn credits by completing daily challenges, receiving tips, referring friends, and participating in the community. Check your balance in the top navigation bar.",
  },
  {
    question: "How do I navigate the dashboard?",
    answer: "The dashboard is your home on Kulti. Use the top navigation to access Browse (discover sessions), Community (join rooms), and your profile. The main dashboard shows active sessions, recent activity, and quick actions to create or join sessions. The search bar helps you find users, sessions, and topics.",
  },
  {
    question: "Can I change my username later?",
    answer: "Currently, usernames cannot be changed after account creation to maintain consistency and prevent impersonation. Choose carefully during signup. However, you can always update your display name and bio in Settings > Account.",
  },
]

const sessionsStreamingFAQs: FAQItem[] = [
  {
    question: "How do I create a session?",
    answer: "Click 'Create Session' in the top navigation or dashboard. Choose a title, description, and category (coding, design, gaming, etc.). Set visibility (public/private), maximum participants, and whether viewers can join. You can enable features like chat, screen sharing, and recording. Sessions require credits for boosts and extended duration.",
  },
  {
    question: "How do I join a session?",
    answer: "Browse active sessions on the Browse page or Dashboard. Click 'Join' on any public session. If joining as a viewer, you'll enter a HLS stream view. To present (share camera/screen), the host must send you a presenter invite. Private sessions require an invite link.",
  },
  {
    question: "What's the difference between presenter and viewer?",
    answer: "Presenters actively participate with camera, microphone, and screen sharing enabled. They appear in the video grid and can interact fully. Viewers watch via HLS stream with lower latency but cannot broadcast themselves. Viewers can still use chat and reactions. Presenters use more bandwidth and credits.",
  },
  {
    question: "How many people can present in a session?",
    answer: "Sessions support up to 12 simultaneous presenters with video/audio. This includes the host. Additional participants can join as viewers (unlimited). The limit ensures stable performance and quality. Large sessions benefit from having fewer presenters with many viewers.",
  },
  {
    question: "How do I enable OBS streaming?",
    answer: "In session settings, enable 'RTMP Streaming'. You'll receive an RTMP URL and stream key. In OBS, go to Settings > Stream, select 'Custom' service, paste the URL and key. Start streaming from OBS to broadcast to your Kulti session. Useful for professional setups with multiple cameras or scenes.",
  },
  {
    question: "What is HLS streaming?",
    answer: "HLS (HTTP Live Streaming) is the technology that powers viewer mode. It provides low-latency video streaming for viewers without requiring WebRTC. Viewers get 2-5 second latency, can watch on any device, and use minimal bandwidth. HLS automatically adjusts quality based on connection speed.",
  },
  {
    question: "Can I record my sessions?",
    answer: "Yes! Enable recording in session settings. Recordings capture all presenters, screen shares, and audio. They're saved to your Recordings page after the session ends. Recording costs credits based on duration. You can download or share recordings later. Participants are notified when recording is active.",
  },
]

const creditsEconomyFAQs: FAQItem[] = [
  {
    question: "How do I earn credits?",
    answer: "Earn credits through: Daily login streaks (5-50 credits), completing daily challenges, hosting popular sessions, receiving tips from other users, referring friends (500 credits per signup), and participating in community events. Active contributors earn more credits over time.",
  },
  {
    question: "What do I use credits for?",
    answer: "Credits unlock: Session boosts (higher quality, longer duration), tipping other creators, premium backgrounds and effects, priority support, extended recording storage, and special badges. Basic features like creating and joining sessions remain free.",
  },
  {
    question: "What is session boost pricing?",
    answer: "Session boosts cost 100-500 credits based on duration and quality. A 2-hour HD boost costs 200 credits. 4K quality costs more. Boosts increase video quality, reduce compression, and extend session time limits. You can boost your own sessions or tip credits to boost others' sessions.",
  },
  {
    question: "How do I tip other users?",
    answer: "During or after a session, click the tip icon next to a user's name. Choose an amount (minimum 10 credits). Add an optional message. Tips go directly to the user and help support creators. Top tippers may receive badges and recognition in the community.",
  },
  {
    question: "What are referral rewards?",
    answer: "Share your unique referral code from Settings > Invites. When someone signs up using your code and completes onboarding, you both receive 500 credits. Active users get more invite codes to share. Track your referrals and earnings on your profile.",
  },
  {
    question: "Do credits expire?",
    answer: "Credits never expire as long as your account remains active. Inactive accounts (no login for 6+ months) may have credits frozen until you return. There's no limit to how many credits you can accumulate. Credits cannot be purchased or exchanged for real money.",
  },
  {
    question: "Can I transfer credits to other users?",
    answer: "You can send credits through the tipping system but cannot directly transfer large amounts. This prevents abuse and maintains economic balance. To support someone, tip them during sessions or contribute to their boosted sessions.",
  },
]

const communityRoomsFAQs: FAQItem[] = [
  {
    question: "What are community rooms?",
    answer: "Community rooms are persistent spaces for specific topics or interests (e.g., 'JavaScript Developers', 'Game Design', 'Startup Founders'). They feature discussion boards, scheduled sessions, shared resources, and member-only content. Join rooms to connect with like-minded creators.",
  },
  {
    question: "How do I join a community room?",
    answer: "Browse rooms on the Community page. Click 'Join' on any public room. Some rooms require approval from moderators or have invite-only access. Once joined, you'll see room activity in your feed and can participate in discussions and sessions.",
  },
  {
    question: "How do I create a discussion topic?",
    answer: "Inside a community room, click 'New Topic'. Add a title, description, and tags. Topics can be questions, announcements, or discussion starters. Other members can reply, react, and schedule related sessions. Popular topics get pinned by moderators.",
  },
  {
    question: "How do I stream on a topic?",
    answer: "When creating a session, link it to a specific community room and topic. This notifies room members and adds your session to the topic's activity. Topic-based sessions get more visibility and engagement from interested viewers.",
  },
  {
    question: "What is room moderation?",
    answer: "Room moderators maintain quality and safety. They can pin/unpin topics, remove inappropriate content, approve join requests, and ban rule-breakers. Report issues to moderators using the flag icon. Moderators are trusted community members selected by room creators.",
  },
  {
    question: "Can I create my own community room?",
    answer: "Yes! Users with good standing (account age, credit balance, no violations) can create rooms. Click 'Create Room' on the Community page. Choose a name, description, category, and visibility. You'll become the room admin and can invite moderators. Room creation may require credits.",
  },
  {
    question: "How do I find rooms related to my interests?",
    answer: "Use the search bar on the Community page or filter by category tags. Browse 'Trending' rooms or check 'Recommended' based on your activity. You can also find rooms mentioned in sessions or linked by other users.",
  },
]

const troubleshootingFAQs: FAQItem[] = [
  {
    question: "My camera or microphone isn't working. What should I do?",
    answer: "First, check browser permissions: click the lock icon in the address bar and allow camera/microphone access. Ensure no other app is using your devices. Try refreshing the page or restarting your browser. Check system settings to verify the correct devices are selected. If issues persist, try a different browser (Chrome recommended).",
  },
  {
    question: "I can't join a session. What's wrong?",
    answer: "Common causes: Session is full (check participant limit), you're not logged in, session is private and requires invite, or network connectivity issues. Try refreshing the page. If the 'Join' button is disabled, hover for details. Check your internet connection. For private sessions, ask the host for an invite link.",
  },
  {
    question: "Video quality is poor or laggy. How can I improve it?",
    answer: "Open diagnostics (gear icon in session) to check your network stats. Close bandwidth-heavy apps and downloads. Switch to wired ethernet if possible. Reduce video quality in settings (gear icon > Quality). Close unnecessary browser tabs. If presenting, consider turning off camera to prioritize screen share. Viewers automatically get optimized HLS quality.",
  },
  {
    question: "How do I report technical issues or bugs?",
    answer: "Click your profile menu > Settings > Privacy > Report an Issue. Describe the problem, include steps to reproduce, and attach screenshots if relevant. For urgent issues affecting live sessions, use the 'Report Issue' button in the session controls. Our team investigates all reports.",
  },
  {
    question: "Which browsers are compatible with Kulti?",
    answer: "Fully supported: Chrome 90+, Edge 90+, Safari 14+, Firefox 88+. Best experience on Chrome/Edge. Mobile: iOS 14+ (Safari), Android 9+ (Chrome). WebRTC features require modern browsers. If using an unsupported browser, you'll see a warning and may experience issues. Update your browser for the best experience.",
  },
  {
    question: "Audio echo or feedback in sessions. How do I fix it?",
    answer: "Always use headphones when presenting to prevent echo. Ensure only one tab/window has the session open. Check that system audio isn't routing back through the microphone. Lower speaker volume. Enable echo cancellation in session settings (gear icon > Audio Settings). If others hear echo, ask them to use headphones.",
  },
  {
    question: "I'm seeing 'Connection Lost' errors. What should I do?",
    answer: "This indicates network instability. Check your internet connection. Try switching between WiFi and mobile data. Close background apps using bandwidth. If on VPN, try disabling it. The session will attempt to reconnect automatically. If errors persist, check your router settings or contact your ISP. Wired connections are more stable than WiFi.",
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const allSections = [
    { title: "Getting Started", items: gettingStartedFAQs },
    { title: "Sessions & Streaming", items: sessionsStreamingFAQs },
    { title: "Credits & Economy", items: creditsEconomyFAQs },
    { title: "Community & Rooms", items: communityRoomsFAQs },
    { title: "Troubleshooting", items: troubleshootingFAQs },
  ]

  const totalQuestions = allSections.reduce((sum, section) => sum + section.items.length, 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-lime-400/10 rounded-xl">
              <HelpCircle className="w-8 h-8 text-lime-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-mono">
              Help Center
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-[#a1a1aa]">
            Find answers to common questions about using Kulti
          </p>
          <p className="text-sm text-[#71717a] mt-2">
            {totalQuestions} articles across {allSections.length} categories
          </p>
        </div>

        {/* Search */}
        <div className="mb-8 sm:mb-12">
          <SearchHelp onSearch={setSearchQuery} />
        </div>

        {/* FAQ Sections */}
        <div>
          {allSections.map((section) => (
            <FAQSection
              key={section.title}
              title={section.title}
              items={section.items}
              searchQuery={searchQuery}
            />
          ))}

          {/* No Results Message */}
          {searchQuery &&
            allSections.every(
              (section) =>
                section.items.filter(
                  (item) =>
                    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0
            ) && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1a1a1a] rounded-full mb-4">
                  <HelpCircle className="w-8 h-8 text-[#a1a1aa]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                <p className="text-[#a1a1aa] mb-6">
                  We couldn't find any articles matching "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
        </div>

        {/* Still Need Help */}
        <div className="mt-12 p-6 sm:p-8 bg-[#1a1a1a] border border-[#27272a] rounded-xl">
          <h2 className="text-2xl font-bold font-mono mb-3">Still need help?</h2>
          <p className="text-[#a1a1aa] mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/settings"
              className="flex-1 px-6 py-3 bg-lime-400 hover:bg-lime-500 text-black font-bold rounded-lg transition-colors text-center"
            >
              Contact Support
            </a>
            <a
              href="/community"
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold rounded-lg transition-colors text-center border border-[#27272a]"
            >
              Join Community
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
