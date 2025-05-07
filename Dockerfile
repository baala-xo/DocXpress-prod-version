FROM node:16

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libreoffice \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY backend/package.json ./backend/
COPY backend/package-lock.json ./backend/

# Install Node.js dependencies
RUN cd backend && npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p backend/uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "backend/app.js"]