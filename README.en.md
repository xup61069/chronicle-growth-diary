# Chronicle — Personal Growth Timeline

[繁體中文](./README.md) · [Local development](./docs/LOCAL_DEVELOPMENT.md) · [Self-hosting](./docs/SELF_HOSTING.md) · [Media archive format](./docs/MEDIA_ARCHIVE.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

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

## Privacy commitments

Chronicle treats a diary as private by default. API procedures scope data to the authenticated owner, and public reading pages expose only events explicitly marked for sharing. Media bytes live in object storage; database rows retain only their keys, URLs, and metadata. Share passwords are not stored in plain text.

AI chapter reflections are optional. Turning off the diary-level AI preference blocks new generation requests on the server, while saved reflections can be deleted without changing the underlying events. The editor’s writing-guide buttons run entirely in the browser and add editable prompt text to the local draft; they do not call an AI service or transmit diary content.

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

Read [AGENTS.md](./AGENTS.md) before changing the application. It defines architecture, privacy, migration, and visual-system rules. The repository includes [contribution guidance](./CONTRIBUTING.md), a [code of conduct](./CODE_OF_CONDUCT.md), a [security reporting policy](./SECURITY.md), and CI checks for TypeScript, Vitest, and production builds.

## License

Chronicle is released under the [MIT License](./LICENSE).
