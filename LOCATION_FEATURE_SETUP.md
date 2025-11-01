# Location Feature Setup Guide

## 🔒 Why Location Detection Doesn't Work on HTTP

**The geolocation feature currently doesn't work because your site is on HTTP, not HTTPS.**

Modern browsers (Chrome, Firefox, Safari, Edge) **block the Geolocation API on non-secure (HTTP) connections** for privacy and security reasons.

**Geolocation only works on:**
1. ✅ **HTTPS** (secure connections with SSL certificate)
2. ✅ **localhost** (during development)
3. ❌ **NOT on HTTP** (like http://98.70.24.48)

---

## ✅ Current Workaround

The improved error message now tells users:
- **English**: "⚠️ Location feature requires HTTPS to work. Please select your district from the list below. 👇"
- **Hindi**: "⚠️ स्थान सुविधा HTTP पर काम नहीं करती। कृपया नीचे से अपना जिला चुनें। 👇"

**Users can simply click on their district from the list** - this works perfectly!

---

## 🔐 Solution: Add HTTPS (SSL Certificate)

To make location detection work, you need to add HTTPS to your site.

### Option 1: Quick HTTPS Setup with Let's Encrypt (Recommended)

**Step 1: Get a Domain Name** (if you don't have one)
- Register a free/cheap domain (e.g., from Namecheap, GoDaddy, or use a free service like Freenom)
- Point the domain's A record to your Azure VM IP: `98.70.24.48`
- Example: `mgnrega.yourdomain.com` → `98.70.24.48`

**Step 2: Install Certbot on Azure VM**

```bash
# SSH into your Azure VM
ssh -i ~/.ssh/mgnrega-vm_key.pem azureuser@98.70.24.48

# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
cd ~/gov.intern
docker-compose stop nginx

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
# Follow prompts, enter your email

# Certificates will be in: /etc/letsencrypt/live/yourdomain.com/
```

**Step 3: Update nginx.conf**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream nextjs {
        server app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
        limit_req_status 429;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000" always;

        # Proxy to Next.js
        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API rate limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Step 4: Update docker-compose.yml**

```yaml
nginx:
  image: nginx:alpine
  container_name: mgnrega-nginx
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Add SSL certificates
  ports:
    - "80:80"
    - "443:443"  # Add HTTPS port
  depends_on:
    - app
  networks:
    - mgnrega-network
  restart: unless-stopped
```

**Step 5: Restart Services**

```bash
cd ~/gov.intern
docker-compose up -d

# Test HTTPS
curl https://yourdomain.com
```

**Step 6: Set up Auto-Renewal**

```bash
# Add cron job for certificate renewal
sudo crontab -e

# Add this line (renew certificate every month)
0 0 1 * * certbot renew --quiet && docker-compose -f /home/azureuser/gov.intern/docker-compose.yml restart nginx
```

---

### Option 2: Use Cloudflare (Easiest, No Domain Purchase Required)

1. **Sign up for free Cloudflare account**
2. **Add your domain** (if you have one, or get a free subdomain)
3. **Point DNS to your IP**: `98.70.24.48`
4. **Enable "Flexible SSL"** in Cloudflare dashboard
5. **Done!** Cloudflare provides HTTPS automatically

---

### Option 3: Azure Application Gateway with SSL

Use Azure's built-in SSL termination (more expensive but enterprise-grade):
- Set up Azure Application Gateway
- Upload/generate SSL certificate
- Configure WAF rules
- Route traffic to your VM

---

## 🎯 Testing Location Feature

Once HTTPS is set up:

1. Visit `https://yourdomain.com`
2. Click "Auto-Detect Location" button
3. Browser will ask: "Allow location access?" → Click **Allow**
4. Site will detect your coordinates and find the nearest Haryana district
5. You'll be redirected to that district's dashboard

---

## 📱 For Testing on Mobile

If on mobile browser:
1. Make sure location services are enabled in phone settings
2. Give browser permission to access location
3. Works on both Android Chrome and iOS Safari (with HTTPS)

---

## 🚫 Current Behavior (HTTP)

Without HTTPS, users will see:
- ⚠️ Error message explaining HTTPS is required
- Clear instruction to select district manually
- All 22 districts displayed as clickable cards below
- ✅ **Manual selection works perfectly!**

---

## 💡 Recommendation

**For MVP/Demo**: Manual district selection is perfectly fine! Most users know their district.

**For Production**: Add HTTPS with Let's Encrypt (free) - takes ~30 minutes to set up.

---

## 📚 Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot User Guide](https://eff-certbot.readthedocs.io/)
- [Cloudflare SSL Setup](https://developers.cloudflare.com/ssl/)
- [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

## ✅ Summary

| Feature | HTTP (Current) | HTTPS (After SSL) |
|---------|----------------|-------------------|
| Manual District Selection | ✅ Works | ✅ Works |
| Auto Location Detection | ❌ Blocked by browser | ✅ Works |
| District Dashboards | ✅ Works | ✅ Works |
| Data from API | ✅ Works | ✅ Works |
| Bilingual UI | ✅ Works | ✅ Works |
| Mobile Responsive | ✅ Works | ✅ Works |

**Bottom Line**: Your app is fully functional! Location is just a nice-to-have feature. Users can easily select their district from the list. 🎉

