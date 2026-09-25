/**
 * <app-my-app> — your app.
 *
 * The whole contract is the three hooks below. Everything else — the guarded
 * tag, finding this script's folder, loading the stylesheet, and running with
 * no desktop at all — is sac.app's job.
 *
 * This template ships as a WINDOW app (app.json → "kind": "window"): it floats
 * above the desktop in a <sac-window> the host provides — on a phone, maximized
 * below the host's nav. To take the whole stage instead, see "Make it a
 * fullscreen app" in README.md.
 */
(function () {
    // Parse time, top level: document.currentScript is this file only here.
    const BASE = sac.app.base();

    // The app's own strings. English is the inline fallback at every sac.t()
    // call; tables add the other languages, keys namespaced by the app id.
    // A host on a kit older than 2.12 has no sac.i18n.add — English then.
    if (typeof sac.i18n.add === "function") {
        sac.i18n.add("de", {
            "my-app.title": "Meine App",
            "my-app.lead":  "Ersetze das hier durch das eigentliche Werkzeug.",
            "my-app.ready": "Bereit",
            "my-app.theme": "Theme",
            "my-app.act":   "Mach das Ding",
            "my-app.done":  "Das Ding ist gemacht.",
        });
    }

    class AppMyApp extends sac.app.Element {
        /** Once, on first connect. Light DOM, so the kit's tokens apply. */
        build() {
            sac.app.styles(BASE + "app.css", "app-my-app-css");
            this.innerHTML = `
                <h2 class="title"></h2>
                <p class="lead"></p>
                <sac-toggle class="ready" checked></sac-toggle>
                <p class="readout"><span class="theme-label"></span>: <code class="theme">—</code></p>
                <button class="btn primary act"></button>
            `;
            this._text();
        }

        /** Every visible string, in the current language. Re-run on a switch. */
        _text() {
            const t = (key, en) => sac.t("my-app." + key, en);
            this.querySelector(".title").textContent       = t("title", "My App");
            this.querySelector(".lead").textContent        = t("lead", "Replace this with the actual tool.");
            this.querySelector(".ready").setAttribute("label", t("ready", "Ready"));
            this.querySelector(".theme-label").textContent = t("theme", "theme");
            this.querySelector(".act").textContent         = t("act", "Do the thing");
        }

        /**
         * Once, when the app is really on screen — measure here if you must.
         *
         * context also carries what this template does not use: fs (the app's
         * own storage), files (Open… / Save as… on the user's files), identity,
         * and setDirty(true/false) while work is unsaved. Any slot can be null
         * on a host that does not grant it — check before you reach for it.
         */
        onMount(context) {
            const themeOut = this.querySelector(".theme");
            const show = (t) => { themeOut.textContent = t; };
            show(context.theme.get());
            // Returns an unsubscribe — keep it, call it in onUnmount.
            this._offTheme = context.theme.onChange(show);

            // The host owns the language switch, like the theme; the app only
            // re-renders. null on a host older than kit 2.12.
            if (context.lang) this._offLang = context.lang.onChange(() => this._text());

            this.querySelector(".act").addEventListener("click", () => {
                // sac.toast is the host's, and optional: never assume chrome.
                if (typeof sac.toast === "function") {
                    sac.toast(sac.t("my-app.done", "It did the thing."), { kind: "success" });
                }
            });
        }

        /** Only when the host removes the app. Undo what onMount did. */
        onUnmount() {
            if (this._offTheme) { this._offTheme(); this._offTheme = null; }
            if (this._offLang)  { this._offLang();  this._offLang  = null; }
        }
    }

    sac.app.define("app-my-app", AppMyApp);
})();
