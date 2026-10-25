# Agent Guide - Transmission Torrent Control

Firefox extension (MV2) that sends torrent/magnet links to Transmission via its RPC API.

## Architecture

- `src/index.js`: background script. Builds the link context menu, handles clicks, adds torrents, opens the web UI from the toolbar button.
- `src/lib/transmission.js`: RPC client. Sends Basic auth directly; retries once on 409 with the new `X-Transmission-Session-Id`.
- `src/util.js`: flat options (`defaultOptions`), load/save, legacy `{globals, servers}` migration, import/export parsing, helpers.
- `src/content-script.js`: fetches `.torrent` files inside the source tab so site cookies apply.
- `src/view/options.*`: settings page, including import/export and label presets.
- `src/view/popup.*`: toolbar popup for toggling labels/directory/paused. Middle-click on the icon is handled in `index.js` via `browserAction.onClicked`.

## Commands

- Build: `npm run build`
- Run: `npm start`
- Test: `npm test`

## Gotchas

- Context menu selections (`selectedLabels`, `directory`, `addPaused`) are sticky and stored by value; `getActiveSelection` drops values no longer in the configured lists.
- Every storage change rebuilds the menu; rebuilds are serialized through `menuQueue`.
- Labels are sent to Transmission as the `labels` array.
