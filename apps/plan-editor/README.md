# Kat Planı — Pascal integration

The financial application exposes this editor at `/kat-plani`. It loads a separately built React 19 application in a same-origin iframe only after a user selects a project. The financial application remains on React 18.

## Source and license

- `vendor/editor/src` and `public` were imported from the user-provided `editor-main.zip` (Pascal Editor 1.0.6).
- Archive SHA-256: `A2A1B2E0893D8D8F831214ECD58D0CDAF7D9C494706088FEE9B8EA586EFB7158`.
- Upstream: https://github.com/pascalorg/editor. MIT license: `vendor/LICENSE`.
- Core, viewer and built-in nodes use the matching published **1.0.6** releases, locked in `package-lock.json`. Vite aliases the editor entry to the editable archive source in this repository.
- `src/upstream.css` is the archive's stylesheet with local source paths. Vite adapts Next Image/Link to browser components and prefixes upstream static asset paths with `/plan-editor/`.
- The Next server, standalone password system, SQLite backend, telemetry and external community account integrations are not used by this host.

## Development

At the repository root:

```sh
npm run install:editor
npm run dev
```

In another terminal: `npm run dev:editor`. The main Vite server proxies `/plan-editor/` to port 3002.

`npm run build` builds the financial app and then the editor into `dist/plan-editor`. Vercel installs the independent lockfile through the root `install:editor` script. `npm run preview` serves both built applications without the development proxy.

## Data boundary

The host reads only authorized project IDs and names. No access tokens, expenses, check records, customer information or financial amounts are passed to the editor. No database migration is required for this integration.

Drawings are stored in the separate `insaat-pascal-drawings` IndexedDB database, keyed by user and project. This is **device/browser-local storage**, not cloud synchronization. Users must download JSON backups before clearing browser storage or switching devices. The UI states this explicitly.

Autosave is disabled until a successful load. Unexpected empty writes and concurrent-tab revision conflicts are rejected. Each save retains the previous scene; importing a JSON backup additionally retains the previous drawing for the visible undo-import action. Native upstream guides/models may include browser-local assets, so JSON is a scene backup, not a guaranteed portable archive of uploaded binary media.

The existing customer-facing apartment viewer remains in `src/components/Apartment3D`; it reads legacy saved apartment geometry and is separate from this editor. The old editable FloorPlanner and its AI floor-plan endpoint have been removed. The building-distribution analysis endpoint remains at `/api/analyze-building`.

## Verification

`node --test tests/editor-integration.test.mjs` at repository root checks password bounds, obsolete API rejection and backup validation without production writes. Browser checks use an ignored, local-only preview fixture and a separate QA workspace; never insert test expenses or apartments.
