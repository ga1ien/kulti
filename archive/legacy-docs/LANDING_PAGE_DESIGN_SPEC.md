# Kulti Landing Page - Design & Implementation Spec

**For Claude Code**

---

## BRAND FOUNDATION

### Design Philosophy
- **Raw & Authentic** - No polish, no performance, just real building
- **Code-Editor Aesthetic** - Dark mode, monospace fonts, terminal vibes
- **Minimal & Utilitarian** - Function over form, clarity over decoration
- **Movement > Product** - This is about a cultural shift, not features

### Color Palette
```css
--background: #0a0a0a       /* Near black */
--surface: #1a1a1a          /* Elevated surfaces */
--primary: #00ff88          /* Electric green - call to action */
--text-primary: #ffffff     /* White */
--text-secondary: #a1a1aa   /* Gray - secondary text */
--border: #27272a           /* Subtle borders */
```

### Typography
- **Headlines:** JetBrains Mono (monospace) - Bold, technical feel
- **Body:** Inter (sans-serif) - Clean, readable
- **Code/Terminal:** JetBrains Mono

### Visual References
- Apple's spatial design language (depth, glass)
- Linear's clean product UI
- Vercel's dark mode aesthetic
- Terminal/code editor vibes (raw, authentic)

---

## PAGE STRUCTURE

### Section 1: HERO (Above the Fold)
**Goal:** Immediately communicate the movement + cultural shift

**Layout:**
```
┌─────────────────────────────────────────┐
│  LOGO (top left)    JOIN BETA (top right) │
│                                         │
│         Build The Future, Live          │
│                                         │
│  You're living through the biggest      │
│  shift in how things get made.          │
│                                         │
│  AI just showed up. Changed everything. │
│  Overnight.                             │
│                                         │
│           [Get Early Access]            │
│                                         │
│  [Visual: Dark terminal/workspace]      │
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Hero headline: 80-100px, JetBrains Mono Bold, center-aligned
- Body text: 20-24px, Inter, max-width 800px, center-aligned
- CTA button: Large (56px height), electric green (#00ff88), black text
- Background: Pure black (#0a0a0a)
- Visual: Actual screenshot of workspace - terminal open, Claude chat visible, code in progress
  - NOT a mockup, NOT polished
  - Show multiple windows/tabs
  - Show the beautiful chaos of real building
  - Subtle spotlight effect on the visual

**Interaction:**
- Slow parallax scroll on background visual
- CTA button: Slight glow on hover, scales to 1.02

---

### Section 2: THE MOMENT
**Goal:** Frame the historical context - this is the AI generation

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Your grandparents built cars on        │
│  assembly lines.                        │
│                                         │
│  Your parents built companies           │
│  in offices.                            │
│                                         │
│  You're building the future with AI     │
│  in your bedroom.                       │
│                                         │
│  And nobody's watching.                 │
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Typography hierarchy: Each line builds in size
  - First two lines: 32px, text-secondary color
  - Third line: 48px, text-primary color, **bold**
  - Last line: 32px, primary green color (#00ff88)
- Max-width: 900px, center-aligned
- Spacing: Generous vertical rhythm (40px between lines)
- Background: Subtle gradient from black to very dark gray

**Interaction:**
- Fade in on scroll, stagger each line by 0.1s

---

### Section 3: WHAT THIS IS
**Goal:** Define Kulti without jargon

**Layout:**
```
┌─────────────────────────────────────────┐
│           This Is Kulti                 │
│                                         │
│  The place where the future gets        │
│  built. Together. Live.                 │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ WATCH   │  │ BUILD   │  │ BECOME  ││
│  │         │  │         │  │         ││
│  │ Drop    │  │ Go live │  │ Your    ││
│  │ into    │  │ Build   │  │ first   ││
│  │ live    │  │ with    │  │ session ││
│  │ sessions│  │ others  │  │ you watch││
│  └─────────┘  └─────────┘  └─────────┘│
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Section headline: 56px, JetBrains Mono Bold
- Subheadline: 28px, Inter
- Three cards:
  - Glass-morphism effect (backdrop-blur, subtle border)
  - Padding: 48px
  - Background: rgba(26, 26, 26, 0.5)
  - Border: 1px solid rgba(255, 255, 255, 0.1)
  - Border-radius: 16px
- Card titles: 24px, JetBrains Mono Bold, primary green
- Card body: 18px, Inter, text-secondary
- Grid: 3 columns, 32px gap

**Interaction:**
- Cards hover: Lift effect (translateY(-4px)), border glows green
- Smooth transitions (0.3s ease)

---

### Section 4: WHY THIS MATTERS
**Goal:** Elevate to movement/mission level

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│         This Is History Happening       │
│                                         │
│  The first generation building with AI. │
│  The first time creation is this        │
│  collaborative.                         │
│                                         │
│  And it's happening in silence.         │
│                                         │
│  Not anymore.                           │
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Full-bleed section with gradient background
  - From #0a0a0a to #1a1a1a
- Headline: 64px, JetBrains Mono Bold, center
- Body text: 32px, Inter, center, max-width 800px
- "Not anymore." - 48px, primary green, **bold**
- Generous padding (120px top/bottom)

**Interaction:**
- Fade in with scale animation (0.95 → 1.0)

---

### Section 5: THE SHIFT
**Goal:** Cultural comparison - we watch everything else, why not this?

**Layout:**
```
┌─────────────────────────────────────────┐
│  We watch people game.                  │
│  We watch people cook.                  │
│  We watch people react to things.       │
│                                         │
│  But the people building the future?    │
│  Using AI to create things that have    │
│  never existed?                         │
│  Making history in real-time?           │
│                                         │
│  That's not a stream.                   │
│  That's not content.                    │
│                                         │
│  That's the story of our generation.    │
│                                         │
│  And it deserves to be seen.            │
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Two-column layout (desktop), single column (mobile)
- Left: "We watch..." statements - 24px, text-secondary
- Right: "But the people..." - 28px, text-primary, building tension
- Bottom: "That's the story..." - 40px, primary green, center, **bold**
- Background: Solid black with subtle noise texture

**Interaction:**
- Highlight each line as user scrolls through section

---

### Section 6: WAITLIST
**Goal:** Convert - make joining feel important, not transactional

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│       Join The Movement                 │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ Email                          │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ What you're building           │    │
│  └────────────────────────────────┘    │
│                                         │
│       [I'm Building]                    │
│                                         │
│  December 2025. Invite-only.            │
│  Be part of the first wave.             │
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Headline: 56px, JetBrains Mono Bold, center
- Form inputs:
  - Background: rgba(26, 26, 26, 0.8)
  - Border: 1px solid #27272a
  - Border-radius: 12px
  - Padding: 20px
  - Font: 18px Inter
  - Focus state: Border glows green, outline removed
  - Placeholder text: text-secondary
- CTA button:
  - Full width on mobile, fixed width (400px) on desktop
  - Height: 64px
  - Background: Electric green (#00ff88)
  - Text: Black, bold, 20px
  - Border-radius: 12px
- Subtext: 16px, text-secondary, center

**Interaction:**
- Form validation: Real-time, non-intrusive
- Success state: Replace form with:
  ```
  Welcome to the movement.

  You're #234.

  We'll email you when it's time.
  Follow @kulti - we're building this live.
  ```
  - Fade in animation
  - Confetti effect (subtle, minimal)

---

### Section 7: FOOTER
**Goal:** Simple, minimal, on-brand

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Follow @kulti - We're building this live│
│                                         │
│  Built in public. Powered by 100ms.     │
│                                         │
│  "The most creative generation in       │
│   history shouldn't build in silence."  │
│                                         │
│  © 2025 Kulti                           │
│                                         │
└─────────────────────────────────────────┘
```

**Design Details:**
- Background: Pure black (#0a0a0a)
- Padding: 80px vertical
- Text: Center-aligned
- Twitter link: Primary green, underline on hover
- Quote: Italic, 20px, text-secondary
- Copyright: 14px, very subtle gray

---

## RESPONSIVE DESIGN

### Mobile (< 768px)
- Single column layouts
- Hero headline: 48px
- Section headlines: 40px
- Body text: 18px
- Cards stack vertically with 24px gap
- Form: Full width with 16px side padding
- Reduce vertical spacing by 30%

### Tablet (768px - 1024px)
- Maintain 2-column layouts where applicable
- Scale typography down 10%
- Maintain core spacing

### Desktop (> 1024px)
- Max content width: 1400px
- Center all content
- Full-width sections with inner content constraint

---

## ANIMATIONS & INTERACTIONS

### Page Load
- Fade in hero content (0.6s ease-out)
- Stagger hero elements (headline → body → CTA) by 0.1s

### Scroll Animations
- Trigger when element is 20% visible in viewport
- Fade in + slight translate up (20px)
- Duration: 0.6s ease-out
- Stagger children elements by 0.05s

### Hover States
- Buttons: Scale 1.02, add subtle glow
- Cards: Lift (translateY(-4px)), green border glow
- Links: Underline slide-in from left
- All transitions: 0.3s cubic-bezier(0.4, 0, 0.2, 1)

### Focus States
- Visible outline using primary green
- Offset by 2px
- Never remove focus indicators

---

## TECHNICAL IMPLEMENTATION

### Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS v4
- **Animations:** Framer Motion (optional) or CSS animations
- **Forms:** React Hook Form + Zod validation
- **API:** Next.js API routes → Supabase waitlist table

### File Structure
```
app/
  page.tsx                    # Landing page
  layout.tsx                  # Root layout
components/
  landing/
    hero.tsx
    the-moment.tsx
    what-this-is.tsx
    why-this-matters.tsx
    the-shift.tsx
    waitlist-form.tsx
    footer.tsx
  ui/
    button.tsx
    input.tsx
public/
  images/
    workspace-hero.png        # Hero visual
```

### Database Schema
```sql
-- Add to existing Supabase tables
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  what_building TEXT,
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-increment position
CREATE OR REPLACE FUNCTION increment_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  NEW.position := (SELECT COALESCE(MAX(position), 0) + 1 FROM waitlist);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_waitlist_position
BEFORE INSERT ON waitlist
FOR EACH ROW
EXECUTE FUNCTION increment_waitlist_position();
```

### Key Components

**WaitlistForm.tsx:**
```typescript
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  whatBuilding: z.string().min(1, "Tell us what you're building").max(200)
})

export function WaitlistForm() {
  const [success, setSuccess] = useState(false)
  const [position, setPosition] = useState<number | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    setPosition(result.position)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-4xl font-bold">Welcome to the movement.</h3>
        <p className="text-2xl">You're #{position}.</p>
        <p className="text-text-secondary">
          We'll email you when it's time.<br />
          Follow <a href="https://twitter.com/kulti" className="text-primary underline">@kulti</a> - we're building this live.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl mx-auto">
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Email"
          className="w-full bg-surface border border-border rounded-xl px-6 py-5 text-lg focus:border-primary focus:outline-none transition-colors"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-2">{errors.email.message}</p>
        )}
      </div>

      <div>
        <input
          {...register("whatBuilding")}
          placeholder="What you're building"
          className="w-full bg-surface border border-border rounded-xl px-6 py-5 text-lg focus:border-primary focus:outline-none transition-colors"
        />
        {errors.whatBuilding && (
          <p className="text-red-500 text-sm mt-2">{errors.whatBuilding.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-black font-bold text-xl py-5 rounded-xl hover:scale-102 transition-transform disabled:opacity-50"
      >
        {isSubmitting ? "Joining..." : "I'm Building"}
      </button>

      <p className="text-center text-text-secondary text-sm">
        December 2025. Invite-only.<br />
        Be part of the first wave.
      </p>
    </form>
  )
}
```

### API Route

**app/api/waitlist/route.ts:**
```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, whatBuilding } = body

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email,
        what_building: whatBuilding
      })
      .select("position")
      .single()

    if (error) {
      if (error.code === '23505') { // Duplicate email
        return NextResponse.json(
          { error: "Email already on waitlist" },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      position: data.position
    })

  } catch (error) {
    console.error("Waitlist error:", error)
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    )
  }
}
```

---

## COPY GUIDELINES

### Voice & Tone
- **Direct** - No fluff, say it straight
- **Urgent** - This moment matters
- **Inclusive** - "We" not "you"
- **Confident** - This is happening
- **Human** - Write like you talk

### What to Avoid
- Corporate jargon ("synergy", "innovative", "revolutionize")
- Superlatives ("best", "most", "leading")
- False scarcity ("only 10 spots!")
- Apologizing or hedging
- Over-explaining

### Key Messages
1. This is a historical moment (AI generation)
2. The most creative generation builds in silence (problem)
3. That changes now (solution)
4. This is a movement, not a product (positioning)
5. You're early (FOMO, but earned)

---

## ACCESSIBILITY

### Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Focus indicators always visible
- Color contrast ratio > 4.5:1 for text
- Alt text for all images
- Semantic HTML (header, main, section, footer)
- Form labels and error messages properly associated

### Testing Checklist
- [ ] Tab through entire page
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Check color contrast with tool
- [ ] Test at 200% zoom
- [ ] Verify form validation messages are announced

---

## PERFORMANCE

### Targets
- Lighthouse score: 95+ (all categories)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

### Optimization
- Lazy load below-fold images
- Preload hero image
- Minimize JavaScript bundle
- Use next/image for all images
- Defer non-critical CSS
- Enable compression

---

## LAUNCH CHECKLIST

### Pre-Launch
- [ ] All copy reviewed and approved
- [ ] Visual assets optimized
- [ ] Forms tested (happy path + errors)
- [ ] Mobile responsive tested on real devices
- [ ] Analytics tracking implemented (PostHog/Plausible)
- [ ] Email confirmation set up
- [ ] Social meta tags configured
- [ ] Favicon and app icons added

### Go-Live
- [ ] DNS configured
- [ ] SSL certificate active
- [ ] Waitlist API tested in production
- [ ] Monitor error logs
- [ ] Test from external network
- [ ] Submit to Google Search Console

---

## MEASUREMENT

### Key Metrics
- Waitlist signups
- Conversion rate (visitors → signups)
- Time on page
- Scroll depth
- Source traffic (where they're coming from)

### Analytics Events
```javascript
// Track key interactions
analytics.track("viewed_hero")
analytics.track("scrolled_to_waitlist")
analytics.track("started_signup")
analytics.track("completed_signup", { position: 234 })
```

---

**This spec is ready to hand to Claude Code for implementation.**

**The goal: Make people feel the moment. Make joining feel important. Make the movement feel inevitable.**

**Ship it.**
