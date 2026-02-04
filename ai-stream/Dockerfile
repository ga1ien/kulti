FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript (the production server)
RUN npx tsc state-server-prod.ts --outDir dist --esModuleInterop --module commonjs --target ES2020 --skipLibCheck --resolveJsonModule

# Expose port
EXPOSE 8080

# Run the server
CMD ["node", "dist/state-server-prod.js"]
