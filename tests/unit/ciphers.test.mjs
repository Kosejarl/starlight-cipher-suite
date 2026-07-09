import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Basementen } from '../../ciphers.js';

// Basementen is the cipher used by the password-protected vault ("The Basementen").
// Its actual confidentiality boundary is the master-password-gated AES-256-GCM key
// storage in app.js, not this substitution cipher - but a regression here (e.g. the
// key stops changing the output, or falls through to plaintext) would silently make
// vault contents readable without the key, so it's worth pinning down directly.

const SAMPLE_KEY = "Xk9#pQ2mZ!vB7nR4æøåÆØÅ";

test('Basementen encode/decode round-trips arbitrary text', () => {
    const plaintext = "The quick brown fox jumps over 12 lazy dogs!";
    const { result: encoded } = Basementen.encode(plaintext, SAMPLE_KEY, true);
    const { result: decoded } = Basementen.decode(encoded, SAMPLE_KEY, true);
    assert.equal(decoded, plaintext);
});

test('Basementen round-trips the custom Nordic alphabet characters', () => {
    const plaintext = "æøåÆØÅ blandet med ASCII 123";
    const { result: encoded } = Basementen.encode(plaintext, SAMPLE_KEY, true);
    const { result: decoded } = Basementen.decode(encoded, SAMPLE_KEY, true);
    assert.equal(decoded, plaintext);
});

test('Basementen ciphertext is not the plaintext (no accidental no-op)', () => {
    const plaintext = "Secret transaction contents";
    const { result: encoded } = Basementen.encode(plaintext, SAMPLE_KEY, true);
    assert.notEqual(encoded, plaintext);
});

test('Basementen with an empty key passes text through unchanged', () => {
    // Documents the existing fallback behavior: encode() with no key does not scramble
    // the input. Callers must never reach this path with real vault content while
    // still displaying it as if it were encrypted.
    const plaintext = "unprotected text";
    assert.equal(Basementen.encode(plaintext, '', true).result, plaintext);
    assert.equal(Basementen.decode(plaintext, '', true).result, plaintext);
});

test('Basementen output differs between two different keys', () => {
    const plaintext = "Same plaintext, different keys";
    const encodedA = Basementen.encode(plaintext, SAMPLE_KEY, true).result;
    const encodedB = Basementen.encode(plaintext, "a-completely-different-key-999", true).result;
    assert.notEqual(encodedA, encodedB);
});

test('Basementen respects retainPunctuation for characters outside its alphabet', () => {
    const plaintext = "Hello, World! @2026";
    const withPunctuation = Basementen.encode(plaintext, SAMPLE_KEY, true).result;
    const withoutPunctuation = Basementen.encode(plaintext, SAMPLE_KEY, false).result;

    assert.ok(withPunctuation.includes(','));
    assert.ok(withPunctuation.includes('!'));
    assert.ok(!withoutPunctuation.includes(','));
    assert.ok(!withoutPunctuation.includes('!'));
    // Spaces are always preserved regardless of retainPunctuation
    assert.ok(withoutPunctuation.includes(' '));
});
