# Electron + Create React App Template

A polished, fork-ready template that combines Create React App (CRA) for the renderer with Electron for the desktop shell. Designed to be cloned/forked and quickly bootstrapped into a working desktop application with IPC, development tooling, and packaging for macOS & Windows.

## Badges
- Status: Ready for fork
- Platform: macOS / Windows / Linux
- Stack: React (CRA) + Electron + electron-builder

## Table of contents
- [Quick start](#quick-start)
- [Pinned versions (recommended)](#pinned-versions-recommended)
- [What to change after forking](#what-to-change-after-forking)
- [Scripts & workflow](#scripts--workflow)
- [Verify IPC (preload → main)](#verify-ipc-preload--main)
- [Packaging & build notes](#packaging--build-notes)
- [Common issues & fixes](#common-issues--fixes)
- [CI / Releases recommendations](#ci--releases-recommendations)
- [Security & best practices](#security--best-practices)
- [Contributing & licensing](#contributing--licensing)
- [Quick troubleshooting checklist](#quick-troubleshooting-checklist)

## Quick start
1. Fork or clone your copy:
   - git clone git@github.com:YOUR_USER/YOUR_FORK.git
   - cd YOUR_FORK
2. Install dependencies:
   - npm install
3. Run development (CRA + Electron):
   - npm run electron-dev
4. Verify:
   - Electron window appears (DevTools open in dev).
   - Click "Ping Main" in the UI — you should see a JSON pong reply from the main process.

## Pinned versions (recommended)
- Purpose: Keep this section up-to-date in the repo so future forks and CI use known-good versions. Use exact versions in your package manager (package.json / pom.xml / build.gradle) or lockfiles.

## Project README / Template (this file)
- README version: 2025-10-18 (update date each time you change requirements)

## Frontend / Electron template (Node + CRA)
- Node.js: 18.x LTS (recommended minimum) — e.g., 18.16.x
- npm: 9.x
- react: 18.2.0
- react-dom: 18.2.0
- react-scripts: 5.0.1
- electron: 28.0.0
- electron-builder: 24.9.1
- concurrently: 8.2.2
- wait-on: 7.2.0



## What to change after forking (short checklist)
- package.json
  - Update "name", "version", "author".
  - Set `"appId"` and `"productName"` under the `build` section.
- Branding & assets
  - Replace icons in `public/assets/`:
    - mac: `app.icns`
    - windows: `app.ico`
- README / LICENSE
  - Update the project description, add screenshots, and choose a license (MIT recommended).
- CI and secrets
  - Add GitHub Actions or your CI config; do not commit secrets. Use GitHub Secrets / environment variables.
- Security review
  - Review `public/preload.js` to ensure only needed APIs are exposed.

## Scripts & workflow
- npm start
  - Starts CRA dev server at http://localhost:3000
- npm run electron
  - Launch Electron using `main` from package.json (e.g., `public/electron.js`)
- npm run electron-dev
  - Development helper: runs CRA and launches Electron after the dev server is ready
- npm run build
  - Builds the CRA renderer into `build/`
- npm run dist
  - Builds renderer then runs electron-builder (packages current OS)
- npm run dist-mac
  - Package macOS build
- npm run dist-win
  - Package Windows NSIS installer (run on Windows or use Windows CI runner)

## Verify IPC (preload → main)
- The template exposes a small secure API via `contextBridge`:
  - `window.electronAPI.ping(payload)` — quick round-trip sanity check
  - `window.electronAPI.selectDestinationFolder()` — opens native folder chooser
  - `window.electronAPI.transferAlbums(payload)` — starts a simulated transfer (template)
  - `window.electronAPI.onTransferProgress(cb)` — subscribe to progress events
- Quick manual test:
  - Open the app and click the "Ping Main" button; verify the pong JSON appears.

## Packaging & build notes
- Output directory: `dist/` per `build.directories.output`
- Ensure icons exist before packaging:
  - mac: `public/assets/app.icns`
  - windows: `public/assets/app.ico`
- electron-builder:
  - Default behaviour is to package the files listed in `build.files`. If you relocate electron files, update `main` and `build.files`.
- Windows builds:
  - `dist-win` uses `--win` (NSIS). Build locally on Windows or configure CI with a Windows runner for reliable artifacts.

## Common issues & fixes
- Electron can't find module / "cannot find module '<project-dir>'"
  - Ensure package.json `main` points to `public/electron.js` and that file exists.
- ERR_REQUIRE_ESM from `electron-is-dev`
  - Use the included isDev heuristic (recommended) or change to dynamic import. Avoid flipping the repo to ESM (`"type": "module"`) unless you're ready to migrate all code.
- CRA: "Can't resolve 'web-vitals'"
  - Install web-vitals: `npm install web-vitals`
  - Or keep the provided `src/reportWebVitals.js` no-op stub in the template.
- window.electronAPI undefined in renderer
  - Confirm `preload` path in `public/electron.js` → `webPreferences.preload`.
  - Ensure `contextIsolation: true` and `nodeIntegration: false` match the preload's assumptions.

## CI / Releases recommendations
- Add GitHub Actions:
  - Lint, test, build renderer
  - Build platform-specific installers on the correct OS runners:
    - macOS runner → mac artifacts
    - Windows runner → NSIS installer
- Tag releases and attach artifacts from CI
- Code signing & notarization:
  - macOS notarization and Windows code signing are recommended for production builds

## Security & best practices
- Preload API:
  - Expose minimal methods only; validate inputs in main when performing filesystem or privileged operations
- Context isolation:
  - Keep `contextIsolation: true` and `nodeIntegration: false`
- Replace console logs with `electron-log` before packaging to capture persistent logs
- Validate and sanitize all data coming from renderer before passing to fs or OS operations

## Contributing & licensing
- Fork → feature branch → PR to your repo (or upstream if applicable)
- Add tests for new functionality — unit tests for services and integration tests for IPC flows
- Include a LICENSE (MIT recommended) and CONTRIBUTING guidelines for your project

## Quick troubleshooting checklist
- Did npm install complete without errors?
- Is `public/electron.js` present and `main` pointing to it?
- Is the CRA dev server accessible at http://localhost:3000?
- If packaging fails, run electron-builder with `--debug` or inspect the `dist/` logs.
- For IPC issues: open DevTools in the renderer and check for `window.electronAPI` in the console.

## Appendix: Useful commands
- Install deps: npm install
- Run dev (CRA + Electron): npm run electron-dev
- Build renderer: npm run build
- Run packaged local electron: npm run electron
- Package (current OS): npm run dist
- Package Windows (NSIS): npm run dist-win

## Happy hacking! 🚀
