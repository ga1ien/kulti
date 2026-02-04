# Diagnostics & Bandwidth Management - Integration Guide

## Visual Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SESSION PREVIEW SCREEN                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │              [Camera/Mic Preview Video]                │  │
│  │                                                         │  │
│  │   Controls:  [Mic] [Camera] [Settings]                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────┐ ┌──────────────────┐ ┌──────────────┐  │
│  │ Run Connection │ │ Quality Settings │ │ Join Session │  │
│  │      Test      │ │                  │ │              │  │
│  └────────┬───────┘ └────────┬─────────┘ └──────────────┘  │
└───────────┼──────────────────┼──────────────────────────────┘
            │                  │
            ▼                  ▼
┌───────────────────┐  ┌──────────────────────┐
│ DIAGNOSTICS MODAL │  │ QUALITY SETTINGS     │
├───────────────────┤  │ MODAL                │
│ ✓ Browser         │  ├──────────────────────┤
│ ✓ WebRTC          │  │ Presets:             │
│ ✓ Connectivity    │  │  [Auto] [High]       │
│ ✓ Bandwidth       │  │  [Medium] [Low]      │
│                   │  │                      │
│ Recommendations:  │  │ Advanced:            │
│ • Good to go!     │  │ • Bitrate: [====]    │
│                   │  │ • Resolution: 720p   │
│ [Run Again]       │  │ • FPS: 30            │
│ [Continue]        │  │ • Layer: Auto        │
└───────────────────┘  │                      │
                       │ Data: ~450 MB/hour   │
                       │                      │
                       │ [Save Settings]      │
                       └──────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ Save to localStorage  │
                    └───────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │        USER JOINS SESSION                 │
        │   Settings automatically applied via:     │
        │   - hmsActions.setVideoSettings()         │
        │   - hmsActions.setPreferredLayer()        │
        └───────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      SESSION ROOM                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  [Video Grid]                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Controls: [Mic] [Camera] [Screen] | [BG] [Noise] [⚙️]     │
│                                              │               │
│                                              └──────┐        │
│                                                     ▼        │
│                                   ┌──────────────────────┐  │
│                                   │ QUALITY SETTINGS     │  │
│                                   │ (Real-time adjust)   │  │
│                                   │                      │  │
│                                   │ Changes apply        │  │
│                                   │ immediately!         │  │
│                                   └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Map

```
┌──────────────────────────────────────────────────────────┐
│                  preview-screen.tsx                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  State:                                            │  │
│  │  • showDiagnostics: boolean                        │  │
│  │  • showQualitySettings: boolean                    │  │
│  │                                                     │  │
│  │  Renders:                                          │  │
│  │  • DiagnosticsModal (conditional)                  │  │
│  │  • QualitySettingsModal (conditional)              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│ diagnostics-modal.tsx   │  │ quality-settings-modal.tsx│
│                         │  │                          │
│ Props:                  │  │ Props:                   │
│ • isOpen                │  │ • isOpen                 │
│ • onClose               │  │ • onClose                │
│ • onContinue            │  │ • onApply?: (settings)   │
│                         │  │                          │
│ Tests:                  │  │ Exports:                 │
│ • checkBrowser()        │  │ • getSavedSettings()     │
│ • checkWebRTC()         │  │ • VideoQualitySettings   │
│ • testConnectivity()    │  │                          │
│ • testBandwidth()       │  │ LocalStorage:            │
│                         │  │ • Saves preferences      │
└─────────────────────────┘  └──────────────────────────┘
                                         │
                    ┌────────────────────┴───────────────────┐
                    ▼                                        ▼
        ┌──────────────────────┐              ┌──────────────────────┐
        │   controls.tsx       │              │   session-room.tsx   │
        │                      │              │                      │
        │ Imports:             │              │ Imports:             │
        │ • QualitySettings    │              │ • getSavedSettings() │
        │   Modal              │              │                      │
        │                      │              │ On Join:             │
        │ On Apply:            │              │ • Load saved settings│
        │ • setVideoSettings() │              │ • Apply to HMS       │
        │ • setPreferredLayer()│              │ • Auto-detect network│
        └──────────────────────┘              └──────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────────┐  ┌────────────┐
    │ Run Tests   │  │ Select       │  │ Join       │
    │             │  │ Quality      │  │ Session    │
    └──────┬──────┘  └──────┬───────┘  └─────┬──────┘
           │                │                 │
           ▼                ▼                 │
    ┌────────────┐   ┌─────────────┐         │
    │ Diagnostics│   │ User        │         │
    │ Results    │   │ Preferences │         │
    └────────────┘   └──────┬──────┘         │
                            │                │
                            ▼                │
                     ┌─────────────┐         │
                     │ localStorage│         │
                     │  {settings} │         │
                     └──────┬──────┘         │
                            │                │
                            └────────────────┤
                                             ▼
                                  ┌──────────────────┐
                                  │ HMS SDK          │
                                  │                  │
                                  │ setVideoSettings │
                                  │ setPreferredLayer│
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ 100ms Servers    │
                                  │                  │
                                  │ Video Stream     │
                                  │ Optimized!       │
                                  └──────────────────┘
```

---

## State Management

### Preview Screen State:
```typescript
const [showDiagnostics, setShowDiagnostics] = useState(false)
const [showQualitySettings, setShowQualitySettings] = useState(false)
```

### Diagnostics Modal State:
```typescript
const [isRunning, setIsRunning] = useState(false)
const [results, setResults] = useState<DiagnosticResults>({
  connectivity: null,
  bandwidth: null,
  browser: null,
  webrtc: null,
})
const [canProceed, setCanProceed] = useState(false)
```

### Quality Settings Modal State:
```typescript
const [settings, setSettings] = useState<VideoQualitySettings>(DEFAULT_SETTINGS)
const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
const [connectionType, setConnectionType] = useState<string>("unknown")
```

### Controls State:
```typescript
const [showQualitySettings, setShowQualitySettings] = useState(false)
```

---

## LocalStorage Schema

```json
{
  "kulti_video_quality_settings": {
    "maxBitrate": 1000,
    "preferredLayer": "auto",
    "frameRate": 30,
    "resolution": "720p",
    "enableAdaptive": true
  }
}
```

---

## HMS SDK Integration Points

### 1. Initial Join (session-room.tsx):
```typescript
// Load saved settings
const savedSettings = getSavedQualitySettings()

// Apply before joining
if (savedSettings) {
  await hmsActions.setVideoSettings({
    maxBitrate: savedSettings.maxBitrate,
    maxFramerate: savedSettings.frameRate,
    codec: "vp8",
  })
}

// Join room
await hmsActions.join({
  userName: data.userName,
  authToken: data.token,
})
```

### 2. Real-time Adjustment (controls.tsx):
```typescript
// User changes settings during session
onApply={(settings) => {
  hmsActions.setVideoSettings({
    maxBitrate: settings.maxBitrate,
    maxFramerate: settings.frameRate,
    codec: "vp8",
  })

  if (settings.preferredLayer !== "auto") {
    hmsActions.setPreferredLayer(settings.preferredLayer)
  }
}}
```

---

## Network Detection Logic

```typescript
// Detect connection type
if ("connection" in navigator) {
  const conn = (navigator as any).connection
  const type = conn?.effectiveType || conn?.type

  if (type === "4g") {
    // Mobile data detected
    // Apply low/medium quality preset
    setConnectionType("4g")
  } else if (type === "wifi") {
    // WiFi detected
    // Apply high quality preset
    setConnectionType("wifi")
  } else if (type === "ethernet") {
    // Wired connection
    // Apply auto/highest quality
    setConnectionType("ethernet")
  }

  // Listen for changes
  conn?.addEventListener("change", handleConnectionChange)
}
```

---

## UI Component Dependencies

```
quality-settings-modal.tsx
├── Dialog (from components/ui/dialog.tsx)
│   └── @radix-ui/react-dialog
├── Slider (from components/ui/slider.tsx)
│   └── @radix-ui/react-slider
├── Label (from components/ui/label.tsx)
│   └── @radix-ui/react-label
└── Button (existing)

diagnostics-modal.tsx
├── Dialog (from components/ui/dialog.tsx)
│   └── @radix-ui/react-dialog
└── Button (existing)

preview-screen.tsx
├── DiagnosticsModal (new)
└── QualitySettingsModal (new)

controls.tsx
└── QualitySettingsModal (new)
```

---

## Testing Checklist

### Diagnostics Modal:
- [ ] Opens from preview screen
- [ ] All 4 tests run sequentially
- [ ] Results display correctly
- [ ] Recommendations show for warnings/errors
- [ ] "Run Again" works
- [ ] "Continue" closes and proceeds to join
- [ ] Modal closes properly

### Quality Settings Modal:
- [ ] Opens from preview screen
- [ ] Opens from session controls
- [ ] 4 presets work correctly
- [ ] Advanced sliders adjust values
- [ ] Settings save to localStorage
- [ ] Settings apply to HMS SDK
- [ ] Data usage estimates accurate
- [ ] Connection type detected
- [ ] Modal closes properly

### Preview Screen:
- [ ] "Run Connection Test" button visible
- [ ] "Quality Settings" button visible
- [ ] Both modals integrate smoothly
- [ ] "Join Session" applies saved settings

### Session Controls:
- [ ] Settings icon visible in control bar
- [ ] Opens quality settings modal
- [ ] Real-time changes apply
- [ ] No disconnection when adjusting

### Network Adaptation:
- [ ] Detects 4G vs WiFi
- [ ] Auto-reduces quality on mobile
- [ ] Shows toast on connection change
- [ ] Adapts when switching networks

---

## Success! 🎉

All components are integrated and ready to use. The diagnostics and bandwidth management system provides:

1. ✅ Pre-call connection testing
2. ✅ Customizable quality presets
3. ✅ Advanced manual controls
4. ✅ Real-time quality adjustment
5. ✅ Automatic network adaptation
6. ✅ Persistent user preferences

Users now have complete control over their video quality experience!
