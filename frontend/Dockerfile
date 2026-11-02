FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

# Vite values are public build-time configuration, never credentials.
ARG VITE_API_URL=/backend
ARG VITE_SOCKET_URL=/
ARG VITE_GOOGLE_CLIENT_ID=
RUN VITE_API_URL="$VITE_API_URL" \
    VITE_SOCKET_URL="$VITE_SOCKET_URL" \
    VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
