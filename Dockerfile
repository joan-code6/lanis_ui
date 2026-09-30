# Schulportal Hessen UI — containerized version of setup.bat
# Using Debian-slim (not Alpine) because Puppeteer needs Chromium + its
# system libraries, which are painful to get working on Alpine's musl libc.
FROM node:22-slim

# Install Chromium and the system libraries Puppeteer's bundled Chromium needs to run headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
# (saves a lot of build time/space; the apt package above already provides it)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install dependencies first (better layer caching — only re-runs if package*.json changes)
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Mirror setup.bat: create .env from template if it doesn't exist yet
RUN if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi

COPY dockerentry.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Adjust this if your dev server / app runs on a different port
EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]

# Default command — change to `npm run build && npm start` for a production run
CMD ["npm", "run", "dev"]
