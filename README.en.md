# Chronicle — Personal Growth Timeline

[繁體中文 / Traditional Chinese](./README.md) · [English](./README.en.md) · [AI handoff](./docs/AI_HANDOFF.md) · [Design system](./docs/DESIGN_SYSTEM.md) · [Local development](./docs/LOCAL_DEVELOPMENT.md) · [Self-hosting](./docs/SELF_HOSTING.md) · [Media archive format](./docs/MEDIA_ARCHIVE.md) · [Roadmap](./docs/roadmap/README.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

Chronicle is a private, timeline-first journal for preserving childhood memories, learning, milestones, turning points, and the chapters that connect them. Its editorial workspace lets people arrange lived experience into a long-term personal archive rather than a feed.

## What Chronicle provides

| Area | Capability |
| --- | --- |
| Private timeline | Create, edit, delete, search, filter, and manually reorder dated events with day, month, or year precision. |
| Media and tags | Attach multiple JPG, PNG, WebP, or GIF images, write captions, and change their order. |
| Private photo time and place import | Inspect JPEG capture time locally before confirmation, manually fill missing EXIF, correct each date-time, and apply a shared or second-incremented time to selected photos. When a person explicitly opens the location tool, they can correct GPS, request a map, and click or drag its marker before private creation and media upload. |
| iPhone media review | HEIC/HEIF converts to JPEG locally only after confirmation. A matching MOV can be reviewed as a Live Photo companion, with source, JPEG-copy, and MOV size estimates shown before import. |
| Calendar and backfill | Parse ICS in the browser into editable private drafts; recurring events do not expand by default. The backfill assistant only reports private-event date gaps and the current preview-photo count, never bodies, GPS, or file content. |
| De-identified sharing media | Face detection and blur previews run on-device only when an owner requests a sharing copy. Owners can add, adjust, or remove manual masks; originals and face coordinates are never sent out. |
| Life chapters | Group events into childhood, education, and career chapters, with editable boundaries. |
| Reflection | Build annual reviews in the browser and generate optional chapter reflections when AI is enabled. Local writing guides never send diary text to an external service. |
| Controlled sharing | Share only explicitly public events through public or secret links, with optional passwords, expiry dates, and access counts. |
| Portability | Export PDF, long-image, versioned JSON, Markdown, or a constrained ZIP media archive with event-image bytes. JSON imports create private events only and deliberately exclude credentials and media bytes. |
| Recovery | Keep event revision snapshots, restore an earlier version, or permanently delete the account through an explicit confirmation phrase. |
| Public homepage | Explore a focusable interactive timeboard, exposed filter state, a keyboard skip link, mobile navigation, reduced-motion support, branded social previews, and clear routes into examples or the editor. |
| Offline quick notes | `/quick-note` keeps a draft in the current device’s browser, works offline, and lets a person copy the draft into the full editor when ready. |
| System-share quick notes | When installed as a PWA, mobile system sharing can pass a title, text, and safe URL into the local `/quick-note` draft. It never auto-creates an event, uploads an attachment, or writes to the server. |
| Growth dashboard | The diary owner can view monthly writing density, life chapters, keywords, and writing streaks in `/dashboard`, aggregated from private events only and without returning event bodies, media, or locations. |
| Voice diary | Record on a private event and keep the recording on the current device first. Every upload requires renewed consent before transcription; original audio and transcripts can be removed individually, and shared stories never return voice fields. |
| A5 private book | The diary owner can open an A5 preview arranged by life chapter, then choose to print or save as PDF. Locked time capsules are redacted. |
| Family event reactions | Diary owners and invited members can leave real heart, resonance, celebration, or support reactions on private events. The UI exposes only aggregate counts and the current member’s state; public and link stories are isolated from them. |
| Route loading boundaries | The public homepage does not preload workspace charts, document export, or collaboration UI. Non-home routes announce an accessible loading state while their chunks load. |
| Dark-first theme | New sessions start in the dark workspace. The homepage offers a light/dark control and preserves the chosen mode after reload. |
| Full archive and restore | Owners can create a versioned ZIP with portable content, bounded attachments, and a SHA-256 manifest while seeing preparation, attachment-read, packaging, and completion progress. Restore validates the ZIP in-browser, stages and rechecks attachments server-side, then replaces the private diary in one transaction only after typed confirmation; sharing resets to private. |

## Privacy commitments

Chronicle treats a diary as private by default. API procedures scope data to the authenticated owner, and public reading pages expose only events explicitly marked for sharing. Media bytes live in object storage; database rows retain only their keys, URLs, and metadata. Share passwords are not stored in plain text.

AI chapter reflections are optional. Turning off the diary-level AI preference blocks new generation requests on the server, while saved reflections can be deleted without changing the underlying events. The editor’s writing-guide buttons run entirely in the browser and add editable prompt text to the local draft; they do not call an AI service or transmit diary content.

## Private-feature data boundaries

| Feature | When data is processed | Visibility and removal |
| --- | --- | --- |
| Annual AI review | The owner must confirm each generation; the server selects only private events from the requested year. | Public and link events never enter the prompt. Only the owner can generate or export the review. |
| Voice diary | Audio is sent to transcription only after the person checks consent for that upload; offline recordings never auto-upload in the background. | Original audio lives in protected object storage and its table stores location plus metadata. Audio and transcript can be removed, and shared stories exclude both. |
| Family reactions | A member explicitly clicks to add or remove a reaction. | Only diary members can read or write reactions on private events. There are no seeded or synthetic reactions, and sharing removes the field. |
| A5 private book | The owner presses the preview control in the workspace. | Printing and saving are browser-initiated. Locked capsules redact body text, media, and transcripts. |
| Photo EXIF and GPS import | JPEG capture time is organised in the current browser. GPS is read and shown only when a person explicitly uses the location tool. | No media, event, or map image is persisted before confirmation; a map is requested only after an explicit action through the protected proxy. Confirmed coordinates are stored only as `precise`/`private` event locations and never returned to public or link stories. |
| ICS and HEIC/Live Photo | ICS and iPhone media are reviewed in the browser before confirmation; HEIC/HEIF converts locally only after confirmation. | ICS omits attendees, alarms, URLs, and attachments. Live Photo MOV files never become event hero images, and no event or upload occurs before confirmation. |
| De-identified sharing media | Detection, blur, and manual masks run locally only when an owner builds a sharing copy. | Originals, face coordinates, and unconfirmed copies never enter the public projection; removing a copy does not fall back to the original. |
| Full archive and restore | Processing begins only when an owner downloads or selects a ZIP. | ZIPs exclude credentials, tokens, passwords, source URLs, storage keys, access/invite/audit data. Restore verifies checksums, uses staging plus a fixed confirmation phrase and one transaction, and forces the result private. |

The reproducible scope, sharing-redaction, and cross-viewport evidence lives in [`docs/VALIDATION_LOG.md`](./docs/VALIDATION_LOG.md).

## Current public validation status

The public homepage and `/quick-note` can be used without sign-in. The 375px public-browser regression covers the skip link, reduced-motion preference, keyboard timeboard exploration, filter selection state, mobile navigation, story examples, and the offline quick-note entry. Open Graph and Twitter previews now use a branded Chronicle timeboard visual rather than a logo-only image.

> Formal Manus OAuth is currently blocked outside the application: both the public-preview redirect and a direct visit to `https://manus.im/app-auth` returned a CloudFront 403. The formal `diary.get` success proof on the primary development site therefore remains deferred; the rejection occurs before Chronicle’s callback. See [`docs/VALIDATION_LOG.md`](./docs/VALIDATION_LOG.md) for the documented boundary and the separate local-auth evidence.

The validation baseline is intentionally concise. Use [GitHub Releases](https://github.com/xup61069/chronicle-growth-diary/releases) for version notes and [GitHub Discussions](https://github.com/xup61069/chronicle-growth-diary/discussions) for longer design and planning conversations rather than using commits as a work log.

## Local development

Use Node.js 22 with Corepack. Keep all credentials in an untracked `.env` file, copy the repository configuration as needed, and run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Run the quality gate before opening a pull request:

```bash
corepack pnpm lint
corepack pnpm check
corepack pnpm test
corepack pnpm verify:secrets
corepack pnpm audit:prod
./node_modules/.bin/vite build
corepack pnpm exec esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

`corepack pnpm build` remains suitable in a normal environment. In this sandbox, the combined build can occasionally receive an external SIGTERM after server bundling, so handoff and CI diagnosis should use the separate Vite and esbuild results above to determine the real build state.

To run the 375px public-homepage browser regression, start an HTTPS preview and provide its URL:

```bash
CHRONICLE_E2E_BASE_URL=https://your-preview.example corepack pnpm test:e2e:mobile-nav
```

The private workspace regression uses local authentication. Start an HTTPS development service with both `AUTH_DRIVER=local` and `VITE_AUTH_DRIVER=local`, then run:

```bash
CHRONICLE_E2E_BASE_URL=https://your-local-auth-preview.example corepack pnpm test:e2e:isolated
CHRONICLE_E2E_BASE_URL=https://your-local-auth-preview.example CHRONICLE_E2E_VIEWPORT=desktop corepack pnpm test:e2e:isolated
CHRONICLE_E2E_BASE_URL=https://your-preview.example node e2e/dark-mode-home-validation.mjs
```

For local authentication, S3/MinIO-compatible storage, OpenAI-compatible LLM configuration, and environment-variable details, see [Local development](./docs/LOCAL_DEVELOPMENT.md). For MySQL, object storage, backups, restores, and deployment operations, see [Self-hosting](./docs/SELF_HOSTING.md).

## Project map

```text
client/src/pages/DiaryEditor.tsx   Private journal editor
client/src/pages/SharedStory.tsx   Public and secret-link story reader
client/src/lib/                    Browser-only export, import, filter, and writing helpers
client/src/lib/printBook.ts         A5 private-book composition and capsule redaction
client/src/lib/voiceDrafts.ts       Browser-side offline voice-draft queue
client/src/lib/fullDiaryArchive.ts  Full ZIP, manifest, checksum, and progress helpers
server/db/voiceNotes.ts             Private audio and transcript coordination
server/db/familyCollaboration.ts    Member, comment, and event-reaction authorization
server/routers/diary.ts            Protected diary and public sharing contracts
server/routers/archiveRestore.ts   Owner-only full-archive staging and confirmation contract
server/db/archiveRestore.ts        Restore asset checksums, transaction commit, and cancellation
server/db.ts                       Data access, ownership checks, and storage coordination
drizzle/schema.ts                  MySQL/TiDB-compatible data model
```

## Contributing and community

Read [AGENTS.md](./AGENTS.md) before changing the application. The [design system](./docs/DESIGN_SYSTEM.md) is the source of truth for the visual language, and AI handoff begins with [docs/AI_HANDOFF.md](./docs/AI_HANDOFF.md), which records current boundaries, verification, blockers, and next priorities. The repository includes [contribution guidance](./CONTRIBUTING.md), [test placement rules](./docs/TESTING.md), [router boundaries](./docs/ARCHITECTURE.md), a [feature roadmap](./docs/roadmap/README.md), a public [Issue backlog](https://github.com/xup61069/chronicle-growth-diary/issues), a [code of conduct](./CODE_OF_CONDUCT.md), and a [security reporting policy](./SECURITY.md). CI checks formatting, TypeScript, Vitest, production builds, and independent public-homepage and dark-mode browser regressions.

## License

Chronicle is released under the [MIT License](./LICENSE).
