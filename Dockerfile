# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/shared ./shared

# Create data directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 5005

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5005
ENV DATABASE_URL=/app/data/database.sqlite

# Run the application
CMD ["node", "dist/index.cjs"]

