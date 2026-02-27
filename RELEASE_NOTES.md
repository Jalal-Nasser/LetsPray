# Release Notes

This file tracks functional changes, feature additions, and corresponding `.exe` releases to ensure that standard capabilities, settings, and updates are logged properly.

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
