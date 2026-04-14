<p align="center">
  <h1 align="center">🦷 Dental Clinic Management System (DCMS)</h1>
  <p align="center">
    A comprehensive, full-stack management system tailored for dental clinics, featuring role-based dashboards, multi-provider appointment scheduling, automated inventory tracking, and integrated patient notifications.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=flat-square&logo=laravel&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=flat-square&logo=bootstrap&logoColor=white" />
  <img src="https://img.shields.io/badge/Sanctum-4-FF2D20?style=flat-square&logo=laravel&logoColor=white" />
  <img src="https://img.shields.io/badge/PHPUnit-11-3C9CD7?style=flat-square&logo=php&logoColor=white" />
</p>

---

## 🤖 AI-First Development Workflow

This project was built leveraging an **AI-Assisted Development** approach. I utilized modern AI software engineering tools to radically accelerate the full-stack delivery lifecycle, maintain high code quality, and resolve complex architectural bottlenecks.

- **Cursor IDE**: Served as my primary development environment. I utilized it extensively for intelligent code completion, rapidly iterating on React components, refactoring complex Laravel controllers, and managing application state efficiently.
- **ChatGPT Plus**: Extensively utilized during the initial planning and prototyping phases. It acted as an initial pair programmer for designing the relational database schema, brainstorming software architecture patterns, and generating complex Eloquent queries.
- **AI-Driven Productivity**:
  - Accelerated the migration of the frontend React application from static mock data to a fully integrated Laravel 12 API.
  - Profiled and optimized heavy SQL search queries.
  - Safely drafted system documentation and automated unit/integration tests following best practices.

---

## 📌 Overview

**DCMS (Dental Clinic Management System)** is a robust web application built to streamline operations for modern dental practices. It acts as a centralized command center serving multiple organizational roles.

The application is engineered with a **React** Single Page Application (SPA) frontend, consuming a powerful **Laravel 12** REST API backend, providing real-time scheduling functionality, payment integration, and a highly responsive user experience. 

---

## ✨ Key Features

### 🔐 System Portal & Role Management
- **Role-Based Dashboards** — Distinct, tailored interfaces and permissions for distinct roles (Admin, Dentist, Patient).
- **Goal Progress Tracking** — Automated progress monitoring and metric visualization.

### 📅 Appointment & Scheduling Engine
- **Multi-Provider Flows** — Book and manage appointments specifically assigned to individual dentists.
- **Automated Reminders** — Integrated **ClickSend** SMS functionality and Email queues via AWS SES/Mailtrap for daily appointment reminders.
- **No-Show Automation** — Scheduled tasks that automatically run every 15 minutes to penalize or flag no-show appointments, managing schedule integrity.
- **Promotional Lifecycle** — Automated systems that expire promotional campaigns dynamically at 02:00 daily.

### 📦 Clinical Inventory Management
- **Stock Tracking** — Granular management of clinical supplies with dynamic check-in and check-out logs.
- **Expiry Expiration Scans** — Background cron tasks running daily at 08:00 to alert administrators of soon-to-expire clinical assets.

### 💳 Billing & Integrations
- **Maya Payment Gateway** — Integrated secure payment links or validations directly within the platform.
- **Cloud Document Storage** — Configured integrations with **AWS S3** for secure retention of patient records or large system assets.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, React Router 7, Vite 6, Bootstrap 5, Chart.js, React-Datepicker |
| **Backend** | Laravel 12, PHP 8.2+, Laravel Sanctum (Token Auth) |
| **Database** | MySQL, Eloquent ORM, Automated Seeding & Factorization |
| **Messaging & Storage** | AWS S3, AWS SNS, ClickSend SMS, Mailtrap |
| **Testing** | PHPUnit 11 (Feature/Unit Test Suites) |
| **Data Viz & PDF** | Chart.js, Laravel DomPDF |
| **Tooling & Environments** | Docker Compose, ESLint, Composer |

---

## 🏗️ Architecture (High Level)

The robust split architecture guarantees tight security and fast rendering.

```
DCMS_Capstone_Project/
├── fend/                       # React SPA (Vite)
│   └── src/
│       ├── components/         # Reusable highly stateful React components
│       ├── pages/              # Routing layers
│       └── ...
│
├── bend/                       # Laravel 12 API
│   ├── app/
│   │   ├── Http/Controllers/   # API Business logic
│   │   ├── Console/Commands/   # Extensive scheduled command tasks
│   │   └── Models/             # Robust Eloquent architecture
│   ├── routes/api.php          # 100+ RESTful API endpoints securely routed
│   └── tests/                  # Integration and Feature assessments
│
└── docker-compose.yml          # Container configuration (App, Web Server, DB, Redis)
```

---

## 🚀 Getting Started

The detailed installation and configuration protocols—covering Docker setup, Laravel artisan commands, environment variables, scheduler cron tracking, and NPM installation—have been documented in a dedicated installation manifesto.

👉 **[View the Installation Guide (INSTALL.md)](./INSTALL.md)**

---

## 💼 Project Purpose

This system was developed as a Capstone release. The goal was twofold: to provide a highly secure, comprehensive software system for dental operations, and to demonstrate proficiency as an **AI-First Full-Stack Developer**. From database optimization tracking to deep platform integrations (AWS, Maya, ClickSend), I engineered all components prioritizing code maintainability, security, and the intelligent use of AI development assistant tools.
