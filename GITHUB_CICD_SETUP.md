# GitHub CI/CD Setup Guide

Complete guide to set up automated deployment from GitHub to Azure VM.

## 📋 Overview

This setup will:
- ✅ Automatically test your code on every push/PR
- ✅ Deploy to Azure VM when you push to `main` branch
- ✅ Run health checks and rollback if deployment fails
- ✅ Keep backups of previous deployments
- ✅ Send deployment notifications

## 🚀 Quick Start

### Prerequisites
- GitHub account
- Azure VM already created and running
- SSH access to Azure VM
- Git installed locally

---

## Step 1: Create GitHub Repository

### Option A: Using GitHub Website

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `mgnrega-dashboard-haryana`
   - **Description**: `MGNREGA Dashboard for Haryana - Track rural employment program performance`
   - **Visibility**: Public or Private (your choice)
   - **Do NOT** initialize with README (we already have one)

3. Click **"Create repository"**

### Option B: Using GitHub CLI

```bash
# Install GitHub CLI (if not installed)
brew install gh  # macOS
# or visit: https://cli.github.com/

# Login to GitHub
gh auth login

# Create repository
gh repo create mgnrega-dashboard-haryana \
  --public \
  --description "MGNREGA Dashboard for Haryana" \
  --source=. \
  --remote=origin
```

---

## Step 2: Push Code to GitHub

```bash
cd /Users/YourMachine/Documents/gov.intern

# Initialize git (if not already)
git init

# Add all files
git add .

# Create .gitignore if not exists
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
package-lock.json

# Production
.next/
out/
dist/
build/

# Environment files
.env
.env*.local
.env.production

# Database
postgres_data/
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Docker
.dockerignore

# Misc
.turbo
.eslintcache
EOF

# Commit
git commit -m "Initial commit: MGNREGA Dashboard Haryana

Features:
- Next.js 16 with TypeScript
- PostgreSQL with Prisma ORM
- Bilingual UI (Hindi + English)
- 22 Haryana districts with performance tracking
- Docker containerization
- Azure deployment ready
- CI/CD with GitHub Actions"

# Add remote (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/mgnrega-dashboard-haryana.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Configure GitHub Secrets

GitHub Secrets store sensitive information securely. Go to your repository on GitHub:

**Repository → Settings → Secrets and variables → Actions → "New repository secret"**

### Required Secrets

#### 1. `AZURE_VM_IP`
- **Value**: Your Azure VM's public IP address
- **Example**: `20.235.123.45`
- **How to get**:
  ```bash
  # Azure Portal: Go to VM → Overview → Public IP address
  # OR Azure CLI:
  az vm show -d -g mgnrega-rg -n mgnrega-vm --query publicIps -o tsv
  ```

#### 2. `AZURE_SSH_USER`
- **Value**: SSH username for your Azure VM
- **Default**: `azureuser`

#### 3. `AZURE_SSH_PRIVATE_KEY`
- **Value**: Your SSH private key (entire content)
- **How to get**:
  ```bash
  # If you used Azure CLI to create VM:
  cat ~/.ssh/id_rsa
  
  # If you downloaded .pem file from Azure:
  cat ~/Downloads/mgnrega-key.pem
  
  # Copy the ENTIRE output including:
  # -----BEGIN OPENSSH PRIVATE KEY-----
  # ... (all the key content)
  # -----END OPENSSH PRIVATE KEY-----
  ```

#### 4. `DATABASE_URL`
- **Value**: PostgreSQL connection string
- **Format**: `postgresql://mgnrega:mgnrega_secure_password@postgres:5432/mgnrega_dashboard?schema=public`
- **Note**: Use Docker internal hostname `postgres` (not `localhost`)

#### 5. `DATA_GOV_API_KEY`
- **Value**: `579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b`
- **This is your data.gov.in API key**

#### 6. `NEXT_PUBLIC_APP_URL`
- **Value**: Your application's public URL
- **Examples**: 
  - Without domain: `http://20.235.123.45`
  - With domain: `https://mgnrega.yourdomain.com`

### Summary of Secrets

| Secret Name | Example Value |
|-------------|---------------|
| `AZURE_VM_IP` | `20.235.123.45` |
| `AZURE_SSH_USER` | `azureuser` |
| `AZURE_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `DATABASE_URL` | `postgresql://mgnrega:mgnrega_secure_password@postgres:5432/mgnrega_dashboard?schema=public` |
| `DATA_GOV_API_KEY` | `579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b` |
| `NEXT_PUBLIC_APP_URL` | `http://20.235.123.45` |

---

## Step 4: Prepare Azure VM for CI/CD

SSH into your Azure VM and set up the SSH key for GitHub Actions:

```bash
# SSH to your VM
ssh azureuser@<YOUR_VM_IP>

# Ensure .ssh directory exists
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key to authorized_keys (if not already)
# This should already be done during VM creation
cat ~/.ssh/authorized_keys

# Ensure Docker is installed and running
docker --version
docker-compose --version

# If not installed, run:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install docker-compose -y

# Logout and login again
exit
ssh azureuser@<YOUR_VM_IP>

# Verify Docker works without sudo
docker ps
```

---

## Step 5: Test the CI/CD Pipeline

### Trigger Deployment

Every push to `main` branch will trigger deployment automatically:

```bash
# Make a change
echo "# MGNREGA Dashboard - CI/CD Enabled" >> README.md

# Commit and push
git add .
git commit -m "Enable CI/CD deployment"
git push origin main
```

### Monitor Deployment

1. Go to your GitHub repository
2. Click **"Actions"** tab
3. You'll see the workflow running:
   - **Test** job: Linting, building, type-checking
   - **Deploy** job: Deploying to Azure VM
   - **Post-deploy** job: Health checks and data sync

### Check Deployment Status

The workflow will show:
- ✅ Green checkmark: Deployment successful
- ❌ Red X: Deployment failed (will auto-rollback)

### View Logs

Click on the workflow run to see detailed logs:
- Build output
- Docker image creation
- Deployment progress
- Health check results

---

## Step 6: Verify Deployment

After successful deployment, verify your application:

```bash
# SSH to VM
ssh azureuser@<YOUR_VM_IP>

# Check running containers
docker-compose ps

# Check logs
docker-compose logs -f app

# Test health endpoint
curl http://localhost:3000/api/health

# Exit SSH
exit
```

Access your application in browser:
```
http://<YOUR_VM_IP>
```

---

## 🔄 Development Workflow

### Feature Development

```bash
# Create feature branch
git checkout -b feature/add-new-metric

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "Add new performance metric"

# Push to GitHub
git push origin feature/add-new-metric

# Create Pull Request on GitHub
# This will run tests but NOT deploy
```

### Deploy to Production

```bash
# Merge to main (via PR or directly)
git checkout main
git merge feature/add-new-metric
git push origin main

# This automatically triggers deployment!
```

### Hotfix

```bash
# Create hotfix branch
git checkout -b hotfix/fix-urgent-bug

# Fix the bug
# ... edit files ...

# Commit and push
git add .
git commit -m "Fix urgent bug"
git push origin hotfix/fix-urgent-bug

# Merge to main immediately
git checkout main
git merge hotfix/fix-urgent-bug
git push origin main

# Deployment starts automatically
```

---

## 🎯 Advanced Configuration

### Manual Deployment

You can trigger deployment manually without pushing:

1. Go to **Actions** tab on GitHub
2. Select **"Deploy to Azure VM"** workflow
3. Click **"Run workflow"**
4. Choose branch (usually `main`)
5. Click **"Run workflow"** button

### Deploy to Staging

Create a staging environment:

```bash
# On Azure, create a staging VM
# Then add these secrets to GitHub:
# - AZURE_STAGING_VM_IP
# - AZURE_STAGING_SSH_KEY

# Create staging branch
git checkout -b staging
git push origin staging
```

Update `.github/workflows/deploy-azure.yml`:
```yaml
on:
  push:
    branches:
      - main        # Production
      - staging     # Staging environment
```

### Environment-Specific Deployments

Use branch-specific secrets:

- `main` branch → Production secrets
- `staging` branch → Staging secrets
- `develop` branch → Development (no auto-deploy)

### Slack/Discord Notifications

Add notification step to workflow:

```yaml
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "✅ Deployment successful to Azure VM\n🌐 URL: http://${{ secrets.AZURE_VM_IP }}"
      }
```

---

## 🔍 Troubleshooting

### Problem: SSH Connection Failed

**Error**: `Permission denied (publickey)`

**Solution**:
```bash
# Verify SSH key is correct
ssh -i ~/.ssh/your_key azureuser@<VM_IP> echo "Connection OK"

# On Azure VM, check authorized_keys
cat ~/.ssh/authorized_keys

# Ensure key permissions are correct
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Problem: Docker Permission Denied

**Error**: `permission denied while trying to connect to the Docker daemon socket`

**Solution**:
```bash
# On Azure VM
sudo usermod -aG docker azureuser
# Logout and login again
```

### Problem: Deployment Fails but Doesn't Rollback

**Solution**:
```bash
# SSH to VM and manually rollback
cd ~
ls -la | grep gov.intern.backup

# Find latest backup
cd gov.intern.backup.20251101_153000  # example

# Stop current
cd ~/gov.intern
docker-compose down

# Restore backup
cd ~
rm -rf gov.intern
mv gov.intern.backup.20251101_153000 gov.intern

# Start
cd ~/gov.intern
docker-compose up -d
```

### Problem: Health Check Fails

**Error**: Health check returns `failed`

**Solution**:
```bash
# SSH to VM
ssh azureuser@<VM_IP>

# Check app logs
docker-compose logs app

# Check if app is running
docker-compose ps

# Restart app
docker-compose restart app

# Test locally on VM
curl -v http://localhost:3000/api/health
```

### Problem: GitHub Actions Quota Exceeded

**Error**: `No more GitHub Actions minutes available`

**Solution**:
- Free GitHub accounts have 2,000 minutes/month
- Reduce build frequency:
  - Only deploy on `main` branch
  - Skip tests on draft PRs
- Upgrade to GitHub Pro ($4/month for 3,000 minutes)

---

## 📊 Monitoring Deployments

### View Deployment History

```bash
# On Azure VM
cd ~/gov.intern

# View deployment backups
ls -lh ~/gov.intern.backup.*

# Check when each was created
ls -lt ~/gov.intern.backup.* | head -5
```

### Check Application Logs

```bash
# SSH to VM
ssh azureuser@<VM_IP>

# View real-time logs
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100 app

# Search for errors
docker-compose logs app | grep -i error
```

### Monitor System Resources

```bash
# SSH to VM
ssh azureuser@<VM_IP>

# Check disk space
df -h

# Check memory
free -h

# Check Docker stats
docker stats

# Check VM size
az vm show -g mgnrega-rg -n mgnrega-vm --query hardwareProfile
```

---

## 🎓 Best Practices

### 1. Branch Protection

Enable branch protection for `main`:
- Go to **Settings → Branches → Add rule**
- Branch name pattern: `main`
- Enable:
  - ☑️ Require pull request reviews before merging
  - ☑️ Require status checks to pass before merging
  - ☑️ Require conversation resolution before merging

### 2. Semantic Versioning

Tag your releases:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 3. Keep Secrets Updated

When rotating credentials:
1. Update secrets in GitHub
2. Manually deploy once to ensure it works
3. Old deployments will still work until next auto-deploy

### 4. Database Migrations

For database schema changes:
```bash
# Create migration locally
npx prisma migrate dev --name add_new_field

# Commit migration files
git add prisma/migrations
git commit -m "Add new field to schema"

# Push - deployment will run migrations automatically
git push origin main
```

### 5. Zero-Downtime Deployments

The workflow already handles this with:
- Health checks before switching traffic
- Automatic rollback on failure
- Keeping previous version as backup

---

## 📞 Support

### GitHub Actions Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

### Azure Documentation
- [Azure VM SSH](https://docs.microsoft.com/azure/virtual-machines/linux/ssh-from-windows)
- [Azure CLI](https://docs.microsoft.com/cli/azure/)

### Useful Commands

```bash
# View GitHub Actions locally
gh run list
gh run view <run-id>
gh run watch

# SSH to Azure VM
ssh azureuser@<VM_IP>

# Check deployment status
docker-compose ps
docker-compose logs -f

# Manual rollback
cd ~/gov.intern.backup.<timestamp>
```

---

## ✅ Success Checklist

After setup, verify:

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] All 6 GitHub Secrets configured
- [ ] SSH access to Azure VM works
- [ ] Docker installed on Azure VM
- [ ] First deployment workflow ran successfully
- [ ] Application accessible at `http://<VM_IP>`
- [ ] Health check returns `{"status":"healthy"}`
- [ ] All 22 districts visible on homepage
- [ ] Automatic deployment works on new push

---

**🎉 CI/CD Setup Complete!**

Now every push to `main` will automatically deploy to your Azure VM with:
- ✅ Automated testing
- ✅ Health checks
- ✅ Automatic rollback on failure
- ✅ Deployment backups
- ✅ Zero-downtime updates

Just code, commit, and push - GitHub Actions handles the rest! 🚀

