# Dental Clinic Management System (DCMS) - Installation Guide

The following instructions will help you set up the project locally.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Docker & Docker Compose** (Recommended for easiest setup)
*   **PHP** >= 8.1 (For manual backend setup)
*   **Composer** (For manual backend setup)
*   **Node.js** & **npm** (For manual frontend setup)

---

## Installation & Setup

### Option 1: Docker (Recommended)

The easiest way to get the application running is using Docker Compose.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd DCMS_Dev_Deploy
    ```

2.  **Start the containers:**
    ```bash
    docker-compose up -d
    ```
    This command will build and start the backend (`app`), web server (`web`), database (`db`), and redis (`redis`) containers.

3.  **Access the application:**
    *   Frontend/Web: `http://localhost`
    *   Backend API: `http://localhost/api` (proxied via nginx)

---

### Option 2: Manual Setup

If you prefer to run the services directly on your machine.

#### Backend (Laravel)

1.  **Navigate to the backend directory:**
    ```bash
    cd bend
    ```

2.  **Install PHP dependencies:**
    ```bash
    composer install
    ```

3.  **Environment Configuration:**
    Copy the example environment file and configure your database settings.
    ```bash
    cp .env.example .env
    ```
    *Edit `.env` and set your database credentials (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).*

4.  **Generate Application Key:**
    ```bash
    php artisan key:generate
    ```

5.  **Run Database Migrations & Seeders:**
    ```bash
    php artisan migrate:refresh --seed
    ```

6.  **Serve the Backend:**
    ```bash
    php artisan serve
    ```
    The backend will typically run on `http://localhost:8000`.

#### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../fend
    # or cd fend if from root
    ```

2.  **Install Node dependencies:**
    ```bash
    npm install
    ```

3.  **Build or Serve:**
    *   **Development:**
        ```bash
        npm run dev
        ```
    *   **Production Build:**
        ```bash
        npm run build
        ```

---

## Configuration & Credentials

The application relies on several environment variables for third-party services. Ensure these are set in your `bend/.env` file.

### Database
*   `DB_CONNECTION`: `mysql`
*   `DB_HOST`: `127.0.0.1` (or `db` if using Docker)
*   `DB_PORT`: `3306`
*   `DB_DATABASE`: `Capstone`
*   `DB_USERNAME`: `root`
*   `DB_PASSWORD`: (Your database password)

### Mail Configuration
*   `MAIL_MAILER`: `smtp` (or `mailtrap-sdk` for API)
*   `MAIL_HOST`: `sandbox.smtp.mailtrap.io` (or your SMTP host)
*   `MAIL_PORT`: `2525`
*   `MAIL_USERNAME`: (Your Mailtrap Username)
*   `MAIL_PASSWORD`: (Your Mailtrap Password)
*   `MAIL_FROM_ADDRESS`: `no-reply@dentalclinic.test`

### SMS Service (ClickSend)
*   `SMS_ENABLED`: `true`
*   `CLICKSEND_USERNAME`: (Your ClickSend Username)
*   `CLICKSEND_API_KEY`: (Your ClickSend API Key)
*   `CLICKSEND_FALLBACK_USERNAME`: (Fallback Username)
*   `CLICKSEND_FALLBACK_API_KEY`: (Fallback API Key)

### AWS (S3 & SNS)
*   `AWS_ACCESS_KEY_ID`: (Your AWS Access Key)
*   `AWS_SECRET_ACCESS_KEY`: (Your AWS Secret Key)
*   `AWS_DEFAULT_REGION`: `ap-southeast-2` (or your region)
*   `AWS_BUCKET`: (Your S3 Bucket Name)

### Payment Gateway (Maya)
*   `MAYA_BASE`: `https://pg-sandbox.paymaya.com`
*   `MAYA_PUBLIC_KEY`: (Your Maya Public Key)
*   `MAYA_SECRET_KEY`: (Your Maya Secret Key)

---

## Scheduled Tasks

The system uses Laravel's scheduler for various automated tasks, including:
*   Marking no-show appointments (every 15 mins)
*   Updating goal progress (daily at 01:15)
*   Auto-canceling expired promos (daily at 02:00)
*   Retrying queued emails (every 5 mins)
*   Sending appointment reminders (daily at 06:00)
*   Inventory expiry scanning (daily at 08:00)
*   Archiving inactive patients (daily at 03:30)

### Running the Scheduler Locally
To run the scheduler locally during development:

```bash
cd bend
php artisan schedule:work
```

### Production Setup
In a production environment, you should add the following Cron entry to your server:

```bash
* * * * * cd /path-to-your-project/bend && php artisan schedule:run >> /dev/null 2>&1
```

## Additional Notes

### Ngrok (Optional)
If you need to expose your local environment to the internet (e.g., for testing webhooks or showing a client), you can use ngrok.

```bash
ngrok http 8000
```

### Troubleshooting
*   **Permissions:** If you encounter permission errors with storage logs, ensure the `storage` and `bootstrap/cache` directories are writable.
    ```bash
    chmod -R 775 storage bootstrap/cache
    ```
*   **Cache:** If configuration changes aren't reflecting, try clearing the cache:
    ```bash
    php artisan optimize:clear
    ```
