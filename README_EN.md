# Chronicle — Personal Growth Diary

Chronicle is a private, timeline-based journal for arranging memories, learning, achievements, and life chapters into an editable personal archive. The public reading experience is deliberately separate from the private editor: an event is private unless its owner explicitly chooses to share it.

| Area | What Chronicle currently provides |
|---|---|
| Writing | Dated events with flexible day, month, or year precision, tags, places, images, captions, filters, and manual ordering. |
| Reflection | Editable life chapters and AI-assisted stage reflections based only on events in the selected stage. |
| Sharing | Public or secret-link stories, optional password protection, expiration, and privacy-respecting access counts. |
| Portability | PDF, long-image, versioned JSON, and Markdown exports; JSON import is previewed before private events are created. |
| Local-first work | A PWA shell and `/quick-note` page preserve device-local draft text before a user is ready to place it in the full editor. |

## Privacy model

Chronicle treats the private editor as the source of truth. JSON and Markdown exports intentionally exclude authentication sessions, sharing tokens, password hashes, access logs, and object-storage keys. JSON import does not import media bytes, sharing configuration, account data, or credentials; imported events begin as private records.

## Local development

Use Node.js 22 with Corepack. Copy `.env.example` to `.env`, add only the values appropriate to your local stack, and never commit that file.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm dev
```

Read [LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) for provider selection, [SELF_HOSTING.md](./docs/SELF_HOSTING.md) for deployment and recovery guidance, and [CONTRIBUTING.md](./CONTRIBUTING.md) before proposing a change.

## Contributing

Please keep each pull request narrowly scoped. Describe the user impact, migration implications, privacy considerations, test results, and desktop/mobile verification. Changes involving diaries, media, sharing, AI, or import/export must preserve ownership boundaries and make their data handling explicit.

The project follows the [MIT License](./LICENSE) and the [Code of Conduct](./CODE_OF_CONDUCT.md).
