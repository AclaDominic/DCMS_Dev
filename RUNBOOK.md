# DCMS Operations Runbook

This document outlines common operational tasks, maintenance procedures, and troubleshooting steps for the Dental Clinic Management System.

## 1. Backup & Restore

### Database Backup
**Automated (Recommended):**
The system has a built-in backup feature in the Admin Panel (`/admin/settings/backup`). This generates an encrypted SQL file.

**Manual (CLI):**
To manually back up the database (e.g., before a major update):
```bash
# Navigate to project root
cd bend

# Run mysqldump
mysqldump -u [username] -p[password] [database_name] > backup_$(date +%Y%m%d).sql
```

### Database Restore
**Via Admin Panel:**
Upload the encrypted backup file via the Admin Panel restore interface.

**Manual (CLI):**
> [!WARNING]
> This will overwrite the current database.
```bash
mysql -u [username] -p[password] [database_name] < backup_file.sql
```

---

## 2. Secret Rotation

If a security breach is suspected or as part of regular maintenance, rotate the following secrets.

### Application Key (`APP_KEY`)
This key encrypts user sessions and other sensitive data.
> [!CAUTION]
> Rotating this key will invalidate all existing user sessions and may make encrypted data (like medical notes) unreadable if not handled correctly. **Ensure you have a decrypted backup of sensitive data before proceeding.**

1.  **Generate a new key:**
    ```bash
    php artisan key:generate --show
    ```
2.  **Update `.env`:** Replace the old `APP_KEY` with the new one.
3.  **Clear Config Cache:**
    ```bash
    php artisan config:clear
    ```

### Maya Payment Keys
1.  Log in to the Maya Business Manager.
2.  Regenerate the **Public Key** and **Secret Key**.
3.  Update `MAYA_PUBLIC_KEY` and `MAYA_SECRET_KEY` in `.env`.
4.  Restart the application/queue workers.

---

## 3. Maintenance Tasks

### Clearing Caches
If changes to `.env` or configuration files aren't reflecting:
```bash
php artisan optimize:clear
```

### Updating the Application
1.  **Pull latest code:**
    ```bash
    git pull origin main
    ```
2.  **Install dependencies:**
    ```bash
    cd bend && composer install --no-dev --optimize-autoloader
    cd ../fend && npm install && npm run build
    ```
3.  **Run Migrations:**
    ```bash
    cd bend && php artisan migrate --force
    ```
4.  **Restart Queue Workers:**
    ```bash
    php artisan queue:restart
    ```

---

## 4. Troubleshooting

### Logs
*   **Application Logs:** `bend/storage/logs/laravel.log`
*   **Web Server Logs:** `/var/log/nginx/error.log` (depending on server setup)

### Common Issues

**Issue: "500 Server Error" on API calls**
*   **Check:** Permissions on `storage` directory.
    ```bash
    chmod -R 775 storage bootstrap/cache
    ```
*   **Check:** `.env` file exists and has correct DB credentials.

**Issue: Queue Jobs not processing (e.g., Emails not sending)**
*   **Check:** Is the queue worker running?
    ```bash
    php artisan queue:work
    ```
*   **Check:** Failed jobs table.
    ```bash
    php artisan queue:failed
    ```
