FROM node:16

# Install Python, pip, and LibreOffice (for PDF ⇨ Word)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libreoffice \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./ 
COPY package-lock.json ./

# Install root-level (frontend or shared) packages
RUN npm install

# Copy backend separately and install backend deps
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --upgrade pip
RUN pip3 install pdf2docx==0.5.6 --no-build-isolation
# Copy everything else (backend, frontend, scripts, uploads)
COPY . .

# Create uploads folder if not exists
RUN mkdir -p backend/uploads

# Expose the port
EXPOSE 3000

# Start backend app
CMD ["node", "backend/app.js"]
