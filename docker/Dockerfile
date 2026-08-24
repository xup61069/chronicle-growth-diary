# Portable self-hosting image. It deliberately lives outside the repository root
# so Chronicle's managed deployment continues to use its platform build contract.
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack pnpm fetch --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store
COPY . .
RUN pnpm install --offline --frozen-lockfile && pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S chronicle && adduser -S chronicle -G chronicle
ENV NODE_ENV=production
COPY --from=build --chown=chronicle:chronicle /app/package.json ./
COPY --from=build --chown=chronicle:chronicle /app/node_modules ./node_modules
COPY --from=build --chown=chronicle:chronicle /app/dist ./dist
COPY --from=build --chown=chronicle:chronicle /app/drizzle ./drizzle
COPY --from=build --chown=chronicle:chronicle /app/drizzle.config.ts ./drizzle.config.ts
COPY --chown=chronicle:chronicle docker/entrypoint.sh /usr/local/bin/chronicle-entrypoint
RUN chmod 0555 /usr/local/bin/chronicle-entrypoint
USER chronicle
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/chronicle-entrypoint"]
CMD ["node", "dist/index.js"]
