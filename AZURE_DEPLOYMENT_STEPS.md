# 🚀 Azure Deployment - Step by Step

Complete guide to deploy MGNREGA Dashboard to Azure VM.

## 📋 Prerequisites Checklist

- [ ] Azure account with active subscription
- [ ] Azure CLI installed (optional, or use Azure Portal)
- [ ] SSH key generated on your local machine
- [ ] Credit card for Azure billing (can use free tier)

## 🎯 Deployment Options

### Option 1: Quick Deploy (Recommended)
Use the automated deployment script for fastest setup.

### Option 2: Manual Deploy
Step-by-step manual deployment for full control.

---

## 🟢 Option 1: Quick Deploy with Script

### Step 1: Create Azure VM

#### Using Azure Portal (Easiest):

1. **Go to Azure Portal**: https://portal.azure.com
2. **Click "Create a resource"** → Search for "Virtual Machine"
3. **Configure VM**:
   - **Subscription**: Select your subscription
   - **Resource group**: Create new → `mgnrega-rg`
   - **Virtual machine name**: `mgnrega-vm`
   - **Region**: `(Asia Pacific) Central India` (closest to Haryana)
   - **Image**: `Ubuntu Server 22.04 LTS - x64 Gen2`
   - **Size**: `Standard_B2s` (2 vCPUs, 4 GB RAM) - $31/month
   - **Authentication type**: `SSH public key`
   - **Username**: `azureuser`
   - **SSH public key source**: 
     - If you have one: "Use existing key" → paste your public key
     - If not: "Generate new key pair" → download the .pem file
   - **Inbound port rules**: Select `HTTP (80)`, `HTTPS (443)`, `SSH (22)`

4. **Click "Review + create"** → **"Create"**

5. **Download the SSH key** if you generated a new one (save as `mgnrega-key.pem`)

6. **Wait 2-3 minutes** for deployment to complete

7. **Get your VM's Public IP**:
   - Go to the VM → Overview → Copy the "Public IP address"
   - Example: `20.235.xxx.xxx`

#### Using Azure CLI (For developers):

```bash
# 1. Login to Azure
az login

# 2. Create resource group
az group create --name mgnrega-rg --location centralindia

# 3. Create VM
az vm create \
  --resource-group mgnrega-rg \
  --name mgnrega-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# 4. Open HTTP and HTTPS ports
az vm open-port --port 80 --resource-group mgnrega-rg --name mgnrega-vm --priority 1001
az vm open-port --port 443 --resource-group mgnrega-rg --name mgnrega-vm --priority 1002

# 5. Get public IP
az vm show --resource-group mgnrega-rg --name mgnrega-vm --show-details --query publicIps -o tsv
```

### Step 2: Connect to Your VM

```bash
# If you downloaded a .pem file from Azure:
chmod 400 ~/Downloads/mgnrega-key.pem
ssh -i ~/Downloads/mgnrega-key.pem azureuser@<YOUR_VM_PUBLIC_IP>

# If you used your existing SSH key or Azure CLI generated keys:
ssh azureuser@<YOUR_VM_PUBLIC_IP>
```

Replace `<YOUR_VM_PUBLIC_IP>` with the actual IP from Step 1.

### Step 3: Upload Project to VM

**Option A: Using Git (Best for ongoing updates)**

```bash
# On your VM (after SSH)
cd ~
git clone https://github.com/yourusername/gov.intern.git
cd gov.intern
```

*Note: You'll need to push your code to GitHub first.*

**Option B: Using SCP (Direct upload)**

```bash
# On your LOCAL machine (new terminal, not SSH):
cd /Users/YourMachine/Documents/gov.intern

# Create archive
tar -czf project.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=postgres_data \
  .

# Upload to VM
scp project.tar.gz azureuser@<YOUR_VM_PUBLIC_IP>:~/

# Back to VM terminal (SSH):
mkdir -p ~/gov.intern
cd ~/gov.intern
tar -xzf ~/project.tar.gz
```

### Step 4: Run Automated Deployment

```bash
# On your VM
cd ~/gov.intern
chmod +x deploy.sh
./deploy.sh
```

This script will:
- ✅ Install Docker & Docker Compose
- ✅ Build application containers
- ✅ Start PostgreSQL database
- ✅ Run database migrations
- ✅ Seed Haryana districts data
- ✅ Start Next.js application
- ✅ Start Nginx reverse proxy
- ✅ Run health checks

⏱️ **Takes ~5-10 minutes depending on VM speed**

### Step 5: Verify Deployment

After the script finishes, you should see:

```
✓ Deployment completed successfully!

Application is running at:
  - Local: http://localhost:3000
  - Network: http://10.x.x.x:3000
```

Test it:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-11-01T..."}
```

### Step 6: Access from Internet

Open your browser and visit:
```
http://<YOUR_VM_PUBLIC_IP>
```

**🎉 Your MGNREGA Dashboard is now LIVE!**

---

## 🔵 Option 2: Manual Deployment

### Step 1: Create Azure VM
(Same as Option 1, Step 1)

### Step 2: Connect to VM
```bash
ssh azureuser@<YOUR_VM_PUBLIC_IP>
```

### Step 3: Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### Step 4: Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Logout and login to apply group changes
exit
```

SSH back in:
```bash
ssh azureuser@<YOUR_VM_PUBLIC_IP>
```

### Step 5: Upload Project
(Same as Option 1, Step 3)

### Step 6: Build and Start Services
```bash
cd ~/gov.intern

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Step 7: Initialize Database
```bash
# Wait for PostgreSQL to be ready
sleep 15

# Run migrations
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma generate

# Seed districts
docker-compose exec app npx tsx scripts/seed-districts.ts
```

### Step 8: Verify
```bash
# Check health
curl http://localhost:3000/api/health

# View logs
docker-compose logs -f
```

---

## 🔒 Post-Deployment: Setup SSL (Optional)

If you have a domain name (e.g., `mgnrega.yourdomain.com`):

### Step 1: Point Domain to VM
Add an **A Record** in your domain's DNS settings:
```
Type: A
Name: mgnrega (or @)
Value: <YOUR_VM_PUBLIC_IP>
TTL: 3600
```

### Step 2: Install Certbot
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Step 3: Stop Nginx Container
```bash
cd ~/gov.intern
docker-compose stop nginx
```

### Step 4: Get SSL Certificate
```bash
sudo certbot certonly --standalone -d mgnrega.yourdomain.com
```

Follow the prompts. Certbot will save certificates at:
```
/etc/letsencrypt/live/mgnrega.yourdomain.com/
```

### Step 5: Copy Certificates
```bash
sudo mkdir -p ~/gov.intern/ssl
sudo cp /etc/letsencrypt/live/mgnrega.yourdomain.com/fullchain.pem ~/gov.intern/ssl/
sudo cp /etc/letsencrypt/live/mgnrega.yourdomain.com/privkey.pem ~/gov.intern/ssl/
sudo chown -R azureuser:azureuser ~/gov.intern/ssl
```

### Step 6: Update Nginx Config
```bash
cd ~/gov.intern
nano nginx.conf
```

Find `server_name _;` and change to:
```nginx
server_name mgnrega.yourdomain.com;
```

Save and exit (Ctrl+X, Y, Enter)

### Step 7: Restart Nginx
```bash
docker-compose up -d nginx
```

### Step 8: Setup Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job
sudo crontab -e
# Add this line at the end:
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /home/azureuser/gov.intern/docker-compose.yml restart nginx"
```

**🔐 Now access your site with HTTPS:**
```
https://mgnrega.yourdomain.com
```

---

## 📊 Post-Deployment Tasks

### 1. Sync Real Data
```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"current","useMockData":false}'
```

### 2. Setup Firewall
```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 3. Monitor Application
```bash
# View logs
docker-compose logs -f app

# Check container stats
docker stats

# Check disk space
df -h

# Check memory
free -h
```

### 4. Setup Monitoring (Optional)

Add Azure Application Insights for production monitoring:
- Go to Azure Portal
- Create Application Insights resource
- Add instrumentation key to your app

---

## 🛠️ Troubleshooting

### Problem: Can't connect to VM
**Solution:**
```bash
# Check Azure NSG (Network Security Group)
az network nsg rule list \
  --resource-group mgnrega-rg \
  --nsg-name mgnrega-vmNSG \
  --output table

# Add rules if missing
az network nsg rule create \
  --resource-group mgnrega-rg \
  --nsg-name mgnrega-vmNSG \
  --name AllowHTTP \
  --priority 1001 \
  --destination-port-ranges 80 \
  --access Allow
```

### Problem: Docker permission denied
**Solution:**
```bash
sudo usermod -aG docker $USER
# Logout and login again
```

### Problem: Port 3000 already in use
**Solution:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Problem: Database connection failed
**Solution:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check if it's running
docker-compose exec postgres pg_isready -U mgnrega
```

### Problem: Website shows 502 Bad Gateway
**Solution:**
```bash
# Check if app is running
docker-compose ps

# Restart app
docker-compose restart app

# Check app logs
docker-compose logs app
```

---

## 📈 Performance Optimization

### 1. Increase VM Size (if needed)
If you have >1000 concurrent users, upgrade to:
- **Standard_B4ms**: 4 vCPUs, 16 GB RAM (~$122/month)
- **Standard_D4s_v3**: 4 vCPUs, 16 GB RAM (~$189/month)

### 2. Add Redis Cache
```yaml
# Add to docker-compose.yml
redis:
  image: redis:alpine
  container_name: mgnrega-redis
  ports:
    - "6379:6379"
  networks:
    - mgnrega-network
```

### 3. Setup Database Backups
```bash
# Create backup script
nano ~/backup-db.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U mgnrega mgnrega_dashboard > ~/backups/db_$DATE.sql
# Keep only last 7 days
find ~/backups -name "db_*.sql" -mtime +7 -delete
```

```bash
chmod +x ~/backup-db.sh
mkdir -p ~/backups

# Add to crontab (daily at 3 AM)
crontab -e
0 3 * * * /home/azureuser/backup-db.sh
```

---

## 💰 Cost Estimation

**Azure VM Monthly Costs** (Pay-as-you-go, Central India region):

| VM Size | vCPUs | RAM | Cost/Month | Recommended For |
|---------|-------|-----|------------|-----------------|
| B1s | 1 | 1 GB | ~$10 | Testing only |
| **B2s** | **2** | **4 GB** | **~$31** | **Production (up to 10K users)** |
| B2ms | 2 | 8 GB | ~$62 | Medium traffic |
| B4ms | 4 | 16 GB | ~$122 | High traffic |

**Additional Costs:**
- Storage: ~$1-5/month
- Bandwidth: Free for first 100 GB/month
- **Total for B2s VM: ~$35-40/month**

**💡 Save Money:**
- Use **Reserved Instances** (save up to 72%)
- Use **Azure Free Tier** (12 months free B1s)
- **Auto-shutdown** during off-hours

---

## ✅ Success Checklist

After deployment, verify:

- [ ] VM is running and accessible via SSH
- [ ] Docker and Docker Compose are installed
- [ ] All containers are running (`docker-compose ps`)
- [ ] Database is initialized with 22 Haryana districts
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Website accessible from browser at VM public IP
- [ ] Districts page shows all 22 districts
- [ ] Individual district pages load correctly
- [ ] Language toggle works (Hindi ↔ English)
- [ ] SSL certificate installed (if using domain)
- [ ] Firewall configured (UFW)
- [ ] Automated backups setup
- [ ] Monitoring/logging configured

---

## 🎓 Next Steps

1. **Setup Custom Domain** (Optional but recommended)
2. **Configure SSL/TLS** for HTTPS
3. **Setup Monitoring** (Azure Application Insights)
4. **Configure Automated Backups**
5. **Setup CI/CD Pipeline** (GitHub Actions → Azure)
6. **Add Caching Layer** (Redis) for better performance
7. **Setup Email Alerts** for system issues
8. **User Testing** with target audience

---

## 📞 Support & Resources

**Documentation:**
- Full deployment guide: `DEPLOYMENT.md`
- Quick reference: `QUICK_DEPLOY.md`
- Project overview: `PROJECT_SUMMARY.md`

**Azure Resources:**
- [Azure Portal](https://portal.azure.com)
- [Azure Documentation](https://docs.microsoft.com/azure/)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)

**Useful Commands:**
```bash
# View all logs
docker-compose logs -f

# Restart application
docker-compose restart app

# Update application
cd ~/gov.intern && git pull && docker-compose up -d --build

# Check system resources
docker stats
```

---

**🎉 Congratulations! Your MGNREGA Dashboard is now live on Azure!**

Access it at: `http://<YOUR_VM_PUBLIC_IP>`

For questions or issues, check the troubleshooting section or review the logs.

