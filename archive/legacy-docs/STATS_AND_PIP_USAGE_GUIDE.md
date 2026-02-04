# Stats Panel & Picture-in-Picture - Usage Guide

## Quick Start

Two new features have been added to improve the session experience:

### 1. Stats Panel - Performance Monitoring

**Location:** Bottom-right corner of the video area (above the controls bar)

**How to Use:**
1. Click the "Stats for Nerds" button to expand the panel
2. View real-time performance metrics for your connection
3. Click again to collapse the panel

**What You'll See:**

#### Video Metrics
- **Bitrate** - How much data is being transmitted (higher = better quality)
- **Frame Rate (fps)** - Smoothness of video (30-60 fps is good)
- **Resolution** - Video dimensions (1280x720, 1920x1080, etc.)
- **Packet Loss** - Lost data packets (0% is ideal, >5% shows in red)
- **Jitter** - Network instability (lower is better, >50ms shows yellow)
- **RTT (Round-Trip Time)** - Network latency (< 100ms = green, < 200ms = yellow, > 200ms = red)

#### Audio Metrics
- Same metrics as video but for audio track
- Lower thresholds for warnings (audio is more sensitive)

#### Connection Info
- **Total Bitrate** - Combined video + audio
- **Available Bandwidth** - Your connection capacity

**When to Use It:**
- Experiencing lag or choppy video
- Debugging connection issues
- Checking if your internet can handle the stream
- Monitoring network quality during important presentations

**Color Coding:**
- **White** - Normal/Good
- **Yellow** - Warning (moderate issues)
- **Red** - Problem (significant issues)

---

### 2. Picture-in-Picture - Multitask While Watching

**Location:** Controls bar at the bottom (rightmost button)

**How to Use:**
1. Click the PiP icon (overlapping rectangles)
2. Video pops out into a floating window
3. Resize and move the window as needed
4. Click the PiP button again (or X on the window) to exit

**Browser Support:**
- ✅ Chrome/Edge (Windows, Mac, Linux)
- ✅ Firefox (Windows, Mac, Linux)
- ✅ Safari (macOS, iOS)
- ❌ Button hidden on unsupported browsers

**Use Cases:**
- Browse other tabs while watching the session
- Take notes in another window
- Monitor session while working on something else
- Multi-screen workflow without needing multiple monitors

**Features:**
- Audio continues playing in PiP mode
- Window stays on top of other apps
- Automatically adjusts to optimal size
- Toast notifications when entering/exiting

**Tips:**
- PiP window can be moved to any screen edge
- Double-click to resize on some browsers
- Works with screen recording tools
- Continues earning credits while in PiP mode

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Stats Panel | Click "Stats for Nerds" button |
| Close Stats Panel | Click button again |
| Toggle PiP | Click PiP button in controls |
| Exit PiP | Escape key (some browsers) |

---

## Troubleshooting

### Stats Panel

**Problem:** Stats panel is empty
- **Solution:** Make sure your camera/microphone is enabled
- Check that you're successfully connected to the session

**Problem:** High packet loss (red)
- **Solution:** Check your internet connection
- Try disabling other bandwidth-intensive apps
- Consider switching to a wired connection

**Problem:** High jitter (yellow/red)
- **Solution:** Network instability detected
- Close background downloads/uploads
- Check if others on your network are using bandwidth

**Problem:** High RTT (red)
- **Solution:** Network latency is high
- You may be far from the server
- Try restarting your router
- Contact your ISP if consistent

### Picture-in-Picture

**Problem:** PiP button doesn't appear
- **Solution:** Your browser doesn't support PiP
- Try updating to the latest browser version
- Use Chrome, Firefox, or Safari

**Problem:** PiP activates but shows black screen
- **Solution:** No video track is available
- Enable your camera or wait for host to share screen

**Problem:** PiP closes immediately
- **Solution:** Another app may be blocking PiP
- Check browser permissions for PiP
- Try disabling browser extensions

**Problem:** Can't hear audio in PiP
- **Solution:** Check system volume settings
- Verify microphone/speaker aren't muted in session
- Try exiting and re-entering PiP

---

## Developer Notes

### Stats Panel Implementation
```typescript
import { StatsPanel } from "@/components/session/stats-panel"

// In your session component:
<div className="relative">
  <VideoGrid />
  <Controls />
  <StatsPanel /> {/* Fixed position, bottom-right */}
</div>
```

### Picture-in-Picture Implementation
```typescript
const togglePip = async () => {
  if (isPipEnabled) {
    await document.exitPictureInPicture()
  } else {
    const video = document.querySelector('video')
    await video.requestPictureInPicture()
  }
}
```

### Key Dependencies
- `@100mslive/react-sdk` - HMS stats store
- `lucide-react` - Icons
- Native browser PiP API (no external deps)

---

## Privacy & Security

### Stats Panel
- ✅ Shows only YOUR connection metrics
- ✅ No data is sent to external servers
- ✅ Stats are computed locally in real-time
- ✅ No performance impact when collapsed

### Picture-in-Picture
- ✅ Uses browser's native PiP (secure)
- ✅ No screen recording or data collection
- ✅ Video stream is not duplicated
- ✅ Respects all session permissions

---

## Feedback

If you experience issues with these features:
1. Check the browser console for errors
2. Verify your browser version
3. Try disabling browser extensions
4. Report the issue with:
   - Browser name and version
   - Operating system
   - Steps to reproduce
   - Screenshot if applicable

---

## Coming Soon

### Stats Panel
- 📊 Historical stats graph
- 📈 Network quality score
- 💾 Export stats to CSV
- 🔄 Peer comparison view

### Picture-in-Picture
- 🎛️ Controls in PiP window
- 📌 Auto-PiP on tab switch
- 🖼️ Multi-video PiP support
- 💾 Remember window position

---

Last Updated: 2025-11-11
Version: 1.0.0
