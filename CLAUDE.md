# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

## What this is

One app built on [SACRVM APPKIT](https://github.com/SACRVM/sacrvm-appkit).
**One repo, one app** — the repo *is* the app: `app.json` (the manifest a
desktop reads), `app.js` (one custom element, one classic script), `app.css`,
and `index.html` as a standalone harness. Read `README.md` before changing the
shape of any of them.

## Non-negotiable

- **No build step.** Vanilla custom elements, plain CSS, `npx serve .` and F5.
  Never introduce a bundler, node_modules, TypeScript, or a framework.
- **One custom element per repo**, defined through `sac.app.define(tag, class)`.
  Helper classes are fine; a second registered element means a second repo.
- **Light DOM.** No shadow root — the kit's stylesheet has to reach the markup.
- **Tokens only.** Style the app's own element, never `:root`. No raw colour
  literals: use the kit's tokens, and one `--accent` seed if the app wants an
  identity of its own.
- **The kit is vendored, verbatim.** `kit/` is the release ZIP's `kit/`,
  untouched — `kit/VERSION` says which release. Never edit anything under it;
  upgrading is delete `kit/`, unzip the next release. On a desktop the host's
  own kit runs instead — the local copy governs standalone dev only.
- **The kit's API only** — what the style guide documents. Never reach into a
  component's shadow root or private fields.

## The three hooks

`build()` writes markup once. `onMount(context)` runs when the app is really on
screen — subscriptions, measuring, first render. `onUnmount()` undoes exactly
what `onMount` did: every unsubscribe kept, `context.sidebar.clear()` if the
rail was filled.

Anything on `sac` beyond `sac.app` belongs to the host and is optional — guard
it (`typeof sac.toast === "function"`), never assume it.

## Publishing

GitHub Pages serves this repo from the root, and a desktop installs the app by
reading `app.json` from that origin. Whatever is committed here is what people
install: there is no release step, and every push is immediately live.

## Firepit inbox

At the start of a session, read any pending messages in `.firepit/inbox/*.md` — cross-project notes Firepit routes here. Act on each, then mark it done with the `firepit_inbox_complete` MCP tool, passing the message's filename as the `id`.

## Firepit knowledge

Before researching something that may already be known, query the knowledge base with the `firepit_knowledge_search` MCP tool (scope `both` covers this project plus the global base). Save durable findings with `firepit_knowledge_add` — written in English, per the indexing convention. The created markdown files live under `.firepit/knowledge/` and are committed like any other file.

## Firepit pinned knowledge

@.firepit/knowledge-pinned.md

The import above auto-loads the knowledge docs marked `pin: true` in their frontmatter — always-on rules that apply every session without a search. Firepit regenerates the file from the pinned docs; don't edit it directly. Pin/unpin via the pinned flag on `firepit_knowledge_add` / `firepit_knowledge_update`, and keep the pinned set small — everything else stays reachable through `firepit_knowledge_search`.

## Firepit artifacts

When you produce a file the user will want to open — a report, screenshot, diagram, generated image, log excerpt, build output, or an executable you built for them to run — pin it with the `firepit_artifact_add` MCP tool so it appears in the project's paperclip pane. Do this as you produce it, not at the end of the session; a path buried in scrollback is a path the user has to hunt for. Pinning only links the file — it stays where it is, and `firepit_artifact_remove` never deletes it. Check `firepit_artifact_list` first so you update an existing entry instead of piling up near-duplicates, and unpin what has gone stale.

## Firepit conventions

<!-- claude-firepit-fragments -->

@../.firepit/projects/claude.md
@../.firepit/projects/claude-github-public.md

The two imports above are shared files in the Firepit central repo — edit them there and every project follows. They carry policy; the tools themselves are described by Firepit's MCP server at the handshake, so nothing is duplicated between the two.
