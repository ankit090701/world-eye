# syntax=docker/dockerfile:1

# WorldEye — multi-stage build for both apps of the npm-workspaces monorepo.
#   docker build --target api -t worldeye-api .   Express API (Node, non-root)
#   docker build --target web -t worldeye-web .   static build + /api proxy (nginx, non-root)
# `docker compose up --build` builds and runs both (see compose.yaml).

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.30

# Workspace dependencies, dev deps included (both apps build from these).
# Only manifests are copied, so this layer stays cached until deps change.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# API: TypeScript -> apps/api/dist, run by plain node with prod deps only.
FROM deps AS api-build
COPY apps/api/ apps/api/
RUN npm run build -w @worldeye/api

FROM node:${NODE_VERSION}-alpine AS api-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace @worldeye/api --no-audit --no-fund

FROM node:${NODE_VERSION}-alpine AS api
ENV NODE_ENV=production \
    PORT=8787
WORKDIR /app
COPY --from=api-deps /app/node_modules node_modules/
COPY apps/api/package.json apps/api/
COPY --from=api-build /app/apps/api/dist apps/api/dist/
WORKDIR /app/apps/api
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1
# Containers often lack IPv6, so a slow upstream's IPv4 connect must not be cut
# off by Node's 250 ms happy-eyeballs attempt timeout (seen with NASA EONET).
CMD ["node", "--network-family-autoselection-attempt-timeout=2500", "dist/index.js"]

# Web: typecheck + Vite production build, served by nginx.
FROM deps AS web-build
# Empty = call the API on the same origin (the nginx stage proxies /api).
ARG VITE_API_BASE=
ENV VITE_API_BASE=${VITE_API_BASE}
COPY apps/web/ apps/web/
RUN npm run build -w @worldeye/web

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS web
# Where /api/* is proxied; resolved per request via the container's DNS.
ENV API_UPSTREAM=http://api:8787 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY docker/nginx/default.conf.template /etc/nginx/templates/
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --start-interval=2s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
