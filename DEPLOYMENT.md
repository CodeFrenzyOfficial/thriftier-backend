# 🚀 Backend Staging Deployment Setup

This guide will help you set up automated deployment to your staging server when code is pushed to the `staging` branch.

## 📋 Prerequisites

1. A staging server (VPS/Cloud instance) with:
   - Ubuntu/Debian Linux
   - Node.js 20.x installed
   - PostgreSQL installed
   - PM2 installed globally (`npm install -g pm2`)
   - SSH access enabled

2. GitHub repository with this code

## 🔧 Server Setup

### 1. Install Required Software on Staging Server

```bash
# SSH into your staging server
ssh your-user@your-staging-server.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL (if not already installed)
sudo apt install -y postgresql postgresql-contrib

# Create application directory
sudo mkdir -p /var/www/thrifter-backend-staging
sudo chown $USER:$USER /var/www/thrifter-backend-staging
```

### 2. Setup Database on Staging Server

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE thrifter_staging;
CREATE USER thrifter_staging WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE thrifter_staging TO thrifter_staging;
\q
```

### 3. Generate SSH Key for GitHub Actions

On your **local machine** (not the server):

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/github_actions_staging

# Copy the public key to your staging server
ssh-copy-id -i ~/.ssh/github_actions_staging.pub your-user@your-staging-server.com

# Display the private key (you'll need this for GitHub secrets)
cat ~/.ssh/github_actions_staging
```

## 🔐 GitHub Repository Secrets Setup

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `STAGING_SSH_KEY` | Private SSH key (from step 3 above) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `STAGING_HOST` | Your staging server IP or domain | `staging.yourdomain.com` or `123.45.67.89` |
| `STAGING_USER` | SSH username | `ubuntu` or your username |
| `STAGING_PATH` | Deployment directory on server | `/var/www/thrifter-backend-staging` |
| `STAGING_DATABASE_URL` | PostgreSQL connection string | `postgresql://thrifter_staging:password@localhost:5432/thrifter_staging` |
| `STAGING_JWT_SECRET` | JWT secret key | `your-super-secret-jwt-key-change-this` |
| `STAGING_JWT_ACCESS_EXPIRATION` | Access token expiry | `1h` |
| `STAGING_JWT_REFRESH_EXPIRATION` | Refresh token expiry | `7d` |
| `STAGING_CORS_ORIGIN` | Frontend URL | `https://staging-admin.yourdomain.com` |

## 🌿 Create Staging Branch

```bash
# Navigate to the backend directory
cd /Users/saqu/Desktop/projects/thrifter-store/thriftier-backend

# Create and switch to staging branch
git checkout -b staging

# Push to remote
git push -u origin staging
```

## 🚀 How to Deploy

### Automatic Deployment

Simply push your code to the `staging` branch:

```bash
# Make your changes
git add .
git commit -m "feat: your changes"

# Push to staging (triggers automatic deployment)
git push origin staging
```

### Manual Deployment

If you need to deploy manually:

```bash
# SSH into staging server
ssh your-user@your-staging-server.com

# Navigate to app directory
cd /var/www/thrifter-backend-staging/current

# Pull latest changes (if needed)
git pull origin staging

# Install dependencies
npm ci --only=production

# Run migrations
npx prisma migrate deploy

# Restart app
pm2 restart thrifter-backend-staging
```

## 📊 Monitoring

### Check Application Status

```bash
# SSH into server
ssh your-user@your-staging-server.com

# Check PM2 status
pm2 status

# View logs
pm2 logs thrifter-backend-staging

# Monitor in real-time
pm2 monit
```

### PM2 Startup Configuration

To ensure your app restarts on server reboot:

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

## 🔄 Rollback

If something goes wrong, you can rollback to a previous version:

```bash
# SSH into server
ssh your-user@your-staging-server.com

# Navigate to app directory
cd /var/www/thrifter-backend-staging

# List backups
ls -la | grep backup

# Restore a backup (replace with your backup name)
rm -rf current
cp -r backup-20240101-120000 current
cd current

# Restart app
pm2 restart thrifter-backend-staging
```

## 🐛 Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs in your repository
2. Verify all secrets are correctly set
3. Ensure SSH key has correct permissions on server
4. Check server disk space: `df -h`

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs thrifter-backend-staging --lines 100

# Check if port is already in use
sudo lsof -i :3000

# Check environment variables
cat /var/www/thrifter-backend-staging/current/.env
```

### Database Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -U thrifter_staging -d thrifter_staging

# Run migrations manually
cd /var/www/thrifter-backend-staging/current
npx prisma migrate deploy
```

## 🔒 Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use strong passwords for database
3. ✅ Keep SSH keys secure
4. ✅ Regularly update server packages
5. ✅ Use firewall (UFW) on server
6. ✅ Enable fail2ban for SSH protection
7. ✅ Use HTTPS with SSL certificates (Let's Encrypt)

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)

## 🆘 Support

If you encounter issues:
1. Check the logs: `pm2 logs thrifter-backend-staging`
2. Review GitHub Actions workflow run
3. Verify all secrets are correctly configured
4. Check server resources (CPU, RAM, Disk)

