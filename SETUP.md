# DCMS Setup Guide

This guide covers the installation and configuration of the Dental Clinic Management System (DCMS) for both local development and production environments.

## Prerequisites

Ensure you have the following installed on your system:

*   **PHP**: 8.2 or higher
*   **Composer**: Latest version
*   **Node.js**: v18 or higher (LTS recommended)
*   **MySQL**: 8.0 or higher
*   **Git**: For version control

---

## 1. Local Development Setup

Follow these steps to get the application running on your local machine.

### A. Clone the Repository
```bash
git clone <repository_url>
cd DCMS_Dev_Deploy
```

### B. Backend Setup (`bend`)

1.  **Navigate to the backend directory:**
    ```bash
    cd bend
    ```

2.  **Install PHP dependencies:**
    ```bash
    composer install
    ```

3.  **Environment Configuration:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and configure your database credentials:
        ```ini
        DB_CONNECTION=mysql
        DB_HOST=127.0.0.1
        DB_PORT=3306
        DB_DATABASE=dcms_local
        DB_USERNAME=root
        DB_PASSWORD=your_password
        ```

4.  **Generate Application Key:**
    ```bash
    php artisan key:generate
    ```

5.  **Run Migrations and Seeders:**
    *   Create the database `dcms_local` in your MySQL server first.
    *   Run the migrations and seed the database with initial data:
        ```bash
        php artisan migrate:fresh --seed
        ```

6.  **Start the Backend Server:**
    ```bash
    php artisan serve
    ```
    *   The API will be available at `http://localhost:8000`.

### C. Frontend Setup (`fend`)

1.  **Open a new terminal and navigate to the frontend directory:**
    ```bash
    cd fend
    ```

2.  **Install Node dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    *   Create a `.env` file (if it doesn't exist) and point it to your backend:
        ```ini
        VITE_API_BASE_URL=http://localhost:8000/api
        VITE_ENABLE_MAYA_PAYMENTS=false
        ```

4.  **Start the Frontend Development Server:**
    ```bash
    npm run dev
    ```
    *   The application will be available at `http://localhost:5173`.

---

## 2. Production Deployment (Manual)

> [!NOTE]
> For a more robust production setup, please refer to the **Docker Deployment** section (Coming Soon).

If you are deploying to a shared hosting or a VPS without Docker:

1.  **Build the Frontend:**
    ```bash
    cd fend
    npm run build
    ```
    *   This generates static files in `fend/dist`. Move these files to your web server's public directory.

2.  **Configure Backend:**
    *   Set `APP_ENV=production` and `APP_DEBUG=false` in `.env`.
    *   Optimize Laravel:
        ```bash
        php artisan config:cache
        php artisan route:cache
        php artisan view:cache
        ```

3.  **Web Server (Nginx/Apache):**
    *   Point your web server root to the `bend/public` directory.
    *   Ensure the `storage` and `bootstrap/cache` directories are writable by the web server user.

---

## 3. Troubleshooting

*   **500 Internal Server Error**: Check `bend/storage/logs/laravel.log` for details.
*   **CORS Errors**: Ensure `SANCTUM_STATEFUL_DOMAINS` in `.env` matches your frontend domain.
*   **Database Connection Refused**: Verify MySQL is running and credentials in `.env` are correct.
