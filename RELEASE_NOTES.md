# Release Notes

This file tracks functional changes, feature additions, and corresponding `.exe` releases to ensure that standard capabilities, settings, and updates are logged properly.

---

## [v1.0.5] - Microsoft Store Readiness (2026-03-03)

### Added
- **Microsoft Store Packaging**: Added AppX packaging pipeline and metadata for Partner Center publishing.
- **Store Assets Set**: Added the full required AppX image set including splash and tile variants.
- **Privacy Policy Surface**: Added a dedicated `PRIVACY.md` policy and linked it from app settings.

### Improved
- **Windows Desktop Chrome**: Window control symbols now follow Windows style (`—`, `☐`, `✕`) while keeping theme colors.
- **Release Structure**: Standardized build outputs for both installer and Store package workflows.

### Build / Distribution
- **Target OS**: Windows AppX (`.appx`)
- **Release Package**: `Let's Pray Store 1.0.5.appx`

---

## [v1.0.4] - Stability + Update Awareness (2026-02-27)

### Added
- **In-App Update Detection**: The app now checks GitHub Releases in the background and shows an in-app banner when a newer version is available.
- **Update Actions in UI**: Added direct action button inside the app to open the release download page.
- **Manual Update Check Bridge**: Added secure preload APIs for update-check requests and update availability events.

### Improved
- **Prayer Countdown Continuity**: Countdown now correctly rolls over to the next day's Fajr after Isha.
- **Adhan Reliability**: Prayer-time notification + audio trigger logic moved to app-level monitoring so it works across views.
- **Location UX**: Better auto-detect flow (GPS first, IP fallback) and clearer display for current detected city.
- **Splash Experience**:
  - Splash now stays visible for 5 seconds.
  - Startup sound handling improved.
  - Splash typography aligned with the main app style.

### Executable / Build
- **Target OS**: Windows `.exe`
- **Release Package**: `Let's Pray Setup 1.0.4.exe`

---

## [v1.0.0] - Initial Let'sPray Release (2026-02-27)

### Added
- **Core Desktop Experience**: Initial release of the desktop app integrating React, Vite, and Electron.
- **Location Detection**: Automated IP geolocation plus a comprehensive list of fallback cities (including localized Al Khobar, Dammam, Dhahran options).
- **Prayer Engine**: Robust `adhan.js` integration showing daily times, countdowns, and Hijri dates.
- **UI/UX Refinements**: 
  - Animated Splash screen and glowing Hilal logo.
  - Elegant typography: `Cinzel Decorative` for English and `Aref Ruqaa` for Arabic.
  - Dark mode focused design with Mosque background aesthetic.
- **System Tray Module**: Background functioning, "Minimize to Tray" support, and Tray context menus added.
- **Authentic Local Audio**: Fully offline high-quality `.mp3` files for 6 prominent muezzins ensuring no network dependency for Azan.
- **Settings & Config**: Per-prayer offsets, high-latitude logic, auto-start options, sound/notification toggles, and safe-reset.
- **Feedback Module**: GitHub-based direct feedback linking through the application settings.

### Executable / Build
- **Target OS**: Windows `.exe`
- **Release Action**: *[Remember to upload the packaged .exe to GitHub Releases when pushing these notes]*

---

*(Future updates should be appended to the top of this document following each major deployment.)*
