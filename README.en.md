# Chronicle — Personal Growth Timeline

[繁體中文 / Traditional Chinese](./README.md) · [English](./README.en.md) · [Local development](./docs/LOCAL_DEVELOPMENT.md) · [Self-hosting](./docs/SELF_HOSTING.md) · [Media archive format](./docs/MEDIA_ARCHIVE.md) · [Roadmap](./docs/roadmap/README.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

Chronicle is a private, timeline-first journal for preserving childhood memories, learning, milestones, turning points, and the chapters that connect them. Its editorial workspace lets people arrange lived experience into a long-term personal archive rather than a feed.

## What Chronicle provides

| Area | Capability |
| --- | --- |
| Private timeline | Create, edit, delete, search, filter, and manually reorder dated events with day, month, or year precision. |
| Media and tags | Attach multiple JPG, PNG, WebP, or GIF images, write captions, and change their order. |
| Life chapters | Group events into childhood, education, and career chapters, with editable boundaries. |
| Reflection | Build annual reviews in the browser and generate optional chapter reflections when AI is enabled. Local writing guides never send diary text to an external service. |
| Controlled sharing | Share only explicitly public events through public or secret links, with optional passwords, expiry dates, and access counts. |
| Portability | Export PDF, long-image, versioned JSON, Markdown, or a constrained ZIP media archive with event-image bytes. JSON imports create private events only and deliberately exclude credentials and media bytes. |
| Recovery | Keep event revision snapshots, restore an earlier version, or permanently delete the account through an explicit confirmation phrase. |
| Public homepage | Explore a focusable interactive timeboard, exposed filter state, a keyboard skip link, mobile navigation, reduced-motion support, branded social previews, and clear routes into examples or the editor. |
| Offline quick notes | `/quick-note` keeps a draft in the current device’s browser, works offline, and lets a person copy the draft into the full editor when ready. |

## Privacy commitments

Chronicle treats a diary as private by default. API procedures scope data to the authenticated owner, and public reading pages expose only events explicitly marked for sharing. Media bytes live in object storage; database rows retain only their keys, URLs, and metadata. Share passwords are not stored in plain text.

AI chapter reflections are optional. Turning off the diary-level AI preference blocks new generation requests on the server, while saved reflections can be deleted without changing the underlying events. The editor’s writing-guide buttons run entirely in the browser and add editable prompt text to the local draft; they do not call an AI service or transmit diary content.

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
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

To run the 375px public-homepage browser regression, start an HTTPS preview and provide its URL:

```bash
CHRONICLE_E2E_BASE_URL=https://your-preview.example corepack pnpm test:e2e:mobile-nav
```

For local authentication, S3/MinIO-compatible storage, OpenAI-compatible LLM configuration, and environment-variable details, see [Local development](./docs/LOCAL_DEVELOPMENT.md). For MySQL, object storage, backups, restores, and deployment operations, see [Self-hosting](./docs/SELF_HOSTING.md).

## Project map

```text
client/src/pages/DiaryEditor.tsx   Private journal editor
client/src/pages/SharedStory.tsx   Public and secret-link story reader
client/src/lib/                    Browser-only export, import, filter, and writing helpers
server/routers/diary.ts            Protected diary and public sharing contracts
server/db.ts                       Data access, ownership checks, and storage coordination
drizzle/schema.ts                  MySQL/TiDB-compatible data model
```

## Contributing and community

Read [AGENTS.md](./AGENTS.md) before changing the application. It defines architecture, privacy, migration, and visual-system rules. The repository includes [contribution guidance](./CONTRIBUTING.md), [test placement rules](./docs/TESTING.md), [router boundaries](./docs/ARCHITECTURE.md), a [feature roadmap](./docs/roadmap/README.md), a [code of conduct](./CODE_OF_CONDUCT.md), and a [security reporting policy](./SECURITY.md). CI checks formatting, TypeScript, Vitest, production builds, and the public-homepage browser regression.

## License

Chronicle is released under the [MIT License](./LICENSE).
