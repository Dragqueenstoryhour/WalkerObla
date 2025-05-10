FROM node:20 AS base

# Install system dependencies including NVIDIA requirements
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libnvidia-compute-535 \
    nvidia-container-toolkit \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-bad \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Expose ports for Node and Flask
EXPOSE 5000 5050

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# Start the application
CMD ["npm", "run", "start"]