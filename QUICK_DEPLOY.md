# Quick Deployment Guide 🚀

This is a streamlined guide to deploy the MGNREGA Dashboard to Azure VM.

## Prerequisites

1. **Azure VM** (Ubuntu 22.04 LTS, Standard B2s or better)
2. **Public IP** with ports 22, 80, 443 open
3. **SSH access** to the VM

## Step-by-Step Deployment

### 1. Create Azure VM

#### Option A: Azure Portal
1. Go to https://portal.azure.com
2. Create VM:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Standard B2s (2 vCPU, 4GB RAM)
   - **Authentication**: SSH public key
   - **Open ports**: 22, 80, 443

#### Option B: Azure CLI
```bash
az login
az group create --name mgnrega-rg --location centralindia
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

### 2. Connect to VM

```bash
ssh azureuser@<YOUR_VM_PUBLIC_IP>
```

### 3. Upload Project to VM

#### Option A: Using Git (Recommended)
```bash
# On your VM
cd ~
git clone https://github.com/yourusername/gov.intern.git
cd gov.intern
```

#### Option B: Using SCP
```bash
# On your local machine
cd /Users/YourMachine/Documents/gov.intern
tar -czf project.tar.gz --exclude=node_modules --exclude=.next --exclude=.git .
scp project.tar.gz azureuser@<YOUR_VM_PUBLIC_IP>:~/

# On your VM
ssh azureuser@<YOUR_VM_PUBLIC_IP>
mkdir -p ~/gov.intern
cd ~/gov.intern
tar -xzf ~/project.tar.gz
```

### 4. Run Deployment Script

The automated deployment script will:
- Install Docker & Docker Compose
- Build and start all containers
- Run database migrations
- Seed district data

```bash
cd ~/gov.intern
chmod +x deploy.sh
./deploy.sh
```

### 5. Verify Deployment

Check if services are running:
```bash
docker-compose ps
```

Test the application:
```bash
curl http://localhost:3000/api/health
```

You should see:
```json
{"status":"healthy","timestamp":"..."}
```

### 6. Access Your Application

Open your browser and visit:
```
http://<YOUR_VM_PUBLIC_IP>
```

## Post-Deployment Tasks

### 1. Sync Real Data

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"current","useMockData":false}'
```

### 2. Setup SSL (Optional but Recommended)

If you have a domain name:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop nginx container temporarily
docker-compose stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo mkdir -p ~/gov.intern/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/gov.intern/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/gov.intern/ssl/
sudo chown -R $USER:$USER ~/gov.intern/ssl

# Update nginx.conf to use your domain
cd ~/gov.intern
nano nginx.conf
# Change "server_name _;" to "server_name yourdomain.com;"

# Restart nginx
docker-compose up -d nginx
```

### 3. Setup Auto-Renewal for SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && docker-compose -f /home/azureuser/gov.intern/docker-compose.yml restart nginx
```

## Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart app
```

### Update Application
```bash
cd ~/gov.intern
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U mgnrega mgnrega_dashboard

# Backup database
docker-compose exec postgres pg_dump -U mgnrega mgnrega_dashboard > backup.sql

# Restore database
docker-compose exec -T postgres psql -U mgnrega mgnrega_dashboard < backup.sql
```

### Stop Everything
```bash
docker-compose down
```

### Stop and Remove All Data
```bash
docker-compose down -v
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs app

# Rebuild
docker-compose build --no-cache app
docker-compose up -d
```

### Database connection error
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Port already in use
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Website not accessible from outside
```bash
# Check if ports are open
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Check Azure NSG (Network Security Group) in Azure Portal
# Ensure inbound rules allow ports 80 and 443
```

## Monitoring

### Check Application Health
```bash
curl http://localhost:3000/api/health
```

### Check Disk Space
```bash
df -h
```

### Check Memory Usage
```bash
free -h
docker stats
```

### Check Logs for Errors
```bash
docker-compose logs --tail=100 app | grep -i error
```

## Security Recommendations

1. **Change default PostgreSQL password** in `docker-compose.yml`
2. **Setup firewall** (UFW):
   ```bash
   sudo ufw enable
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   ```
3. **Setup SSL certificate** (Let's Encrypt)
4. **Regular updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
5. **Monitor logs** for suspicious activity
6. **Setup automated backups** for the database

## Support

For issues, check:
- Application logs: `docker-compose logs app`
- Database logs: `docker-compose logs postgres`
- Nginx logs: `docker-compose logs nginx`
- Full documentation: `DEPLOYMENT.md`

---

**Your application should now be live!** 🎉

Visit: `http://<YOUR_VM_PUBLIC_IP>`

