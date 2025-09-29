# Analytics Seeder Documentation

## Overview

The `AnalyticsSeeder` generates comprehensive test data for 1 full year to thoroughly test the admin analytics dashboard and monthly reports functionality.

## What Data is Generated

### 1. Patient Visits (Core Analytics Data)
- **Time Period**: 1 full year of data
- **Volume**: 6-25 visits per day (varies by season and day of week)
- **Features**:
  - Realistic time slots (8 AM - 6 PM)
  - Seasonal variations (higher in summer, lower in winter)
  - Weekend vs weekday patterns
  - Various visit statuses (completed, pending, rejected)
  - Service assignments
  - Visit notes

### 2. Appointments
- **Coverage**: 60% of visits have corresponding appointments
- **Statuses**: approved, completed, cancelled
- **Features**:
  - Reference codes
  - Payment methods
  - Appointment notes
  - Time slot tracking

### 3. Payments
- **Coverage**: All completed visits have payments
- **Methods**: cash, maya, hmo
- **Status**: Mostly paid (90% success rate)
- **Amounts**: Based on service prices

### 4. Performance Goals
- **Types**:
  - Monthly total visits target (200 visits)
  - Monthly revenue target (₱500,000)
  - Appointment completion rate (85%)
- **Status**: Active goals for the entire year

### 5. Goal Progress Snapshots
- **Frequency**: Monthly snapshots
- **Metrics**: Actual vs target values
- **Calculation**: Based on real data generated

## How to Use

### Option 1: Run as Part of Full Seeding
```bash
php artisan db:seed
```
This will run all seeders including the AnalyticsSeeder.

### Option 2: Run Analytics Seeder Only
```bash
php artisan analytics:seed
```

### Option 3: Fresh Analytics Data
```bash
php artisan analytics:seed --fresh
```
This clears existing analytics data before seeding.

### Option 4: Manual Testing
```bash
php test_analytics_seeder.php
```

## Data Patterns

### Seasonal Variations
- **Summer Months (Mar-May)**: Higher visit volume
- **December**: Peak season for dental visits
- **January-February**: Lower activity (post-holiday)
- **Weekends**: Reduced activity (3-8 visits vs 15-25 on weekdays)

### Time Patterns
- **Clinic Hours**: 8 AM - 6 PM
- **Peak Hours**: 9 AM - 4 PM
- **Visit Duration**: 20 minutes to 2 hours
- **Time Slots**: 15-minute intervals

### Service Distribution
- **Preventive**: 30% (cleanings, checkups)
- **Restorative**: 40% (fillings, extractions)
- **Cosmetic**: 20% (whitening, special packages)
- **Specialized**: 10% (orthodontics, surgery)

## Testing Analytics Features

### Admin Analytics Dashboard
The seeder provides data for testing:
- **KPI Cards**: Total visits, revenue, completion rates
- **Trend Charts**: Month-over-month comparisons
- **Visit Patterns**: Daily and hourly distributions
- **Service Analytics**: Popular services and categories

### Monthly Reports
Test the monthly report functionality with:
- **Visit Breakdowns**: By day, hour, type, service
- **Appointment Analytics**: Completion rates, no-shows
- **Revenue Reports**: Payment methods, amounts
- **Performance Metrics**: Goal progress tracking

## Data Volume
- **Total Visits**: ~4,000-6,000 per year
- **Total Appointments**: ~2,400-3,600 per year
- **Total Payments**: ~3,400-5,100 per year
- **Performance Goals**: 3 active goals
- **Progress Snapshots**: 36 monthly snapshots

## Customization

To modify the seeder:
1. Edit `bend/database/seeders/AnalyticsSeeder.php`
2. Adjust the `getDailyVisitCount()` method for volume changes
3. Modify `generateTimeSlot()` for different time patterns
4. Update service distribution in `ensureServices()`
5. Change goal targets in `generatePerformanceGoals()`

## Troubleshooting

### Common Issues
1. **Memory Issues**: Reduce batch sizes in bulk inserts
2. **Timeouts**: Increase PHP execution time
3. **Foreign Key Errors**: Ensure proper seeder order

### Performance Tips
- Run during off-peak hours
- Use `--fresh` flag to avoid duplicate data
- Monitor database size (expect ~50-100MB growth)

## Integration with Frontend

The generated data works seamlessly with:
- **Admin Analytics Dashboard** (`/admin/analytics`)
- **Monthly Reports** (`/admin/monthly-report`)
- **Performance Goals** (`/admin/goals`)
- **System Logs** (for audit trails)

## API Endpoints Tested
- `GET /api/analytics/summary`
- `GET /api/reports/visits-monthly`
- `GET /api/goals`
- `GET /api/goals/{id}/progress`

This seeder ensures comprehensive testing of all analytics and reporting features with realistic, varied data patterns.
