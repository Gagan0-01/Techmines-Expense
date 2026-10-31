# TECHMINES — Professional Office Expense & Ledger Web App

TechMines Office Ledger is a clean, reliable, production-quality office ledger and expense management web application designed for office owners, startup founders, and small businesses. It provides accurate tracking for incoming revenue, expenses, balances, and daily financial records formatted strictly in Indian Rupees (₹).

---

## 🚀 Key Features & Updates

### 1. Minimal Mobile Header
- **Mobile Screens (< 768px)**: Displays **strictly the TechMines logo and brand name on the left**.
- Completely free of search bars, desktop navigation links, financial statistics, profile menus, or unnecessary icons.
- Compact height with a subtle bottom border.

### 2. Streamlined Office Page
- **Removed the search bar completely** from the Office page.
- Contains only the essential elements:
  1. Page title: **Office**.
  2. Total **Office Balance** card.
  3. **Total Incoming**, **Total Expenses**, and **Net Cash Flow** summary cards.
  4. Two main actions: **+ Add Incoming** and **+ Add Expense** (easily tappable on both mobile and desktop).
  5. **Recent Transactions** list with view, edit, delete, and share actions.
  6. Relevant date/period and category filters **without a search bar**.
- Search remains available on the **Incoming** and **Expenses** pages.

### 3. Secure Authentication & Financial Data Isolation
- **User Registration & Login**: Built with `bcryptjs` password hashing and secure JWT authentication.
- **Strict Data Isolation**: Every transaction, opening balance, category, and recurring schedule is strictly isolated per user account via backend `userId` enforcement.
- **Demo Account**: Seeded automatically for rapid evaluation:
  - **Email**: `demo@techmines.com`
  - **Password**: `Password123!`
- **Protected Routes**: Unauthenticated users are redirected to `/login`, preserving their target destination upon sign-in.

### 4. Fully Responsive Layout (320px to 4K)
- **Mobile (320px–767px)**: Minimal TechMines branding in header, fixed 4-item bottom navigation, single/two-column balanced cards, mobile transaction cards without horizontal scroll, safe-area padding (`pb-28`) preventing content from being covered by bottom navigation.
- **Tablet (768px–1023px)**: Flexible 2-column layout, compact sidebar, table views with responsive overflow wrappers.
- **Desktop (1024px+)**: Fixed left sidebar with brand logo and navigation, 4-column summary metric cards, centered main container (`max-w-7xl mx-auto`).

### 5. Primary Navigation — Exactly Four Destinations
1. **Office (`/`)**
2. **Incoming (`/incoming`)**
3. **Expenses (`/expenses`)**
4. **Daily (`/daily`)**

*(Authentication pages `/login` and `/signup` are accessed via standard flows and do not appear as bottom navigation tabs).*

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide React, React Router 6, Axios, date-fns.
- **Export Engines**: jsPDF & jsPDF-autotable (PDF), SheetJS / xlsx (Excel), native CSV generator.
- **Backend**: Node.js (ES Modules), Express.js, Mongoose 8, bcryptjs, jsonwebtoken.
- **Database**: MongoDB with automatic embedded MongoMemoryServer fallback for zero-friction setup.

---

## 📂 Project Structure

```
tracker/
├── backend/
│   ├── src/
│   │   ├── config/          # db.js (MongoDB + MongoMemoryServer fallback)
│   │   ├── controllers/     # auth, transaction, category, recurring, settings, report
│   │   ├── middleware/      # auth.js (JWT requireAuth)
│   │   ├── models/          # User, Transaction, Category, RecurringSchedule, Settings
│   │   ├── routes/          # Express API route declarations
│   │   ├── utils/           # dateUtils, seed defaults
│   │   └── server.js        # Express application entrypoint
│   ├── tests/
│   │   └── api.test.js      # API test suite covering auth & data isolation
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Common modals, layout, table, filters, cards
│   │   ├── context/         # AuthContext, LedgerContext, ToastContext
│   │   ├── pages/           # LoginPage, SignUpPage, OfficePage, IncomingPage, ExpensesPage, DailyPage, RecurringPage
│   │   ├── services/        # api.js, exportService.js (PDF/CSV/XLSX)
│   │   ├── utils/           # currency.js (INR formatter), date.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── package.json             # Root workspace runner
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)
- MongoDB (optional — if no local MongoDB is running, the backend automatically boots an embedded MongoDB memory instance)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start Backend API
```bash
cd backend
npm run dev
```
The API starts at `http://localhost:5000`.

### 3. Start Frontend Web App
```bash
cd frontend
npm run dev
```
The application opens at `http://localhost:3000`.

---

## 🧪 Verification & Test Results

Run backend automated tests:
```bash
cd backend
npm test
```

### Actual Test Suite Results:
```
✔ 1. Health check returns ok and INR currency (59ms)
✔ 2. Authentication - Registration, Validation, and Login (390ms)
✔ 3. Protected routes reject unauthorized requests (12ms)
✔ 4. Data Isolation - User A transactions are invisible to User B (49ms)
✔ 5. Settings - User opening balance isolation (46ms)
✔ 6. Daily Report and Monthly Comparison for authenticated user (34ms)
✔ 7. Recurring Schedule - Create and Complete with authentication (32ms)

ℹ tests 7 | pass 7 | fail 0 (715ms)
```

### Production Build:
```bash
cd frontend
npm run build
```
Builds cleanly with zero errors in ~5.4s.
