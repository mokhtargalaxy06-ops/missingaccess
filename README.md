# Missing Access

A Quran accessibility pilot built with Next.js, TypeScript, SQLite, and islamic-content-sdk. Read Arabic verses alongside sourced translations, request an audio reading of a translation, and publish after an independent human review.

## Run locally

Requires Node.js 24 or newer.

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:3000. Six labelled starter requests contain real Quran verses, Arabic text, French/English translations, source links, and translator footnotes retrieved from QuranEnc. Starter requests are invitations to contribute, not claims of requests from real recipients. There are no pre-created users or fabricated contribution statistics.

## Try the complete workflow

1. Register a volunteer account using **Sign in → Create an account**.
2. Open a Quran starter request or select a QuranEnc translation, surah, and verse to create your own. Record a reading of the translation with your microphone or upload MP3, WAV, OGG, WebM, or M4A audio (20 MB maximum). Translation readings are distinguished from Arabic Quran recitation.
3. Listen back, confirm sharing permission, and submit for review.
4. Sign out and register a second account for the reviewer.
5. Grant reviewer access from this project's terminal:

```powershell
npm.cmd run reviewer -- reviewer@example.com
```

6. Refresh the page. Open **Review queue**, listen, check the exact source and rights, and approve or request changes. A reviewer cannot approve their own work.
7. Approved recordings appear in **Accessible library**. Requested changes reopen the request so a corrected recording can be submitted; prior review feedback remains visible to its contributor and reviewers.

All accounts start as volunteers. Only an operator with server access can grant reviewer privileges. There is no public role-switching endpoint.

## Content sources

The request form supports only QuranEnc translation lookup through `islamic-content-sdk`. The server fetches and stores Arabic text, translation, footnotes, and reference, and derives the recording language from the provider's translation metadata. It does not accept user-supplied scripture or a mismatched language. Identical Quran source URL + recording language requests are linked to the existing request. A provider outage displays a retryable error rather than substituting invented religious text.

`lib/quran-starters.json` is a checked-in snapshot retrieved from QuranEnc, with retrieval timestamps. Refresh it with `node --use-system-ca scripts/sync-quran.mjs`. It seeds new starter requests; existing stored requests and recordings are not overwritten by refreshing the snapshot. Existing non-Quran requests and associated recordings are retained in SQLite/on disk for preservation, but excluded from the board, detail endpoints, contribution lists, and public playback. Accounts remain intact.

The submitter must verify permission to adapt and redistribute the source. Reviewers check this before publication. A provider reference is not itself a license. The pilot does not automatically evaluate theological correctness or establish copyright ownership.

## Storage and deployment

SQLite is accessed through Node's built-in `node:sqlite` module; Node 24 may print its experimental API warning. Parameterized queries, WAL mode, foreign keys, and transactions protect the core workflow. Data is stored in `data/charity.sqlite`; recordings live in `data/audio/`, outside the public directory. Set `DATA_DIR` to change the location. Keep that value identical for the app and reviewer command.

```powershell
npm.cmd run build
npm.cmd start
```

Run a single Node.js deployment with persistent disk. The default commands bind to loopback. For public deployment, put an HTTPS reverse proxy in front, set `APP_ORIGIN` to the exact public origin, and set `SECURE_COOKIES=true`. Configure the proxy to limit request bodies to about 21 MB and rate-limit clients. Browser microphone capture requires localhost or HTTPS. Do not deploy this local-file architecture to ephemeral serverless storage or run separate replicas with independent disks.

Stop the app before copying the complete data directory for a simple consistent backup, including the database, any WAL files, and recordings. Keep backups outside the served directory and test restoration. Audio storage and bandwidth grow with uploads.

Authentication uses salted scrypt password hashes and expiring, hashed session tokens in HttpOnly SameSite cookies. Access to unpublished audio is limited to the contributor and reviewers. Published recordings are public. State-changing endpoints check request origins, and reviewer authorization is checked on the server. Recordings are capped and container signatures checked; a human reviewer still needs to verify playable, appropriate audio.

This is a pilot, not a complete public-service operation: email verification, password recovery, abuse reporting, account deletion tooling, automated audio transcoding, and operational monitoring are not implemented. The UI uses custom CSS and Lucide icons; Google Fonts have local system-font fallbacks.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Tests use a temporary database and cover review authorization, self-review prevention, concurrent submission state, request reopening, and audio format checks.

Run `npm.cmd run test:e2e` after a build for Chrome browser checks. These start an isolated server on port 3100 and store test-only data in `.test-data/browser/`. Chrome must be installed. The browser tests cover mobile layout, filters, account creation, submission, private audio access, independent review, publication, and HTTP audio seeking. Screenshots are saved under `test-results/`.

The dev and start commands enable Node's system certificate store (`--use-system-ca`) so provider calls work on systems with locally trusted corporate certificates without disabling TLS verification.
