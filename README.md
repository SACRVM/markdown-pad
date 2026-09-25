# SACRVM App Template

A starting point for one app, built on [SACRVM APPKIT](https://github.com/SACRVM/sacrvm-appkit).
Click **Use this template**, rename five strings, and you have an app any SACRVM
desktop can install from your repository URL.

**One repo, one app.** The repo *is* the app: a manifest, one custom element in
one script, its stylesheet, and a page to develop it in. Nothing else ships, and
nothing is built — you edit a file and press F5.

## Start

```bash
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
npx serve .        # http://localhost:3000 — F5 is the whole dev loop
```

Then rename the placeholder in five places. Pick a tag with a dash in it
(custom elements require one) and keep it identical everywhere:

| File | Change |
|---|---|
| `app.json` | `id`, `name`, `description`, `icon`, `tag` |
| `app.js` | the class name, the `sac.app.define("app-my-app", …)` tag, the stylesheet id |
| `app.css` | every `app-my-app` selector |
| `index.html` | `<title>` and the `<app-my-app>` element |

## Publish

1. **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.
2. Wait for the first build (a minute), then check
   `https://<you>.github.io/<your-repo>/app.json` loads in a browser.
3. On a desktop — [desktop.sacrvm.dev](https://desktop.sacrvm.dev/) or your own —
   paste `github.com/<you>/<your-repo>` into the install tile.
4. Optional — list it in the desktop's **App Store**: once Pages serves your
   `app.json`, give the repository the GitHub topic `sacrvm-app`
   (`gh repo edit <you>/<your-repo> --add-topic sacrvm-app`). The template
   itself deliberately does not carry that topic — your copy does.

That is the whole distribution story. The desktop stores your **address**, not a
copy of your code: every push is live for everyone who installed it, and there
is nothing to re-publish and no store to submit to.

## The manifest

`app.json` sits in the repository root because that is where a desktop looks.

| Key | |
|---|---|
| `id` | Required. Unique per desktop; a `view` app lives at `#/<id>` |
| `name` | Required. Shown on the tile and in the window title |
| `kind` | Required. `window` (floats) · `view` (takes the stage) · `page` (own document) |
| `tag` | Required. The custom element name — must contain a dash |
| `entry` | Required. Path to the script, resolved against the manifest |
| `icon` | A kit icon name (`sac.icons.names()`); falls back to a cube |
| `description` | One sentence — the tile shows it |
| `version` | Yours to bump; the desktop displays it |
| `accent` | A hex seed. The host applies it to your element only |
| `width` / `height` | `window` apps: the initial window size |
| `resizable` / `controls` | `window` apps: pass `false` / a control set to `<sac-window>` |
| `nav` | `view` apps: `false` keeps it out of the host's nav |
| `palette` | `false` keeps the app out of the Ctrl-K palette (listed under "Apps" otherwise) |

## The contract

Your script defines **one** custom element and nothing else. `sac.app` covers
the boilerplate:

```js
const BASE = sac.app.base();          // this script's folder, at parse time

class AppMyApp extends sac.app.Element {
    build()               { /* once, on first connect — your markup */ }
    onMount(context)      { /* once, when really on screen */ }
    onUnmount()           { /* the host removed you — undo onMount */ }
}

sac.app.define("app-my-app", AppMyApp);   // guarded: defining twice is fine
```

`context` is what the host hands you. Take what you need, assume nothing else:

| | |
|---|---|
| `theme.get()` / `theme.onChange(cb)` | Current theme, and a subscription that returns its own unsubscribe |
| `route` / `onRoute(cb)` | Your sub-route (`#/<id>/here`), now and on every change |
| `href(route)` | Build a link into your own app — never hand-assemble `#/id/route` |
| `deepLink.set(route)` | Make the current state linkable (replaceState) |
| `sidebar.set([…])` / `clear()` | Project navigation into the host's rail (`view` apps) |
| `params` | Query parameters the host was opened with |
| `appId` | Your id, as the host registered it |
| `fs` | Storage scoped to your app: `read(path, fallback)`, `write(path, value)`, `remove`, `list(prefix)`, `stat(path)`, `clear`, `usage`, `watch` — all async; values may be Blobs. `null` if the host grants none, so check first |
| `files` | The **user's** files, wherever the host keeps them: `open({ accept, multiple })` and `save(blob, { name })` (Save as…) → `{ name, file, handle }` or `null` on cancel. Hand the `handle` back to `save` and it saves silently. `null` if the host grants none |
| `lang` | `get()` / `onChange(cb)` — the page's language, owned by the host like the theme. Re-render your strings on change; `null` on hosts older than kit 2.12 |
| `setDirty(flag)` | `true` while you hold unsaved work: leaving the page asks first, and a host can ask before closing you. `false` once saved |
| `identity` | Who is at this desktop: `get()` → `{ id, name, avatar }` or `null`, plus `onChange`. Read-only, and not authentication — a name somebody typed, never proof of anyone |

A slot a host does not have is `null` or missing — a desktop runs *its* kit,
which may be older than yours. Feature-check (`if (context.lang)`) rather than
assume.

Everything on `sac` beyond that is the **host's** and optional. `sac.toast` is
the usual example: guard it (`typeof sac.toast === "function"`) rather than
assume a desktop that has one.

## Your strings, in every language

The page has one language, switched at runtime by the host (standalone: the
`<sac-lang-toggle>` in the harness). The kit's own components follow it by
themselves; your app does three things, all shown in `app.js`:

```js
sac.i18n.add("de", { "my-app.save": "Speichern" });   // once, at parse time
sac.t("my-app.save", "Save")                          // English is the inline fallback
context.lang.onChange(() => this._text())             // re-render; unsubscribe in onUnmount
```

Namespace keys by your app id. `sac.i18n.add` is new in kit 2.12 — guard it
(`typeof sac.i18n.add === "function"`) so an older host just shows English.

## On a phone

A kit-only app works at 360px without media queries of its own. A `window`
app opens maximized below the host's nav there, and the harness does the
same below 768px — develop in DevTools device mode as well as at your
manifest's size. Keep the primary action at the bottom, where the thumb is.

A `view` app with its own `<sac-nav>`: set `host-nav="wide"` (the host's
dashboard is the phone's main level), and `sections-nav="wide"` if your rail
repeats the nav's sections. For a list with a detail pane, copy
[`list-detail.html`](kit/templates/list-detail.html) — `<sac-split collapse>`
turns it into two screens on a phone.

## Make it a fullscreen app

A `view` app takes the whole stage, gets its own route, and projects its
navigation into the host's rail instead of drawing one. The differences:

1. `app.json`: `"kind": "view"`, and drop `width` / `height`.
2. `app.js`: read `context.route` in `onMount`, subscribe with
   `context.onRoute(…)`, call `context.sidebar.set([…])` with your sections
   (`href: context.href(id)`), and `context.deepLink.set(id)` when the section
   changes. Clear the rail in `onUnmount`.
3. `index.html`: drop the `.frame` wrapper — put your element straight in `<body>`.

The kit ships a complete example of each:
[`app-fullscreen`](https://github.com/SACRVM/sacrvm-appkit/tree/master/kit/templates/app-fullscreen)
and [`app-dialog`](https://github.com/SACRVM/sacrvm-appkit/tree/master/kit/templates/app-dialog).
Two apps you can install and read:
[calculator](https://github.com/SACRVM/sacrvm-calculator) (window) and
[notes](https://github.com/SACRVM/sacrvm-notes) (view).

## Rules that keep this working

- **No build step.** Vanilla custom elements, plain CSS, files served as they
  are. No bundler, no node_modules, no TypeScript.
- **Vendor the kit, verbatim.** `kit/` is the release ZIP's `kit/`, unchanged —
  local, offline, and `kit/VERSION` says which release. Never edit anything
  under it; upgrading is delete `kit/`, unzip the next release. On a desktop
  the host's own kit runs instead — your copy governs standalone dev only.
- **Tokens only, never raw colours.** Style your own element, never `:root` —
  `:root` is the desktop around you. One `--accent` seed re-derives the rest.
- **Light DOM.** The kit's stylesheet has to reach your markup; a shadow root
  would shut it out.
- **Clean up in `onUnmount`.** Unsubscribe what you subscribed to, clear the
  rail you filled. A desktop keeps your element alive when the user switches
  away and removes it when they uninstall you.
- **Store *locally* through `context.fs`, never `localStorage`.** It is scoped
  to your app, it is async, and a host is free to back it with something better
  — reaching past it opts you out of all of that. And catch a failed `write`:
  storage that is full must not look like a save that worked. An app that needs
  a database still has its own backend and calls it with `fetch`; the kit has
  no opinion about your API, and the two mix freely.
- **Never let the client decide who it is.** `context.identity` tells your UI
  whose screen this is. If your backend returns personal data, it must verify
  the credential itself — sending `identity.get().id` and trusting it means
  anybody can ask for anybody's rows.

## License

MIT. Replace the copyright line in `LICENSE` with your own — the template is
yours to take.
