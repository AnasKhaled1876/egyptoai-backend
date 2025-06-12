# Use official Node.js 20 image
FROM node:20

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies using npm
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Start the app
CMD ["npm", "run", "start"]