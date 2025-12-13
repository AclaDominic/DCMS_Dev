# Dental Clinic Management System (DCMS)

A comprehensive management system for dental clinics, featuring a Laravel backend and a modern frontend.

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

## Additional Notes

### Ngrok (Optional)
If you need to expose your local environment to the internet (e.g., for testing webhooks or showing a client), you can use ngrok.

```bash
ngrok http 8000
```
*Note: You may need to update your `.env` file or frontend API base URL to match the ngrok URL.*

### Troubleshooting
*   **Permissions:** If you encounter permission errors with storage logs, ensure the `storage` and `bootstrap/cache` directories are writable.
    ```bash
    chmod -R 775 storage bootstrap/cache
    ```
*   **Cache:** If configuration changes aren't reflecting, try clearing the cache:
    ```bash
    php artisan optimize:clear
    ```
