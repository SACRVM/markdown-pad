# Markdown Pad

A Markdown file editor for [SACRVM desktops](https://desktop.sacrvm.dev/).
Open a `.md` file, write, save. The preview happens as you type: the line
under the caret shows its Markdown source, and every other line is rendered.
There is no separate preview mode to switch to.

## Install

On a SACRVM desktop, open the install tile and paste

```
github.com/SACRVM/markdown-pad
```

or pick **Markdown Pad** in the App Store tab.

## What it does

- **New, Open…, Save, Save as…** work on real files. Where those files live is
  up to the desktop: your device, or the desktop's own file space. After the
  first save, **Save** writes back to the same file without asking again. A
  browser that cannot write files back downloads a copy instead.
- **Unsaved work is protected.** A dot next to the file name shows unsaved
  changes. New or Open asks before discarding them, and so does the desktop
  when you close the window.
- **Draft recovery.** Unsaved text is kept as a draft while you type. If the
  page reloads or crashes, the draft comes back the next time you open the
  app. Saving the file clears the draft.
- **Drag and drop** a `.md` or `.txt` file onto the window to open it.
- **Line endings are kept.** A file with Windows (CRLF) line endings is saved
  with CRLF again. A leading byte-order mark is dropped.
- **Counts:** words, characters and lines in the status bar.
- **English and German**, following the desktop's language. Light and dark
  follow the desktop's theme. On a phone, the window opens full-screen with
  touch-sized buttons.

### Keyboard

| Keys | |
|---|---|
| Ctrl/Cmd+S | Save |
| Ctrl/Cmd+Shift+S | Save as… |
| Ctrl/Cmd+O | Open… |
| Ctrl/Cmd+Z / Ctrl/Cmd+Y | Undo / redo |
| Ctrl/Cmd+B / I / K | Bold / italic / link |
| Enter | Continues a list; Enter on an empty item ends it |
| Tab | Two-space indent |

The file shortcuts only apply while the Markdown Pad window has focus, so
two open windows never react to the same key.

### `:::secret` blocks

Lines between `:::secret` and `:::end` are blurred on screen, and an eye icon
reveals them. This is only a guard against someone reading over your
shoulder. The text is saved to the file as plain text, like everything else.

## Develop

```bash
npx serve .        # http://localhost:3000, F5 is the whole dev loop
```

`index.html` stands in for a desktop. It carries the theme and language
switches that a desktop normally provides.

There is no build step, and nothing needs installing. The repository is the
app:

| | |
|---|---|
| `app.json` | The manifest a desktop reads |
| `app.js` | `<app-markdown-pad>`: the file handling around the editor |
| `app.css` | Its styles, scoped to the element |
| `vendor/sac-md-editor.js` | The editor, copied unchanged from [sac-md-editor](https://github.com/SACRVM/sac-md-editor) |
| `kit/` | [SACRVM APPKIT](https://github.com/SACRVM/sacrvm-appkit), copied unchanged from the release (`kit/VERSION`). The editor's markdown parser and sanitiser load from `kit/js/vendor/` |

To upgrade the editor, copy `js/sac-md-editor.js` from sac-md-editor over
`vendor/sac-md-editor.js`. To upgrade the kit, delete `kit/` and unzip the
next release in its place. Never edit either copy here.

## License

MIT. See [LICENSE](LICENSE). The third-party notices (marked, DOMPurify) are
in `app.json` and appear in the app's About window.
