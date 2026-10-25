# Transmission Torrent Control

Send torrent and magnet links to your [Transmission](https://transmissionbt.com/) BitTorrent client, with multi-label selection and presets.

Based on [Torrent Control](https://github.com/Mika-/torrent-control) by Mika-.

## Features
- Right-click any torrent or magnet link → **Add torrent**, using the current label/directory/paused selection (shown in the menu entry)
- **Toolbar popup** (left click): toggle labels, download directory and "add paused" in one place
- **Middle-click** the toolbar icon to open the Transmission web UI (HTTP auth answered automatically)
- **Label presets**: define combos like `movies, 4k` in settings to get one-click "Add as movies + 4k" menu entries
- Labels/directory/paused can also be toggled from the context menu itself
- Torrent files are fetched from the source tab, so private tracker cookies work
- Import/export settings as JSON (includes your password)

## Installation
Install from [Firefox Add-ons](https://addons.mozilla.org/) (requires Firefox 140+ or a Firefox-based browser such as Zen).

Then open the extension's settings, enter your Transmission address (e.g. `http://127.0.0.1:9091/`) and credentials, and add your labels and download directories. Labels require Transmission 4.0+.

## Privacy
Settings, including your Transmission password, are stored only in the browser's local extension storage. Nothing is collected or sent anywhere except to the Transmission server you configure.

---

## Development

### Requirements
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Setup and Running
1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/GianniBYoung/transmission-torrent-control.git
   cd transmission-torrent-control
   npm install
   ```

2. Start the extension in a temporary Firefox profile:

   ```bash
   npm start
   ```

### Loading a development build (Firefox/Zen)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and select `src/manifest.json`.

Flatpak browsers only receive the single selected file through the file portal, so the extension fails to load. Either set `widget.use-xdg-desktop-portal.file-picker` to `0` in `about:config` (and grant the browser access to the project folder with `flatpak override`), or load the zip produced by `npm run build`.

### Testing and packaging
- `npm test` runs the unit tests.
- `npm run build` writes the zip to upload to AMO into `web-ext-artifacts/`.

## License
MIT. See [LICENSE](LICENSE).
