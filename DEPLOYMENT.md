# Deployment Guide - MGNREGA Dashboard Haryana

This guide provides detailed instructions for deploying the MGNREGA Dashboard to Azure VM.

## Prerequisites ✅

Before starting, ensure you have:

1. **Azure Account** with active subscription
2. **SSH Key** for secure VM access
3. **Domain Name** (optional, but recommended for SSL)
4. **data.gov.in API Key** (if using real data)

## Architecture Overview 🏗️

```
Internet → Nginx (Port 80/443) → Next.js App (Port 3000) → PostgreSQL (Port 5432)
                ↓
        SSL/TLS (Let's Encrypt)
                ↓
        Rate Limiting & Caching
```

## Step-by-Step Deployment 🚀

### 1. Create Azure VM

#### Option A: Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Virtual Machine**:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Standard B2s (2 vCPU, 4 GB RAM) - minimum
   - **Authentication**: SSH public key
   - **Inbound ports**: 22 (SSH), 80 (HTTP), 443 (HTTPS)

#### Option B: Using Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name mgnrega-rg --location centralindia

# Create VM
az vm create \
  --resource-group mgnrega-rg \
  --name mgnrega-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# Open ports
az vm open-port --port 80 --resource-group mgnrega-rg --name mgnrega-vm --priority 1001
az vm open-port --port 443 --resource-group mgnrega-rg --name mgnrega-vm --priority 1002

# Get public IP
az vm show --resource-group mgnrega-rg --name mgnrega-vm --show-details --query publicIps -o tsv
```

### 2. Initial Server Setup

SSH into your VM:

```bash
ssh azureuser@<your-vm-public-ip>
```

Update system packages:

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version

# Logout and login again for group changes to take effect
exit
```

SSH back in:

```bash
ssh azureuser@<your-vm-public-ip>
```

### 4. Clone Repository

```bash
# Install git if not already installed
sudo apt install git -y

# Clone the repository
git clone https://github.com/yourusername/gov.intern.git
cd gov.intern
```

### 5. Configure Environment

Create production environment file:

```bash
nano .env
```

Add the following configuration (update values accordingly):

```env
# Database Configuration
DATABASE_URL="postgresql://mgnrega:YOUR_SECURE_PASSWORD_HERE@postgres:5432/mgnrega_dashboard?schema=public"

# Application Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://<your-vm-ip-or-domain>"

# Data.gov.in API (optional - use mock data if not available)
DATA_GOV_API_KEY="your_api_key_here"
DATA_GOV_API_BASE_URL="https://api.data.gov.in"

# Sync Configuration
SYNC_ENABLED="true"
SYNC_CRON_SCHEDULE="0 2 * * *"

# Security
API_RATE_LIMIT_PER_MINUTE="100"
```

Save and exit (Ctrl+X, then Y, then Enter).

### 6. Deploy Application

Use the automated deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Build Docker images
- Start PostgreSQL and Next.js containers
- Run database migrations
- Seed initial district data
- Perform health checks

### 7. Verify Deployment

Check if services are running:

```bash
docker-compose ps
```

Expected output:
```
Name                 Command               State           Ports
-------------------------------------------------------------------------
mgnrega-app      node server.js                Up      0.0.0.0:3000->3000/tcp
mgnrega-nginx    nginx -g daemon off;          Up      0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
mgnrega-postgres docker-entrypoint.sh postgres Up      0.0.0.0:5432->5432/tcp
```

Check application logs:

```bash
docker-compose logs -f app
```

Test the application:

```bash
curl http://localhost:3000/api/health
```

### 8. Initial Data Sync

Sync historical MGNREGA data:

```bash
# Using mock data for testing (recommended first time)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"historical","monthsBack":12,"useMockData":true}'

# Using real API (requires valid API key)
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"historical","monthsBack":12,"useMockData":false}'
```

### 9. Configure Domain (Optional but Recommended)

If you have a domain:

#### A. Point Domain to VM

Add an A record in your domain DNS settings:
```
Type: A
Name: @ (or subdomain like mgnrega)
Value: <your-vm-public-ip>
TTL: 3600
```

#### B. Update Environment

Update `NEXT_PUBLIC_APP_URL` in `.env`:

```bash
nano .env
# Change: NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Restart containers:

```bash
docker-compose restart
```

### 10. Setup SSL with Let's Encrypt

Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Create SSL directory:

```bash
mkdir -p ssl
```

Stop Nginx container temporarily:

```bash
docker-compose stop nginx
```

Obtain SSL certificate:

```bash
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos
```

Copy certificates to project:

```bash
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*.pem
```

Start Nginx:

```bash
docker-compose up -d nginx
```

Setup auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line:
```
0 0 1 * * certbot renew --nginx --quiet && cd /home/azureuser/gov.intern && cp /etc/letsencrypt/live/yourdomain.com/*.pem ssl/ && docker-compose restart nginx
```

### 11. Configure Firewall

Setup UFW firewall:

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

### 12. Setup Monitoring (Optional)

Create a simple monitoring script:

```bash
nano monitor.sh
```

Add:

```bash
#!/bin/bash
# Send alert if application is down
if ! curl -s http://localhost:3000/api/health | grep -q "healthy"; then
    echo "Application is down!" | mail -s "MGNREGA Dashboard Alert" your-email@example.com
fi
```

Make it executable and add to crontab:

```bash
chmod +x monitor.sh
crontab -e
```

Add:
```
*/5 * * * * /home/azureuser/gov.intern/monitor.sh
```

## Post-Deployment Tasks ✅

### 1. Test All Features

- ✅ Home page loads correctly
- ✅ District selection works
- ✅ Geolocation feature works
- ✅ District dashboard displays data
- ✅ Charts render properly
- ✅ Comparison page works
- ✅ Language toggle (Hindi/English) works
- ✅ Mobile responsive design

### 2. Performance Testing

Test with multiple concurrent users:

```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Run load test
ab -n 1000 -c 10 http://yourdomain.com/
```

### 3. Database Backup

Setup automated backups:

```bash
# Create backup script
nano backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/azureuser/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U mgnrega mgnrega_dashboard > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Make executable and schedule:

```bash
chmod +x backup.sh
crontab -e
```

Add:
```
0 3 * * * /home/azureuser/gov.intern/backup.sh
```

## Maintenance Tasks 🔧

### Update Application

```bash
cd /home/azureuser/gov.intern
git pull origin main
./deploy.sh
```

### View Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# Nginx logs
docker-compose logs -f nginx

# All logs
docker-compose logs -f
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart postgres
docker-compose restart nginx
```

### Database Access

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U mgnrega mgnrega_dashboard

# Run queries
docker-compose exec postgres psql -U mgnrega mgnrega_dashboard -c "SELECT COUNT(*) FROM districts;"
```

## Troubleshooting 🔍

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# 1. Database not ready - wait a few seconds
# 2. Port already in use - check with: sudo netstat -tulpn | grep :3000
# 3. Environment variables missing - check .env file
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec postgres pg_isready -U mgnrega

# Check database exists
docker-compose exec postgres psql -U mgnrega -l

# Recreate database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Nginx Issues

```bash
# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload

# Check nginx logs
docker-compose logs nginx
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

## Security Best Practices 🔒

1. **Regular Updates**: Keep system and packages updated
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Strong Passwords**: Use strong database passwords

3. **Firewall**: Keep UFW enabled with minimal ports open

4. **SSH Keys**: Use SSH keys instead of passwords

5. **Rate Limiting**: Nginx is configured with rate limiting

6. **Regular Backups**: Automated daily database backups

7. **Monitor Logs**: Regularly check logs for suspicious activity

8. **Update Dependencies**: Regularly update npm packages
   ```bash
   npm audit
   npm update
   ```

## Cost Optimization 💰

### Azure VM Costs

- **Standard B2s**: ~₹2,500/month (~$30/month)
- **Standard B1s**: ~₹1,200/month (~$15/month) - minimum for production

### Cost-Saving Tips

1. **Auto-shutdown**: Configure VM to shutdown during low-traffic hours
2. **Reserved Instances**: 1-year commitment saves ~40%
3. **Spot Instances**: Save up to 90% (with interruption risk)
4. **Right-size**: Monitor usage and downgrade if possible

## Support & Contact 📞

For technical support:
- Check documentation: README.md
- Review logs: `docker-compose logs -f`
- Health check: `curl http://localhost:3000/api/health`

---

**Deployment Checklist:**

- [ ] Azure VM created and accessible
- [ ] Docker & Docker Compose installed
- [ ] Application cloned and configured
- [ ] Database initialized and seeded
- [ ] Initial data synced
- [ ] Domain configured (if applicable)
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backups automated
- [ ] Load testing performed
- [ ] All features tested

**🎉 Congratulations! Your MGNREGA Dashboard is now live!**

