# Use Node.js 20 base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy only package files first (for better Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Then copy the rest of the project
COPY . .

# Generate Prisma client AFTER install
RUN npx prisma generate

# Build the project
RUN npm run build

# Run the app
CMD ["npm", "run", "start"]