# Copilot Instructions for Órgão.Web.Beta

## Project Overview

Órgão.Web.Beta is a client-side web application for church musicians. It provides a repertoire manager for organ/piano chords and lyrics, integrates with online liturgy sources, handles music playback, and renders sheet music. This is a **vanilla JavaScript project with no build tools or npm dependencies**.

## Build, Test, and Lint

**No build process exists.** This is a pure client-side HTML/CSS/JavaScript project served directly by a web server.

- **Development:** Open `index.html` in a browser or use a simple HTTP server (`python -m http.server 8000` or `npx http-server`)
- **Testing:** No automated test framework exists. Manual testing in the browser is required
- **Linting:** No linter is configured

### Available Files

Two main entry points:
- `index.html` - Main application with repertoire manager, chord editor, and music features
- `editar-cifras.html` - Draft/practice editor for chord arrangements

## Architecture

### High-Level Design

The application follows a **Manager/Controller pattern** where each major feature is encapsulated in a dedicated class:

1. **View & UI Management**
   - `ViewManager` - Handles view switching (repertoire, edit mode, liturgy iframe)
   - `ToolbarController` - Manages toolbar interactions and music controls

2. **Data Persistence**
   - `DatabaseManager` - Wrapper around `localStorage` for song CRUD operations
   - `PreferencesManager` - Handles theme, language, and mobile settings

3. **Music & Audio**
   - `MusicEngine` (contains `MusicTheory` and `ChordManager`) - Chord transposition and music theory
   - `AudioManager` - Web Audio API wrapper for synth sounds
   - `SheetMusicEngine` - VexFlow integration for sheet music rendering
   - `RhythmEngine` - Rhythm/beat playback

4. **Content Processing**
   - `TextFormatter` - Auto-detects and formats chords, cleans HTML, prepares content for display
   - `BackupManager` - Export/import repertoire (JSON format)
   - `ModalManager` - Bootstrap modal helpers

5. **Service Worker**
   - `sw.js` - Offline caching strategy, update notifications to app

### Data Model

Songs are stored in `localStorage` with the following structure:
```javascript
{
  id: "1234567890abc",  // Timestamp + random suffix
  title: "Song Title",
  artist: "Artist Name",
  content: "Chord lines\nLyric lines"
}
```

**Storage Keys:**
- `songs` - Main repertoire (used by `App.js`)
- `cifras_draft` - Draft/practice songs (used by `EditorApp.js`)
- `theme` - 'light' or 'dark' preference
- `language` - 'pt' or 'en' preference

### Routing & Navigation

Single-page app with view switching logic in `ViewManager`:
- `.main-display` - Editor/repertoire content area (contenteditable)
- `.main-iframe` - External content (e.g., liturgy URLs)
- Menu toggles between different features (liturgy, standard mass parts, repertoire)

## Key Conventions

### File Organization

All application code is in `assets/js/` with this naming pattern:
- **Managers:** `*Manager.js` (singleton-like classes managing a feature domain)
- **Controllers:** `*Controller.js` (handle user interactions and coordinate managers)
- **Utility Classes:** `TextFormatter.js`, `RhythmEngine.js`, `SheetMusicEngine.js` (static methods or standalone logic)

### Class Structure

Classes use the **Manager pattern** with initialization in constructors:

```javascript
class MyManager {
  constructor() {
    this.state = {};
    this.init();  // Always call init() if needed
  }

  init() {
    // Query DOM elements, attach event listeners
  }
}
```

**Key behaviors:**
- Managers query DOM in constructor and attach event listeners
- Managers use callbacks or public properties for cross-component communication (e.g., `backupManager.onImportComplete = () => {...}`)
- No module imports/exports (all code is global scope, loaded via `<script>` tags)

### Internationalization

All user-visible strings use a `data-i18n` attribute:
```html
<span data-i18n="confirmDeleteTitle">Delete Song</span>
```

Translations are loaded from `translations.json` (Portuguese `pt` and English `en`). When adding new strings:
1. Add `data-i18n="newKey"` to HTML elements
2. Add `"newKey": "value"` to both `pt` and `en` sections in `translations.json`

### Chord Detection & Formatting

`TextFormatter.autoFormatChords()` auto-detects chord lines using regex and musical knowledge:
- Valid chords: `C`, `C#`, `Dm`, `G7`, `Cmaj7`, `D/F#`, etc.
- Exceptions (not treated as chords): 'intro', 'solo', 'refrão', 'ponte', 'bis', 'pausa', 'fim', 'coda'
- Lines are wrapped in `<b>` tags if recognized as chord lines

### Theme & Mobile Settings

- Theme stored in `localStorage['theme']` as 'light' or 'dark' → applied to `<html data-bs-theme="light|dark">`
- Mobile: `PreferencesManager.initMobile()` handles wake locks on iOS/Android

### Service Worker Updates

`sw.js` caches versioned assets (based on `APP_VERSION`). When the app updates:
1. New SW installs and activates
2. Posts `{ type: 'UPDATE_INSTALLED', version: 'v1.0.3' }` to all clients
3. App can prompt user to refresh

### Bootstrap & Dependencies

- **Bootstrap 5.3.2** - CSS framework (CDN link in HTML)
- **TomSelect 2.2.2** - Enhanced select dropdowns (used for song/draft selection)
- **VexFlow 4.2.2** - Sheet music rendering
- **Font Awesome 6.4.2** - Icons
- **Bootstrap Icons 1.11.3** - Additional icons

All loaded via CDN; no bundler needed.

## Development Tips

### Adding New Features

1. **New Manager?** Create `assets/js/MyFeatureManager.js`, add to `index.html` `<script>` tag
2. **New UI State?** Add to `PreferencesManager` or create a new manager
3. **New Song Data Field?** Update `DatabaseManager.addSong()` and any UI that displays it
4. **New Strings?** Add to `translations.json` and use `data-i18n` in HTML

### Debugging

- Use browser DevTools console (all managers and functions are global)
- Check `localStorage` in DevTools → Application → Local Storage
- Watch network requests for CDN failures
- Test offline mode via DevTools Network tab → "Offline" throttle

### Testing Changes

1. Backup `localStorage` in DevTools before destructive tests
2. Test in both Portuguese and English (theme toggle + language toggle)
3. Test in light and dark modes
4. Test on mobile (DevTools device emulation)
5. Test offline support (DevTools Network → Offline)

## Git & Version Management

- Main version string: `const APP_VERSION = 'v1.0.3'` in `App.js` and `sw.js` (keep in sync!)
- Service worker cache key derives from this version
- Before releasing, bump version and test offline cache refresh behavior

## Common Tasks

| Task | Files to Edit |
|------|---------------|
| Add new song field | `DatabaseManager.js`, form in `index.html` or `editar-cifras.html` |
| Change chord detection rules | `TextFormatter.js` (regex & exceptions) |
| Add new audio instrument | `AudioManager.js`, `MusicEngine.js` chord buttons |
| Change theme behavior | `PreferencesManager.js` |
| Add new language | `translations.json`, `PreferencesManager.js` (language list) |
| Update offline assets | `sw.js` (ASSETS_TO_CACHE list) |
