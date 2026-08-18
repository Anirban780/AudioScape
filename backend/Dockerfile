# Stage 1: Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install system libraries required for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install system libraries required for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy application from build stage
COPY --from=build /app ./

# Expose backend port
EXPOSE 5000

# Run in development mode
CMD ["npm", "run", "dev"]

