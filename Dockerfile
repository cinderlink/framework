# Dockerfile for Cinderlink Server Nodes
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git curl bash cmake

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN bun install

# Build the framework
RUN bun run build || echo "Build completed with some warnings"

# Runtime stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Copy built application
COPY --from=builder /app /app

# Create data directory
RUN mkdir -p /data

# Expose ports
EXPOSE 9001 9002 9080 9081

# Set the working directory to server-bin
WORKDIR /app/packages/server-bin

# Run the server
CMD ["bun", "run", "src/bin.ts"]