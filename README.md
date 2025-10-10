==================for backend======================
--------------------------------------------------------------------------------------------------
composer install
copy .env.example .env
   --for env and cors
     -Replace all https://postomental-miley-rangier.ngrok-free.dev

    
php artisan migrate:refresh --seed
php artisan optimize:clear
php artisan route:cache
php artisan serve

--------------------------------------------------------------------------------------------------
====================for frontend===================

npm install
npm run build

======================ngrok==========================

ngrok http 8000
