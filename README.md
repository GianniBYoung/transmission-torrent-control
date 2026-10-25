# Transmission Torrent Control

Add torrent and magnet links directly to your Transmission Bittorrent client.

## Features
- Right-click any torrent or magnet link → **Add torrent**, using the current label/directory/paused selection (shown in the menu entry)
- **Toolbar popup** (left click): toggle labels, download directory and "add paused" in one place
- **Middle-click** the toolbar icon to open the Transmission web UI (HTTP auth answered automatically)
- **Label presets**: define combos like `movies, 4k` in settings to get one-click "Add as movies + 4k" menu entries
- Labels/directory/paused can also be toggled from the context menu itself
- Torrent files are fetched from the source tab, so private tracker cookies work
- Import/export settings as JSON (includes your password)

---

## Development

### Requirements
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Setup and Running
1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/GianniBYoung/torrent-control.git
   cd torrent-control
   npm install
   ```

2. Start the extension in a temporary Firefox profile:

   ```bash
   npm start
   ```

### Manual Installation (Firefox/Zen)
1. Open your browser and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `src/manifest.json` file.

### Permanent Installation (Zen/Firefox Dev Edition)
1. Build the extension: `npm run build`.
2. Locate the `.zip` file in `web-ext-artifacts/` and rename it to `.xpi`.
3. In your browser, go to `about:config` and set `xpinstall.signatures.required` to `false`.
4. Go to `about:addons`.
5. Click the gear icon and select **Install Add-on From File...**.
6. Select your `.xpi` file.
