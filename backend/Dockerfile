# Use Motia's base image (has Node + Python ready)
FROM motiadev/motia:latest

WORKDIR /app

# Copy root package files for monorepo context
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies for the backend workspace
RUN npm ci --workspace=backend --only=production

# Copy backend source code
COPY backend/ ./backend/

# Set working directory to backend
WORKDIR /app/backend

# If you have Python steps, Motia handles them, but you can ensure they are installed:
# RUN npx motia@latest install

# Expose the port
EXPOSE 3000

# Start the Motia service
CMD ["npm", "run", "start"]
