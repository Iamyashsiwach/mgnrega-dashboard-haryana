# MGNREGA Dashboard Haryana 🇮🇳

[![Deploy to Azure](https://github.com/YOUR_USERNAME/mgnrega-dashboard-haryana/workflows/Deploy%20to%20Azure%20VM/badge.svg)](https://github.com/YOUR_USERNAME/mgnrega-dashboard-haryana/actions)

A production-ready web application for visualizing MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act) performance data across Haryana districts. Built for low-literacy rural populations with bilingual support (Hindi + English).

## Features ✨

- 📊 **Real-time District Performance**: Track employment, wages, and works completed
- 🗺️ **Auto Location Detection**: Automatically identify user's district using geolocation
- 🌐 **Bilingual Interface**: Full support for Hindi and English
- 📱 **Mobile-First Design**: Optimized for rural India's mobile-first internet users
- 📈 **Historical Trends**: Visualize 12-month performance trends
- 🏆 **District Comparisons**: Compare with state averages and rankings
- 💾 **Robust Data Caching**: Resilient to API downtime with local database caching
- 🔄 **Automatic Data Sync**: Daily scheduled updates from data.gov.in API
- 🚀 **Production Ready**: Docker containerized, Nginx reverse proxy, SSL ready
- 🔄 **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions

## Tech Stack 🛠️

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16
- **Charts**: Recharts
- **Maps**: Leaflet.js
- **Deployment**: Docker, Docker Compose, Nginx
- **CI/CD**: GitHub Actions
- **Cloud**: Azure VM (recommended)

## Prerequisites 📋

- Node.js 20+ and npm
- PostgreSQL 16+
- Docker & Docker Compose (for containerized deployment)
- Azure VM (for production deployment)

## Quick Start - Local Development 🚀

### 1. Clone and Install

```bash
git clone <repository-url>
cd gov.intern
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb mgnrega_dashboard
```

### 3. Environment Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/mgnrega_dashboard?schema=public"
DATA_GOV_API_KEY="your_api_key_here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SYNC_ENABLED="true"
```

### 4. Database Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Seed Districts Data

```bash
npx ts-node scripts/seed-districts.ts
```

### 6. Sync Initial Data (Mock Mode for Testing)

```bash
# Start the dev server first
npm run dev

# In another terminal, trigger initial sync
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"historical","monthsBack":12,"useMockData":true}'
```

### 7. Access the Application

Open http://localhost:3000 in your browser.

## Production Deployment 🌐

### Deployment Options

#### Option 1: GitHub CI/CD (RECOMMENDED) 🚀

Fully automated deployment using GitHub Actions. Every push to `main` automatically deploys to Azure!

**📖 See detailed guide:** [GITHUB_CICD_SETUP.md](./GITHUB_CICD_SETUP.md)

**Quick steps:**
1. Create GitHub repository and push code
2. Configure GitHub Secrets (VM IP, SSH key, etc.)
3. Create Azure VM
4. Push to `main` branch → Automatic deployment! 🎉

**Benefits:**
- ✅ Automated testing before deployment
- ✅ Zero-downtime deployments
- ✅ Automatic rollback on failure
- ✅ Deployment history and audit trail
- ✅ No manual SSH required

#### Option 2: Manual Deployment

##### Step 1: Provision Azure Resources

1. **Create Azure VM**:
   - Size: Standard B2s or better (2 vCPU, 4GB RAM minimum)
   - OS: Ubuntu 22.04 LTS
   - Open ports: 80 (HTTP), 443 (HTTPS), 22 (SSH)

2. **SSH into VM**:
   ```bash
   ssh azureuser@<your-vm-ip>
   ```

### Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Git
sudo apt install git -y

# Logout and login again to apply docker group
exit
```

### Step 3: Clone and Configure

```bash
# SSH back in
ssh azureuser@<your-vm-ip>

# Clone repository
git clone <repository-url>
cd gov.intern

# Create production .env
nano .env.production
```

Add production environment variables:

```env
DATABASE_URL="postgresql://mgnrega:secure_password_here@postgres:5432/mgnrega_dashboard?schema=public"
DATA_GOV_API_KEY="your_api_key_here"
NEXT_PUBLIC_APP_URL="http://<your-vm-ip-or-domain>"
NODE_ENV="production"
SYNC_ENABLED="true"
SYNC_CRON_SCHEDULE="0 2 * * *"
```

### Step 4: Build and Deploy

**Option A: Using automated script (easiest)**

```bash
# Run the deployment script
chmod +x deploy.sh
./deploy.sh
```

**Option B: Manual steps**

```bash
# Build Docker containers
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Run database migrations
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma generate

# Seed districts
docker-compose exec app npx tsx scripts/seed-districts.ts

# Sync initial data
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"historical","monthsBack":12,"useMockData":true}'
```

### Step 5: Configure SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 6: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 7: Access Your Application

Visit `http://<your-vm-ip>` or `https://yourdomain.com`

## 📚 Documentation

- **[GITHUB_CICD_SETUP.md](./GITHUB_CICD_SETUP.md)** - Complete CI/CD setup guide
- **[AZURE_DEPLOYMENT_STEPS.md](./AZURE_DEPLOYMENT_STEPS.md)** - Detailed Azure deployment
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - Quick reference guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full technical documentation
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Project overview

## 🔄 Development Workflow

### Local Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run dev

# Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create Pull Request on GitHub
```

### Deploy to Production

```bash
# Merge to main (via PR or directly)
git checkout main
git merge feature/new-feature
git push origin main

# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds application
# 3. Deploys to Azure VM
# 4. Runs health checks
# 5. Rolls back if anything fails
```

## Database Management 💾

### Run Migrations

```bash
npx prisma migrate dev --name migration_name
```

### View Database

```bash
npx prisma studio
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U mgnrega mgnrega_dashboard > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U mgnrega mgnrega_dashboard
```

## API Endpoints 🔌

- `GET /api/districts` - List all Haryana districts
- `GET /api/district/[code]` - Get district performance data
- `GET /api/district/[code]/compare` - Compare district with state
- `POST /api/location` - Reverse geocode coordinates to district
- `GET /api/health` - Health check endpoint
- `POST /api/sync` - Manually trigger data sync (admin only)

## Data Sync 🔄

The application automatically syncs data from data.gov.in API:

- **Scheduled**: Daily at 2 AM (configurable via `SYNC_CRON_SCHEDULE`)
- **Manual**: POST to `/api/sync` endpoint
- **Mock Mode**: For development/testing without API access

```bash
# Sync current month (production)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"current","useMockData":false}'

# Sync historical data (mock mode for testing)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"historical","monthsBack":12,"useMockData":true}'
```

## Monitoring 📊

### Application Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Database Connection

```bash
docker-compose exec postgres psql -U mgnrega mgnrega_dashboard
```

## Performance Optimization ⚡

- **Caching**: Database results cached, graceful degradation on API failure
- **Image Optimization**: Next.js automatic image optimization (AVIF, WebP)
- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Charts and heavy components loaded on demand
- **Compression**: Nginx gzip compression enabled
- **CDN Ready**: Static assets can be served via CDN

## Security 🔒

- **HTTPS**: SSL/TLS encryption with Let's Encrypt
- **Rate Limiting**: API endpoint protection (10 req/s per IP)
- **Security Headers**: X-Frame-Options, CSP, etc.
- **Input Validation**: All user inputs validated and sanitized
- **Non-root User**: Docker containers run as non-root
- **Environment Isolation**: Secrets in environment variables

## Troubleshooting 🔧

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Application Not Starting

```bash
# Check logs
docker-compose logs app

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### API Sync Failures

Check sync logs in database:

```sql
SELECT * FROM api_sync_logs ORDER BY sync_date DESC LIMIT 10;
```

## Contributing 🤝

This is a government internship project. For issues or improvements, please contact the development team.

## License 📄

This project is developed for the Government of India's MGNREGA program.

## Data Source 📚

Data sourced from [data.gov.in](https://data.gov.in/) - Open Government Data (OGD) Platform India.

## Support 💬

For technical support or queries:
- Check the logs: `docker-compose logs -f`
- Review API health: `curl http://localhost:3000/api/health`
- Database status: `docker-compose exec postgres pg_isready`

---

**Built with ❤️ for Rural India**
