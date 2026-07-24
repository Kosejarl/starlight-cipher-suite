# Changelog

Notable changes per release. Pushing a version tag (e.g. `v1.6.0`) drafts a
GitHub Release from the matching section below — see
`.github/workflows/release.yml`. Full history lives on the
[Releases page](https://github.com/Zethrel/Basementen-Aegis/releases).

## v1.6.0

Ten cipher tools have grown to **30** since the last public release — this
build rounds out the classical toolkit with fractionation, matrix, and numeric
ciphers, plus the full WWI and Vigenère-family sets.

### New in v1.6.0

- **Trifid** — Bifid's three-dimensional sibling: every symbol is a point in a
  3×3×3 cube, and its three coordinates are scattered across the message.
  (English alphabet.)
- **Nihilist** — a keyword Polybius square turns each letter into a number, then
  a repeating key phrase's numbers are added on top, producing a stream of
  numbers. Danish/Norwegian and Swedish grids supported.
- **Hill** — the first cipher here with real linear algebra: letter pairs are
  multiplied by a 2×2 key matrix modulo 26. The app checks your matrix is
  reversible and warns if it isn't. (English alphabet.)

### Also new since the last public build (v1.2.0)

If you're updating from v1.2.0, these arrived along the way:

- **Keyword Substitution** and **Younger Futhark** runes *(v1.3.0)*
- **Bifid**, **Four-Square**, and **Gronsfeld** *(v1.4.0)*
- **ADFGVX** and **Porta** *(v1.5.0)*

Every new cipher ships with the same step-by-step process breakdown, and
Scandinavian alphabets (Danish/Norwegian Æ Ø Å, Swedish Å Ä Ö) are supported
wherever the cipher's design allows.

### Notes

- Still fully offline, no tracking, no accounts — an educational toolkit for
  learning and puzzles. None of these classic ciphers is secure encryption, and
  the app says so.
- **Windows desktop:** download and run `BasementenAegis.exe` from the release.
  On first launch it prompts once to trust its local signing certificate.

## v1.5.0

_v1.3.0–v1.5.0 were built and tagged during development but never published as
standalone GitHub Releases — their ciphers all ship together in the v1.6.0
public build. They're recorded here for the history._

- **ADFGVX** — the WWI German field cipher: a fractionating substitution on a
  keyword-seeded 6×6 grid (labelled A D F G V X) followed by a keyed columnar
  transposition. English fits 26 letters + digits 0–9; the Scandinavian grids
  fit their 29 letters + digits 0–6.
- **Porta** — a reciprocal Vigenère variant on the 26-letter alphabet, where
  each keyword letter pair selects one of 13 self-inverse rows, so Encode and
  Decode are the same operation.

## v1.4.0

- **Bifid** — Delastelle's fractionation cipher on a keyword-seeded Polybius
  square, spreading each letter's coordinates across the message. English 5×5,
  Scandinavian 6×5.
- **Four-Square** — a Playfair relative on two plaintext grids and two keyword
  grids; doubled letters need no special handling. English 5×5, Scandinavian
  4×7.
- **Gronsfeld** — a Vigenère variant keyed by digits 0–9, each digit the shift
  for its position. Scandinavian alphabets supported.

## v1.3.0

- **Keyword Substitution** — a monoalphabetic substitution whose cipher alphabet
  is seeded by a keyword, then the remaining letters in order. Scandinavian
  alphabets supported.
- **Younger Futhark** — a lossy 16-rune long-branch transliteration mapping
  Æ/Ø/Å and Ä/Ö onto their nearest runes.

## v1.2.0

Basementen Aegis is now a focused, educational cipher toolkit.

- **Removed The Basementen vault** — the app no longer includes password-based
  encryption; it's purely for learning, puzzles, and fun with classic ciphers.
- **Four new ciphers**: Affine, Playfair, Polybius square, and Bacon's cipher,
  each with a step-by-step process breakdown.
- **Scandinavian alphabets** (Danish/Norwegian Æ Ø Å, Swedish Å Ä Ö) supported
  across the new ciphers, selectable per message.

_Earlier releases (v1.0.0 – v1.1.4) are on the
[Releases page](https://github.com/Zethrel/Basementen-Aegis/releases)._
