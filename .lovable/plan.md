

# CondoManager - Condominium Management Platform

A comprehensive web application to simplify the management of condominiums by centralizing administrative, financial, and maintenance processes.

---

## User Roles & Authentication

### Three User Types
- **Administrator**: Full building management, approve estimates, financial oversight, send announcements
- **Resident**: View fees, submit maintenance requests, track progress, receive notifications  
- **Service Provider**: Submit estimates, update job status, attach invoices

### Authentication Features
- Secure email/password login and registration
- Role-based access control with protected routes
- Password reset functionality

---

## Building & Unit Management

### Multi-Building Support
- Create and manage multiple condominiums/buildings
- Each building has its own set of units, residents, and service providers
- Building profile with address, contact info, and photos

### Unit Management
- Add/edit apartments or units within each building
- Assign residents to units
- Track ownership and tenant information

---

## Fee Management

### Payment Tracking
- Monthly fee records for each unit
- Payment status: Paid, Pending, Overdue
- Outstanding balance calculations

### Financial Features
- Generate monthly and annual summaries
- Automatic payment reminders (via email and in-app)
- Payment history for each resident

---

## Maintenance Requests & Estimates

### Request Workflow
- Residents submit maintenance requests with category (plumbing, electrical, construction, general)
- Attach photos and descriptions
- Status tracking: **Requested → Under Review → Approved → In Progress → Completed → Paid**

### Estimate Management
- Administrators request quotes from service providers
- Service providers submit estimates with pricing and timeline
- Compare multiple estimates side-by-side
- Approve and assign work to providers

### Job Tracking
- Real-time status updates
- Service providers can attach completion photos and invoices
- Final approval by administrator

---

## Financial Dashboard & Reports

### Overview Dashboard
- Total income vs expenses
- Outstanding balances summary
- Monthly/yearly trends with visual charts

### Reporting Features
- Expense tracking by category (plumbing, electrical, etc.)
- Building-by-building financial breakdown
- Export reports to PDF and Excel

---

## Communication & Notifications

### In-App Notifications
- Real-time alerts for status changes, new requests, payment reminders
- Notification center with read/unread status

### Email Notifications
- Payment reminders and overdue notices
- Maintenance request updates
- Estimate approvals and assignments

### Push Notifications
- Urgent announcements
- Status change alerts

### Communication Features
- Announcement board for building-wide updates
- Discussion threads attached to maintenance requests
- Direct messaging between admins, residents, and providers

---

## Design & User Experience

### Modern & Friendly Interface
- Clean, colorful design with intuitive navigation
- Card-based layouts for easy scanning
- Status badges and progress indicators

### Responsive Web Design
- Optimized for desktop browsers (primary)
- Fully responsive for tablets and mobile devices
- Touch-friendly interactions

---

## Technical Foundation

### Backend (Supabase)
- Secure user authentication and role management
- Database for buildings, units, users, fees, requests, and estimates
- Row-level security for data protection
- Real-time subscriptions for live updates

### Key Pages
1. **Dashboard** - Role-specific overview with key metrics
2. **Buildings** - List and manage condominiums
3. **Units** - Manage apartments within a building
4. **Residents** - User management per building
5. **Fees** - Payment tracking and summaries
6. **Maintenance** - Request list with filtering and status
7. **Estimates** - Quote management and comparison
8. **Reports** - Financial charts and export options
9. **Announcements** - Building-wide communication
10. **Settings** - Profile and notification preferences

