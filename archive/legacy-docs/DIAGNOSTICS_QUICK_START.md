# Diagnostics and Bandwidth Management - Quick Start

## Installation Complete

All components and dependencies have been installed. Here's how users will interact with the new features:

## For Users

### Before Joining a Session:

1. **Navigate to session preview**
   - You'll see your camera/microphone preview
   - Device controls at the bottom

2. **Run Connection Test** (Recommended)
   - Click "Run Connection Test" button
   - Wait 3-5 seconds for diagnostics
   - Review results:
     - ✅ Green = Good to go
     - ⚠️ Yellow = Proceed with caution
     - ❌ Red = Fix issues first
   - Follow recommendations if any issues detected

3. **Adjust Quality Settings** (Optional)
   - Click "Quality Settings" button
   - Choose a preset:
     - **Auto**: Adapts automatically (recommended)
     - **High**: Best quality (WiFi/Ethernet)
     - **Medium**: Balanced (Good WiFi)
     - **Low**: Data saver (Mobile/Slow connection)
   - Or customize advanced settings
   - Click "Save Settings"

4. **Join Session**
   - Click "Join Session" button
   - Settings apply automatically

### During a Session:

1. **Access Quality Settings**
   - Click the Settings icon (⚙️) in the control bar
   - Adjust quality in real-time
   - Changes apply immediately without reconnecting

2. **Connection Monitoring**
   - System auto-detects connection changes
   - Notifications show when switching networks
   - Quality adjusts automatically if enabled

---

## Component Architecture

### User Flow:
```
Preview Screen
    ↓
    ├─→ Run Diagnostics → Results → Recommendations
    │                                    ↓
    ├─→ Quality Settings → Presets/Custom → Save
    │                                    ↓
    └─→ Join Session → Settings Applied
              ↓
        Session Room
              ↓
        Settings Button → Adjust Quality → Apply Real-time
```

---

## Key Features

### 1. Diagnostics Modal
**Location**: Preview Screen
**Trigger**: "Run Connection Test" button
**Tests**:
- Browser compatibility
- WebRTC support
- Server connectivity (latency)
- Bandwidth speed

**Output**: Status for each test with recommendations

### 2. Quality Settings Modal
**Location**: Preview Screen + Session Controls
**Features**:
- 4 quality presets
- Advanced manual controls
- Connection type detection
- Data usage estimates
- LocalStorage persistence

**Settings Saved**:
- Max bitrate (256-2000 kbps)
- Resolution cap (480p/720p/1080p)
- Frame rate (15/24/30 fps)
- Preferred layer (auto/low/medium/high)
- Adaptive quality (on/off)

### 3. Adaptive Quality
**Automatic Adjustments**:
- Detects 4G → Reduces to medium quality
- Detects WiFi → Increases to high quality
- Connection drops → Temporarily lowers quality
- Connection improves → Restores quality

---

## Technical Details

### HMS SDK Integration:
```typescript
// Set video quality
hmsActions.setVideoSettings({
  maxBitrate: 1000,      // kbps
  maxFramerate: 30,      // fps
  codec: "vp8",          // video codec
})

// Set simulcast layer preference
hmsActions.setPreferredLayer("high")
```

### LocalStorage:
```typescript
// Settings saved as:
{
  "maxBitrate": 1000,
  "preferredLayer": "auto",
  "frameRate": 30,
  "resolution": "720p",
  "enableAdaptive": true
}
```

---

## Connection Type Detection

Uses Navigator API to detect:
- **4G**: Mobile data (512 kbps, 24fps, 720p)
- **WiFi**: Good connection (1000 kbps, 30fps, 1080p)
- **Ethernet**: Best connection (1500 kbps, 30fps, 1080p)
- **Unknown**: Defaults to medium quality

---

## Data Usage Examples

Based on selected quality:

| Quality | Resolution | FPS | Bitrate | MB/Hour |
|---------|-----------|-----|---------|---------|
| Low     | 480p      | 15  | 256     | ~115    |
| Medium  | 720p      | 24  | 512     | ~230    |
| High    | 1080p     | 30  | 1000    | ~450    |
| Auto    | Up to 1080p| 30 | 1500    | ~675    |

---

## Testing Recommendations

### Test Scenarios:
1. ✅ **Good WiFi**: Use High/Auto preset
2. ✅ **Weak WiFi**: Use Medium preset
3. ✅ **4G Mobile**: Use Low preset
4. ✅ **Switch Networks**: Watch auto-adjustment

### What to Look For:
- Diagnostics complete in <5 seconds
- Settings persist after closing modal
- Quality changes apply without lag
- Connection warnings appear when switching networks
- Video doesn't freeze when reducing quality

---

## Troubleshooting

### "Browser not supported"
- Use Chrome, Firefox, or Edge
- Update browser to latest version

### "WebRTC not supported"
- Enable camera/mic permissions
- Check browser settings
- Try different browser

### "Cannot reach video servers"
- Check internet connection
- Disable VPN temporarily
- Check firewall settings

### "Low bandwidth detected"
- Close other applications
- Move closer to WiFi router
- Use ethernet cable
- Select Low quality preset

---

## Future Enhancements (Not Yet Implemented)

1. **Live Stats Panel**: Real-time bandwidth monitoring during session
2. **Network History**: Track connection quality over time
3. **Smart Presets**: Learn user's optimal settings
4. **Location-Based**: Auto-select quality based on location
5. **Advanced Diagnostics**: Packet loss, jitter, peer quality

---

## Files Reference

### Created:
- `components/session/diagnostics-modal.tsx`
- `components/session/quality-settings-modal.tsx`
- `components/ui/dialog.tsx`
- `components/ui/slider.tsx`
- `components/ui/label.tsx`

### Modified:
- `components/session/preview-screen.tsx`
- `components/session/controls.tsx`

### Packages Added:
- `@radix-ui/react-dialog`
- `@radix-ui/react-slider`
- `@radix-ui/react-label`

---

## Success!

The diagnostics and bandwidth management system is now fully integrated. Users can:

1. ✅ Test their connection before joining
2. ✅ Optimize video quality for their network
3. ✅ Save preferences for future sessions
4. ✅ Adjust quality during active sessions
5. ✅ Benefit from automatic quality adaptation

Next time a user joins a session, they'll have the tools to ensure the best possible experience!
