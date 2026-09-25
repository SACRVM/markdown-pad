/**
 * <app-markdown-pad> — a Markdown file editor for SACRVM desktops.
 *
 * A thin shell around <sac-md-editor> (vendor/sac-md-editor.js): the editor
 * does the live preview, this app does everything around a FILE — New,
 * Open…, Save, Save as…, unsaved-work protection, a crash-safe draft, drag
 * and drop, and a word count.
 *
 * Where things live:
 *   context.files  the user's .md files (device or the desktop's file space —
 *                  the host decides). A handle from open/save makes the next
 *                  Save silent.
 *   context.fs     one entry, "draft": the unsaved text, written while you
 *                  type and removed once the file is saved. A reload or a
 *                  crash brings it back; it is not a second copy of saved work.
 *
 * Dependencies: marked + DOMPurify come from this repo's vendored kit
 * (kit/js/vendor/ — the kit's all.js does not load them), the editor from
 * vendor/. All three load once, resolved against this script's folder, so
 * the same code runs standalone and injected into a desktop.
 *
 * Keyboard (while focus is inside the app): Ctrl/Cmd+S save,
 * Ctrl/Cmd+Shift+S save as, Ctrl/Cmd+O open. Undo/redo and formatting keys
 * are the editor's own.
 *
 * Line endings: the editor works in "\n". A file opened with CRLF is saved
 * back with CRLF; a leading BOM is dropped on open.
 */
(function () {
    // Parse time, top level: document.currentScript is this file only here.
    const BASE = sac.app.base();

    const ACCEPT = ".md,.markdown,.mdown,.txt,text/markdown,text/plain";
    const DRAFT = "draft";
    const DRAFT_DELAY = 600;

    if (typeof sac.i18n.add === "function") {
        sac.i18n.add("de", {
            "markdown-pad.new":          "Neu",
            "markdown-pad.open":         "Öffnen…",
            "markdown-pad.save":         "Speichern",
            "markdown-pad.saveAs":       "Speichern unter…",
            "markdown-pad.undo":         "Rückgängig",
            "markdown-pad.redo":         "Wiederholen",
            "markdown-pad.about":        "Über Markdown Pad",
            "markdown-pad.untitled":     "Unbenannt.md",
            "markdown-pad.placeholder":  "Schreib los — Markdown wird beim Tippen dargestellt.",
            "markdown-pad.word":         "Wort",
            "markdown-pad.words":        "Wörter",
            "markdown-pad.char":         "Zeichen",
            "markdown-pad.chars":        "Zeichen",
            "markdown-pad.line":         "Zeile",
            "markdown-pad.lines":        "Zeilen",
            "markdown-pad.saved":        "Gespeichert",
            "markdown-pad.unsaved":      "Nicht gespeichert",
            "markdown-pad.downloaded":   "Heruntergeladen",
            "markdown-pad.saveFailed":   "Speichern fehlgeschlagen",
            "markdown-pad.openFailed":   "Datei konnte nicht gelesen werden",
            "markdown-pad.notText":      "Das ist keine Textdatei",
            "markdown-pad.restored":     "Ungespeicherter Entwurf wiederhergestellt",
            "markdown-pad.discardTitle": "Ungespeicherte Änderungen verwerfen?",
            "markdown-pad.discard":      "Verwerfen",
            "markdown-pad.cancel":       "Abbrechen",
            "markdown-pad.dropHint":     "Datei zum Öffnen ablegen",
            "markdown-pad.loadFailed":   "Der Editor konnte nicht geladen werden.",
        });
    }

    const t = (key, en) => sac.t("markdown-pad." + key, en);
    const toast = (msg, kind) => {
        if (typeof sac.toast === "function") sac.toast(msg, { kind });
    };

    /* ------------------------------------------------ dependencies -- */

    const loaded = new Map();
    function script(src) {
        if (!loaded.has(src)) {
            loaded.set(src, new Promise((resolve, reject) => {
                const s = document.createElement("script");
                s.src = src;
                s.onload = resolve;
                s.onerror = () => reject(new Error("Could not load " + src));
                document.head.appendChild(s);
            }));
        }
        return loaded.get(src);
    }

    /** marked + DOMPurify first (the editor reads them as globals), then the
     *  editor itself — each only if the page does not have it already. The
     *  editor's file declares top-level classes, so loading it twice would
     *  throw: customElements.get is the guard. */
    let depsPromise = null;
    function deps() {
        if (!depsPromise) {
            depsPromise = (async () => {
                await Promise.all([
                    window.marked    ? null : script(BASE + "kit/js/vendor/marked.min.js"),
                    window.DOMPurify ? null : script(BASE + "kit/js/vendor/purify.min.js"),
                ]);
                if (!customElements.get("sac-md-editor")) await script(BASE + "vendor/sac-md-editor.js");
                await customElements.whenDefined("sac-md-editor");
            })();
            depsPromise.catch(() => { depsPromise = null; });   // a retry may work
        }
        return depsPromise;
    }
    deps().catch(() => {});   // start early; build() awaits the same promise

    /* ----------------------------------------------------- helpers -- */

    function stats(text) {
        const words = (text.match(/\S+/g) || []).length;
        return { words, chars: text.length, lines: text === "" ? 1 : text.split("\n").length };
    }

    const isTextFile = (file) =>
        /\.(md|markdown|mdown|txt)$/i.test(file.name) || /^text\//.test(file.type || "");

    /* --------------------------------------------------------- app -- */

    class AppMarkdownPad extends sac.app.Element {
        build() {
            sac.app.styles(BASE + "app.css", "app-markdown-pad-css");
            this.innerHTML = `
                <div class="toolbar mp-bar">
                    <button type="button" class="icon-btn mp-new"><sac-icon name="plus"></sac-icon></button>
                    <button type="button" class="icon-btn mp-open"><sac-icon name="folder"></sac-icon></button>
                    <button type="button" class="icon-btn mp-save"><sac-icon name="save"></sac-icon></button>
                    <button type="button" class="icon-btn mp-save-as"><sac-icon name="download"></sac-icon></button>
                    <span class="mp-sep"></span>
                    <button type="button" class="icon-btn mp-undo" disabled><sac-icon name="undo"></sac-icon></button>
                    <button type="button" class="icon-btn mp-redo" disabled><sac-icon name="redo"></sac-icon></button>
                    <span class="mp-file">
                        <span class="mp-dot" hidden></span>
                        <span class="mp-name"></span>
                    </span>
                    <button type="button" class="icon-btn mp-about"><sac-icon name="info"></sac-icon></button>
                </div>
                <sac-md-editor class="mp-editor"></sac-md-editor>
                <div class="mp-status sac-caption">
                    <span class="mp-stats"></span>
                    <span class="mp-state"></span>
                </div>
                <div class="mp-drop" hidden><span class="mp-drop-hint"></span></div>
            `;
            this.$ = (sel) => this.querySelector(sel);
            this._editor = this.$(".mp-editor");

            // Document state. _saved is the text as it is on disk (null: never
            // saved, or restored from a draft whose file is unknown).
            this._name   = null;
            this._handle = null;
            this._saved  = "";
            this._eol    = "\n";
            this._dirty  = false;
            this._draftTimer = null;

            this._text();
            this._wire();
        }

        /** Every visible string, in the current language. */
        _text() {
            const label = (sel, text) => {
                const el = this.$(sel);
                el.title = text;
                el.setAttribute("aria-label", text);
            };
            label(".mp-new",     t("new", "New"));
            label(".mp-open",    t("open", "Open…") + " (Ctrl+O)");
            label(".mp-save",    t("save", "Save") + " (Ctrl+S)");
            label(".mp-save-as", t("saveAs", "Save as…") + " (Ctrl+Shift+S)");
            label(".mp-undo",    t("undo", "Undo") + " (Ctrl+Z)");
            label(".mp-redo",    t("redo", "Redo") + " (Ctrl+Y)");
            label(".mp-about",   t("about", "About Markdown Pad"));
            this._editor.setAttribute("placeholder",
                t("placeholder", "Start writing — Markdown renders as you type."));
            this.$(".mp-drop-hint").textContent = t("dropHint", "Drop a file to open it");
            this._showName();
            this._showStats();
        }

        _wire() {
            const on = (sel, fn) => this.$(sel).addEventListener("click", fn);
            on(".mp-new",     () => this.newDoc());
            on(".mp-open",    () => this.open());
            on(".mp-save",    () => this.save());
            on(".mp-save-as", () => this.save({ as: true }));
            on(".mp-undo",    () => this._editor.undo());
            on(".mp-redo",    () => this._editor.redo());
            on(".mp-about",   () => this._about());

            this._editor.addEventListener("input", () => this._changed());
            this._editor.addEventListener("history-change", (e) => {
                this.$(".mp-undo").disabled = !e.detail.canUndo;
                this.$(".mp-redo").disabled = !e.detail.canRedo;
            });

            // App-local shortcuts: keydown bubbles (composed) out of the
            // editor's shadow root, so this only fires while focus is inside
            // THIS window — two windows never fight over Ctrl+S.
            this.addEventListener("keydown", (e) => {
                if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
                const k = e.key.toLowerCase();
                if (k === "s") { e.preventDefault(); this.save({ as: e.shiftKey }); }
                else if (k === "o" && !e.shiftKey) { e.preventDefault(); this.open(); }
            });

            // Drag a file in from the OS to open it.
            let depth = 0;
            const drop = this.$(".mp-drop");
            const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");
            this.addEventListener("dragenter", (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth++;
                drop.hidden = false;
            });
            this.addEventListener("dragover", (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            });
            this.addEventListener("dragleave", () => {
                if (depth > 0 && --depth === 0) drop.hidden = true;
            });
            this.addEventListener("drop", (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth = 0;
                drop.hidden = true;
                const file = e.dataTransfer.files[0];
                if (file) this._openFile(file, null);
            });
        }

        async onMount(context) {
            this._ctx = context;
            if (context.lang) this._offLang = context.lang.onChange(() => this._text());

            try {
                await deps();
            } catch (err) {
                console.error("[markdown-pad]", err);
                this._editor.replaceWith(Object.assign(document.createElement("p"), {
                    className: "mp-error",
                    textContent: t("loadFailed", "The editor could not be loaded."),
                }));
                return;
            }
            if (!this.isConnected) return;

            // A draft means the last session ended with unsaved work.
            const draft = context.fs ? await context.fs.read(DRAFT, null).catch(() => null) : null;
            if (draft && typeof draft.text === "string") {
                this._load(draft.text, { name: draft.name || null, handle: null, eol: draft.eol || "\n" });
                this._saved = null;
                this._changed();
                toast(t("restored", "Unsaved draft restored"), "info");
            } else {
                this._load("", { name: null, handle: null, eol: "\n" });
            }
            this._editor.focus();
        }

        onUnmount() {
            if (this._offLang) { this._offLang(); this._offLang = null; }
            if (this._draftTimer) { clearTimeout(this._draftTimer); this._draftTimer = null; this._writeDraft(); }
        }

        /* ------------------------------------------------ document -- */

        /** Put a document into the editor and call it clean. */
        _load(text, { name, handle, eol }) {
            this._editor.value = text;
            this._saved  = text;
            this._name   = name;
            this._handle = handle;
            this._eol    = eol;
            this._setDirty(false);
            this.$(".mp-undo").disabled = true;
            this.$(".mp-redo").disabled = true;
            this._showName();
            this._showStats();
        }

        _changed() {
            this._setDirty(this._editor.value !== this._saved);
            this._showStats();
            if (this._draftTimer) clearTimeout(this._draftTimer);
            this._draftTimer = setTimeout(() => {
                this._draftTimer = null;
                this._writeDraft();
            }, DRAFT_DELAY);
        }

        /** Unsaved text goes to the draft; a clean document clears it. */
        async _writeDraft() {
            const fs = this._ctx && this._ctx.fs;
            if (!fs) return;
            try {
                if (this._dirty) {
                    await fs.write(DRAFT, { name: this._name, eol: this._eol, text: this._editor.value });
                } else {
                    await fs.remove(DRAFT);
                }
            } catch (err) {
                // Full storage: the draft is a safety net, the file is the
                // real save — say nothing loud, but do not pretend.
                console.warn("[markdown-pad] draft not stored:", err);
            }
        }

        _setDirty(flag) {
            if (flag === this._dirty) return;
            this._dirty = flag;
            if (this._ctx && typeof this._ctx.setDirty === "function") this._ctx.setDirty(flag);
            this._showName();
        }

        _showName() {
            this.$(".mp-name").textContent = this._name || t("untitled", "Untitled.md");
            this.$(".mp-dot").hidden = !this._dirty;
            this.$(".mp-state").textContent = this._dirty
                ? t("unsaved", "Unsaved")
                : (this._handle ? t("saved", "Saved") : "");
        }

        _showStats() {
            const s = stats(this._editor.value || "");
            const n = (v, one, many) =>
                `${v.toLocaleString(sac.lang ? sac.lang.get() : undefined)} ${v === 1 ? one : many}`;
            this.$(".mp-stats").textContent = [
                n(s.words, t("word", "word"), t("words", "words")),
                n(s.chars, t("char", "character"), t("chars", "characters")),
                n(s.lines, t("line", "line"), t("lines", "lines")),
            ].join(" · ");
        }

        /** Unsaved work? Ask before throwing it away. → true to go on. */
        async _discardOk() {
            if (!this._dirty) return true;
            if (!sac.dialog) return window.confirm(t("discardTitle", "Discard unsaved changes?"));
            const a = await sac.dialog.confirm({
                title: t("discardTitle", "Discard unsaved changes?"),
                message: this._name || t("untitled", "Untitled.md"),
                buttons: [
                    { action: "cancel",  label: t("cancel", "Cancel"),   kind: "default" },
                    { action: "discard", label: t("discard", "Discard"), kind: "destructive" },
                ],
            });
            return a === "discard";
        }

        /* ------------------------------------------------- actions -- */

        async newDoc() {
            if (!(await this._discardOk())) return;
            this._load("", { name: null, handle: null, eol: "\n" });
            this._writeDraft();
            this._editor.focus();
        }

        async open() {
            const files = this._ctx && this._ctx.files;
            if (!files) return;
            if (!(await this._discardOk())) return;
            let picked;
            try {
                picked = await files.open({ accept: ACCEPT, title: t("open", "Open…") });
            } catch (err) {
                console.error("[markdown-pad] open:", err);
                toast(t("openFailed", "Could not read the file"), "error");
                return;
            }
            if (picked) await this._openFile(picked.file, picked.handle, { asked: true });
        }

        /** Read a File into the editor. `asked`: the discard question was
         *  already answered (open()); a drop still has to ask. */
        async _openFile(file, handle, { asked = false } = {}) {
            if (!isTextFile(file)) { toast(t("notText", "That is not a text file"), "warn"); return; }
            if (!asked && !(await this._discardOk())) return;
            let text;
            try {
                text = await file.text();
            } catch (err) {
                console.error("[markdown-pad] read:", err);
                toast(t("openFailed", "Could not read the file"), "error");
                return;
            }
            if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
            const eol = text.includes("\r\n") ? "\r\n" : "\n";
            text = text.replace(/\r\n?/g, "\n");
            this._load(text, { name: file.name, handle, eol });
            this._writeDraft();
            this._editor.focus();
        }

        /** Save in place when there is a handle, otherwise ask where. */
        async save({ as = false } = {}) {
            const files = this._ctx && this._ctx.files;
            if (!files) return;
            if (this._saving) return;
            this._saving = true;
            const text = this._editor.value;
            const out  = this._eol === "\n" ? text : text.replace(/\n/g, this._eol);
            const blob = new Blob([out], { type: "text/markdown" });
            try {
                const opts = (!as && this._handle)
                    ? { handle: this._handle, name: this._name }
                    : { name: this._name || t("untitled", "Untitled.md"), accept: ".md", type: "text/markdown",
                        title: t("saveAs", "Save as…") };
                const ref = await files.save(blob, opts);
                if (!ref) return;                           // cancelled
                this._name   = ref.name || this._name;
                this._handle = ref.handle || null;
                this._saved  = text;
                // Edits made while the dialog was open stay unsaved.
                this._setDirty(this._editor.value !== this._saved);
                this._showName();
                this._writeDraft();
                toast(this._handle ? t("saved", "Saved") : t("downloaded", "Downloaded"), "success");
            } catch (err) {
                console.error("[markdown-pad] save:", err);
                toast(t("saveFailed", "Save failed"), "error");
            } finally {
                this._saving = false;
            }
        }

        async _about() {
            if (!sac.about) return;
            let manifest = this._ctx && this._ctx.manifest;
            if (!manifest) {
                try { manifest = await (await fetch(BASE + "app.json")).json(); }
                catch { return; }
            }
            sac.about.open(manifest);
        }
    }

    sac.app.define("app-markdown-pad", AppMarkdownPad);
})();
