# ==============================================================================
# Stage 1: Build Application with Deno
# ==============================================================================
FROM denoland/deno:debian AS builder

WORKDIR /app

# Cache dependencies
COPY deno.json package*.json ./
RUN deno install

# Copy source code and build
COPY . .
RUN deno task build

# ==============================================================================
# Stage 2: Production Web Server
# ==============================================================================
FROM nginx:1.27-alpine AS runner

# Remove default nginx welcome assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built application assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy container runtime entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
