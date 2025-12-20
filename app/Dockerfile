# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY app/package*.json ./app/

# Install dependencies
RUN npm ci --workspace=app

# Copy app source
COPY app/ ./app/

# Build the app
WORKDIR /app/app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app/app

# Copy production artifacts
COPY --from=builder /app/app/public ./public
COPY --from=builder /app/app/.next ./.next
COPY --from=builder /app/app/node_modules ./node_modules
COPY --from=builder /app/app/package.json ./package.json
COPY --from=builder /app/app/next.config.ts ./

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
