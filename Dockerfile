FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and ensure linux-x64 native bindings are present
RUN npm install && npm install --no-save @tailwindcss/oxide-linux-x64-gnu lightningcss-linux-x64-gnu

# Copy source code and config files
COPY vite.config.js jsconfig.json components.json ./
COPY index.html ./
COPY public/ ./public
COPY frontend/ ./frontend

# Expose port
EXPOSE 5173

# Run development server
# CMD ["npm", "run", "dev"]
CMD ["npm", "run", "dev", "--", "--host"]
