# --- build stage ---------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- runtime stage -------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
# standalone server + static assets + public files (generated demo documents, logos)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# seeded demo documents, served through /files/[name] with a customer access check
COPY --from=build /app/assets ./assets
# runtime state (seeded on first request; ephemeral on Cloud Run). The app runs as the unprivileged
# `node` user, which may only write its data dir and Next's cache (.next): server code, node_modules
# and the shipped documents stay root-owned and read-only for the running process.
RUN mkdir -p data/uploads && chown -R node:node data .next
USER node
EXPOSE 8080
CMD ["node", "server.js"]
