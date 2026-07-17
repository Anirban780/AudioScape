FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config files
COPY vite.config.js jsconfig.json components.json ./
COPY index.html ./
COPY public/ ./public
COPY frontend/ ./frontend
COPY utils/ ./utils

# Expose port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev"]
