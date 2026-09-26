# syntax=docker/dockerfile:1
# Production image for Queensy BnB (Next.js standalone output).
#   docker build -t queensy .
#   docker run --env-file .env -p 3000:3000 queensy
# Apply database migrations with the `migrate` target before starting a new release:
#   docker build --target migrate -t queensy-migrate . && docker run --env-file .env queensy-migrate

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN npx prisma generate && npx next build

# One-off job: apply pending migrations (non-destructive) then exit.
FROM deps AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system app && useradd --system --gid app --home /app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
