import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from '../helpers/server.mjs';
import { launchBrowser } from '../helpers/browser.mjs';

// Security regression tests for "The Basementen" vault: the only part of this app that
// protects real secrets (master-password-gated AES-256-GCM key storage, encrypted
// transaction history, and the auto-lock/key-lifecycle behavior around it). These drive
// the real page in a real browser rather than importing app.js directly, since app.js
// wires itself to the DOM at module-load time.

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const MASTER_PASSWORD = 'CorrectHorseBattery1!';
const IDLE_LOCK_MS = 5 * 60 * 1000;

let server, browser, context, page;

before(async () => {
    server = await startStaticServer();
    browser = await launchBrowser();
});

after(async () => {
    await browser.close();
    await server.close();
});

beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.clock.install();
    await page.goto(server.url + '/index.html');
    await page.waitForTimeout(300);
});

afterEach(async () => {
    await context.close();
});

async function openBasementen() {
    await page.click('button[data-cipher="basementen"]');
    await page.waitForTimeout(200);
}

// Runs first-time setup (choose master password) and leaves the vault unlocked.
async function setupVault(masterPassword = MASTER_PASSWORD) {
    await openBasementen();
    await page.fill('#basementen-setup-pwd-input', masterPassword);
    await page.fill('#basementen-setup-confirm-input', masterPassword);
    await page.clock.runFor(11000); // the setup form has a mandatory 10s "read this" countdown
    await page.waitForTimeout(300);
    await page.click('#basementen-setup-submit');
    await page.waitForTimeout(300); // real time: PBKDF2 (600k iterations) is genuine work, not virtualized
}

function keyStatus() {
    return page.textContent('#basementen-key-status');
}

test('master key is stored encrypted at rest, not as recognizable plaintext', async () => {
    await setupVault();

    // Compose and save a transaction with a distinctive plaintext marker.
    const marker = 'SECURITY_TEST_PLAINTEXT_MARKER_7f3a';
    await page.fill('#basementen-tx-password', 'AnotherStrongTxPass1!');
    await page.fill('#text-input', marker);
    await page.waitForTimeout(300);
    await page.fill('#basementen-tx-name', 'marker-transaction');
    await page.click('#basementen-save-tx');
    await page.waitForTimeout(300);

    const raw = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    assert.ok(!raw.includes(marker), 'plaintext transaction content must not appear anywhere in localStorage');

    const stored = await page.evaluate(() => ({
        encryptedKey: localStorage.getItem('basementen_encrypted_key'),
        salt: localStorage.getItem('basementen_salt'),
        iv: localStorage.getItem('basementen_iv'),
    }));
    assert.match(stored.encryptedKey, /^[0-9a-f]+$/, 'stored key material is opaque hex ciphertext');
    assert.match(stored.salt, /^[0-9a-f]+$/);
    assert.match(stored.iv, /^[0-9a-f]+$/);
});

test('wrong master password is rejected without unlocking the vault', async () => {
    await setupVault();
    await openBasementen(); // click away then back to force the unlock modal
    await page.click('button[data-cipher="caesar"]');
    await page.waitForTimeout(200);
    await page.click('button[data-cipher="basementen"]');
    await page.waitForSelector('#basementen-unlock-modal:not(.hidden)', { timeout: 3000 });

    await page.fill('#basementen-unlock-pwd-input', 'TotallyWrongPassword1!');
    await page.click('#basementen-unlock-submit');
    await page.waitForTimeout(300);

    assert.match(await page.textContent('#basementen-unlock-error'), /incorrect/i);
    assert.match(await keyStatus(), /Locked/);
    assert.equal(await page.isVisible('#basementen-unlock-modal:not(.hidden)'), true);
});

test('transaction password cannot be the same as the master password', async () => {
    await setupVault();
    await page.fill('#basementen-tx-password', MASTER_PASSWORD);
    await page.waitForTimeout(300);

    assert.match(await page.textContent('#basementen-tx-error'), /cannot be the same as the master password/i);
    assert.equal(await page.isDisabled('#text-input'), true);
});

test('a corrupted stored key blob fails to unlock instead of crashing', async () => {
    await setupVault();

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Simulate tampering with localStorage (e.g. disk edit, sync conflict, corruption).
    await page.evaluate(() => {
        const key = localStorage.getItem('basementen_encrypted_key');
        localStorage.setItem('basementen_encrypted_key', key.slice(0, -4) + '0000');
    });

    await page.click('button[data-cipher="caesar"]');
    await page.waitForTimeout(200);
    await page.click('button[data-cipher="basementen"]');
    await page.waitForSelector('#basementen-unlock-modal:not(.hidden)', { timeout: 3000 });
    await page.fill('#basementen-unlock-pwd-input', MASTER_PASSWORD);
    await page.click('#basementen-unlock-submit');
    await page.waitForTimeout(300);

    assert.match(await keyStatus(), /Locked/);
    assert.equal(pageErrors.length, 0, `tampered vault data must not throw unhandled errors: ${pageErrors.join(', ')}`);
});

test('vault auto-locks and clears in-memory/DOM secrets after idle timeout', async () => {
    await setupVault();
    await page.fill('#basementen-tx-password', 'AnotherStrongTxPass1!');
    await page.fill('#text-input', 'plaintext that must not survive a lock');
    await page.waitForTimeout(300);

    await page.clock.runFor(IDLE_LOCK_MS + 60_000);
    await page.waitForTimeout(300);

    assert.match(await keyStatus(), /Locked/);
    assert.equal(await page.inputValue('#basementen-tx-password'), '');
    assert.equal(await page.inputValue('#text-input'), '');
    assert.match(await page.inputValue('#text-output'), /LOCKED/);
});

test('vault locks immediately when the tab is hidden', async () => {
    await setupVault();
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);

    assert.match(await keyStatus(), /Locked/);
});

test('activity resets the idle timer so an actively-used vault does not lock', async () => {
    await setupVault();

    for (let i = 0; i < 4; i++) {
        await page.mouse.move(100 + i, 100);
        await page.clock.runFor(2 * 60 * 1000); // 4 x 2min = 8min total, each step under the 5min limit
    }

    assert.match(await keyStatus(), /Active/);
});

test('Wipe & Reset removes all vault data from localStorage', async () => {
    await setupVault();
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#basementen-reset-pwd');
    await page.waitForTimeout(300);

    const remaining = await page.evaluate(() => ({
        key: localStorage.getItem('basementen_encrypted_key'),
        salt: localStorage.getItem('basementen_salt'),
        iv: localStorage.getItem('basementen_iv'),
        history: localStorage.getItem('basementen_history'),
    }));
    assert.deepEqual(remaining, { key: null, salt: null, iv: null, history: null });
});

test('user-supplied transaction data cannot inject markup into the history/log views', async () => {
    await setupVault();
    const injectionPayload = '<img src=x onerror="window.__xssFired=true">';

    await page.fill('#basementen-tx-password', 'AnotherStrongTxPass1!');
    await page.fill('#text-input', injectionPayload);
    await page.waitForTimeout(300);
    await page.fill('#basementen-tx-name', injectionPayload);
    await page.click('#basementen-save-tx');
    await page.waitForTimeout(300);

    await page.click('#basementen-view-log');
    await page.waitForTimeout(300);

    const xssFired = await page.evaluate(() => window.__xssFired === true);
    assert.equal(xssFired, false, 'injected markup in a transaction name must never execute');

    const injectedElementExists = await page.evaluate(
        () => document.querySelector('#basementen-log-rows img') !== null
    );
    assert.equal(injectedElementExists, false, 'the payload must be rendered as inert text, not parsed as an element');
});

test('PBKDF2 iteration count has not regressed below the OWASP-recommended floor', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'app.js'), 'utf8');
    const match = source.match(/name:\s*"PBKDF2"[\s\S]{0,120}?iterations:\s*(\d+)/);
    assert.ok(match, 'could not locate the PBKDF2 iteration count in app.js');
    const iterations = Number(match[1]);
    assert.ok(iterations >= 600_000, `PBKDF2 iterations dropped to ${iterations}, below the 600,000 floor`);
});
