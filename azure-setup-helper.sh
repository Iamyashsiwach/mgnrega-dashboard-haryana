#!/bin/bash

# Azure Setup Helper Script
# Interactive guide for setting up Azure VM for MGNREGA Dashboard

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

clear
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║         Azure VM Setup Helper - MGNREGA Dashboard                ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Azure CLI is installed
if command -v az &> /dev/null; then
    print_success "Azure CLI is installed"
    HAS_AZURE_CLI=true
else
    print_info "Azure CLI not installed (optional)"
    HAS_AZURE_CLI=false
fi

echo ""
print_step "STEP 1: Azure VM Creation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose your method:"
echo "  1. Azure Portal (Recommended for beginners)"
echo "  2. Azure CLI (For developers)"
echo ""
read -p "Enter choice (1 or 2): " VM_CHOICE

if [ "$VM_CHOICE" == "2" ] && [ "$HAS_AZURE_CLI" == true ]; then
    echo ""
    print_info "Creating Azure VM via CLI..."
    echo ""
    
    # Login check
    if ! az account show &> /dev/null; then
        print_info "Please login to Azure..."
        az login
    fi
    
    print_success "Authenticated with Azure"
    
    # Create resource group
    print_info "Creating resource group..."
    az group create --name mgnrega-rg --location centralindia --output table
    print_success "Resource group created"
    
    # Create VM
    print_info "Creating VM (this takes 2-3 minutes)..."
    VM_OUTPUT=$(az vm create \
      --resource-group mgnrega-rg \
      --name mgnrega-vm \
      --image Ubuntu2204 \
      --size Standard_B2s \
      --admin-username azureuser \
      --generate-ssh-keys \
      --public-ip-sku Standard \
      --output json)
    
    VM_IP=$(echo $VM_OUTPUT | jq -r '.publicIpAddress')
    print_success "VM created!"
    
    # Open ports
    print_info "Opening ports 80 and 443..."
    az vm open-port --port 80 --resource-group mgnrega-rg --name mgnrega-vm --priority 1001 --output none
    az vm open-port --port 443 --resource-group mgnrega-rg --name mgnrega-vm --priority 1002 --output none
    print_success "Ports opened"
    
    echo ""
    print_success "VM Public IP: $VM_IP"
    echo ""
    
else
    # Portal instructions
    echo ""
    print_info "Follow these steps in Azure Portal:"
    echo ""
    echo "1. Go to: https://portal.azure.com"
    echo "2. Click 'Create a resource' → 'Virtual Machine'"
    echo "3. Configure:"
    echo "   - Resource group: mgnrega-rg (create new)"
    echo "   - VM name: mgnrega-vm"
    echo "   - Region: Central India"
    echo "   - Image: Ubuntu Server 22.04 LTS"
    echo "   - Size: Standard_B2s (2 vCPU, 4GB RAM)"
    echo "   - Username: azureuser"
    echo "   - SSH public key: Use existing or generate new"
    echo "   - Inbound ports: HTTP (80), HTTPS (443), SSH (22)"
    echo "4. Click 'Review + create' → 'Create'"
    echo ""
    read -p "Press Enter when VM is created..."
    echo ""
    print_info "Enter your VM's public IP address"
    read -p "VM IP: " VM_IP
fi

# Save VM IP to file
echo "$VM_IP" > .azure-vm-ip
print_success "VM IP saved to .azure-vm-ip"

echo ""
print_step "STEP 2: Test SSH Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Testing SSH connection to $VM_IP..."
echo ""

# Test SSH
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 azureuser@$VM_IP "echo 'SSH works'" &> /dev/null; then
    print_success "SSH connection successful!"
else
    print_error "SSH connection failed"
    print_info "This might be normal - VM might still be starting"
    print_info "Try manually: ssh azureuser@$VM_IP"
    read -p "Press Enter when you can SSH successfully..."
fi

echo ""
print_step "STEP 3: Install Docker on VM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Installing Docker on Azure VM..."
echo ""

ssh azureuser@$VM_IP << 'ENDSSH'
set -e
echo "Updating system packages..."
sudo apt update -qq
sudo apt upgrade -y -qq

echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh > /dev/null 2>&1
sudo usermod -aG docker $USER

echo "Installing Docker Compose..."
sudo apt install -y docker-compose -qq

echo "Installing Git..."
sudo apt install -y git -qq

echo "Creating deployment directory..."
mkdir -p ~/gov.intern

echo "✓ Installation complete!"
ENDSSH

print_success "Docker installed on VM"
echo ""
print_info "Note: You'll need to reconnect SSH for Docker group to take effect"

echo ""
print_step "STEP 4: Get SSH Private Key for GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ~/.ssh/id_rsa ]; then
    print_success "Found SSH private key at ~/.ssh/id_rsa"
    SSH_KEY_PATH="~/.ssh/id_rsa"
elif [ -f ~/.ssh/mgnrega-vm_key.pem ]; then
    print_success "Found SSH private key at ~/.ssh/mgnrega-vm_key.pem"
    SSH_KEY_PATH="~/.ssh/mgnrega-vm_key.pem"
else
    print_info "SSH key not found in default locations"
    read -p "Enter path to your SSH private key: " SSH_KEY_PATH
fi

echo ""
print_info "Your SSH private key is at: $SSH_KEY_PATH"
echo ""
print_info "Copy this key for GitHub Secrets (AZURE_SSH_PRIVATE_KEY)"
echo ""
echo "Run this command to copy to clipboard:"
echo "  cat $SSH_KEY_PATH | pbcopy"
echo ""
read -p "Press Enter when you've copied the key..."

echo ""
print_step "STEP 5: Configure GitHub Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Try to get GitHub repo URL
if [ -d .git ]; then
    REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//')
    if [[ $REPO_URL == git@github.com:* ]]; then
        REPO_URL="https://github.com/${REPO_URL#git@github.com:}"
    fi
    print_info "Your repository: $REPO_URL"
    SECRETS_URL="$REPO_URL/settings/secrets/actions"
else
    print_info "Go to your GitHub repository"
    SECRETS_URL="https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
fi

echo ""
echo "Go to: $SECRETS_URL"
echo ""
echo "Add these 6 secrets:"
echo ""
echo "1. AZURE_VM_IP"
echo "   Value: $VM_IP"
echo ""
echo "2. AZURE_SSH_USER"
echo "   Value: azureuser"
echo ""
echo "3. AZURE_SSH_PRIVATE_KEY"
echo "   Value: [The SSH key you copied - must include BEGIN/END lines]"
echo ""
echo "4. DATABASE_URL"
echo "   Value: postgresql://mgnrega:mgnrega_secure_password@postgres:5432/mgnrega_dashboard?schema=public"
echo ""
echo "5. DATA_GOV_API_KEY"
echo "   Value: 579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
echo ""
echo "6. NEXT_PUBLIC_APP_URL"
echo "   Value: http://$VM_IP"
echo ""
read -p "Press Enter when all 6 secrets are configured..."

echo ""
print_step "STEP 6: Trigger First Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Choose deployment method:"
echo "  1. Push a commit to trigger automatic deployment"
echo "  2. Manually trigger workflow on GitHub"
echo ""
read -p "Enter choice (1 or 2): " DEPLOY_CHOICE

if [ "$DEPLOY_CHOICE" == "1" ]; then
    echo ""
    print_info "Creating deployment trigger commit..."
    echo ""
    echo "# Deployment triggered at $(date)" >> README.md
    git add README.md
    git commit -m "Trigger initial Azure deployment"
    git push origin main
    print_success "Pushed to GitHub - deployment starting!"
else
    echo ""
    print_info "Go to: $REPO_URL/actions"
    echo "Click 'Deploy to Azure VM' → 'Run workflow' → 'Run workflow'"
fi

echo ""
print_success "Deployment initiated!"
echo ""
print_info "Monitor deployment at: $REPO_URL/actions"
echo ""
print_info "Deployment takes ~5-10 minutes"
echo ""
read -p "Press Enter when deployment shows as successful..."

echo ""
print_step "STEP 7: Verify Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Checking containers on VM..."
CONTAINERS=$(ssh azureuser@$VM_IP "cd ~/gov.intern && docker-compose ps" 2>/dev/null || echo "error")

if [[ $CONTAINERS == *"mgnrega-app"* ]]; then
    print_success "Containers are running!"
else
    print_error "Containers not found - check deployment logs"
fi

echo ""
print_info "Testing health endpoint..."
HEALTH=$(curl -s http://$VM_IP/api/health || echo "failed")

if [[ $HEALTH == *"healthy"* ]]; then
    print_success "Health check passed!"
else
    print_error "Health check failed"
    print_info "The app might still be starting - wait a minute and try:"
    echo "  curl http://$VM_IP/api/health"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "Setup Complete!"
echo ""
echo "🌐 Your application is live at: http://$VM_IP"
echo ""
echo "📊 Useful commands:"
echo "  - Monitor logs: ssh azureuser@$VM_IP 'cd ~/gov.intern && docker-compose logs -f'"
echo "  - Check status: ssh azureuser@$VM_IP 'cd ~/gov.intern && docker-compose ps'"
echo "  - Restart app: ssh azureuser@$VM_IP 'cd ~/gov.intern && docker-compose restart app'"
echo ""
echo "📖 Documentation:"
echo "  - Setup guide: AZURE_SETUP_CHECKLIST.md"
echo "  - CI/CD guide: GITHUB_CICD_SETUP.md"
echo ""
print_info "Every push to 'main' branch will now automatically deploy!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"



