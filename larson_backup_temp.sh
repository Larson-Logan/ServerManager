#!/bin/bash
BACKUP_DIR=/root/backups
DATE=$(date +%Y-%m-%d)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/larson-config-$DATE.tar.gz \
  /var/www/larsonserver/server/.env \
  /var/www/larsonserver/auth0-deploy/ \
  2>/dev/null
# Keep only last 7 days of backups
find $BACKUP_DIR -name 'larson-config-*.tar.gz' -mtime +7 -delete
echo "[$(date)] Backup complete: larson-config-$DATE.tar.gz" >> /var/log/larson-backup.log
