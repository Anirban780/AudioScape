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

# Generate Prisma Client & Build TypeScript into dist/
ENV DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public"
RUN npm run build

# Stage 2: Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install system libraries required for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy application from build stage
COPY --from=build /app ./

# Expose backend port
EXPOSE 5000

# Run compiled JavaScript server in production
CMD ["npm", "run", "start"]
