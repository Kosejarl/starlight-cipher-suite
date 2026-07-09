import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

// This sandbox pre-installs Chromium outside node_modules and points
// PLAYWRIGHT_BROWSERS_PATH at it; PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD keeps `npm install`
// from re-fetching it. Elsewhere (a laptop, normal CI), neither is set, so fall back to
// Playwright's own managed download via a plain chromium.launch().
const PRE_INSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';

export function launchBrowser(options = {}) {
    if (existsSync(PRE_INSTALLED_CHROMIUM)) {
        return chromium.launch({ executablePath: PRE_INSTALLED_CHROMIUM, ...options });
    }
    return chromium.launch(options);
}
