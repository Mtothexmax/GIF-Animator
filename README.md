# GIF Animator

A Ulead GIF Animator–style tool built with **Svelte (SvelteKit)**, **Tailwind CSS** and **Google Material Symbols** — right in the browser, no editing needed.

🔗 **Live demo (GitHub Pages):** https://Mtothexmax.github.io/GIF-Animator/

## Features

- Open GIFs (correct disposal/transparency handling, per-frame delays preserved)
- Timeline with thumbnails below the preview — each frame shows its duration in ms
- Reorder frames by drag & drop or with the move buttons
- Multi-select (Ctrl/Cmd+click toggles, Shift+click for a range, Ctrl+A selects all) with a **Reverse** button for the selected frames
- Edit per-frame delay, or set all delays at once
- Add blank frames, duplicate and delete frames
- Import images or GIFs as new frames (multi-file supported)
- Live playback preview with per-frame timing and loop toggle
- Export as GIF (per-frame delays, transparency) or save/open a project (.json)

## Development

```sh
npm install
npm run dev
```

## Build & GitHub Pages

`npm run build` produces the production build in `build/`. The static site is published from the `docs/` folder (GitHub Pages → Deploy from a branch → `/docs`); run the export script to (re)generate it:

```powershell
.\export.ps1
```

The export builds with the GitHub Pages base path (`/GIF-Animator/`) and copies everything into `docs/`.
