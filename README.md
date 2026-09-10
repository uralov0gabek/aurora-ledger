# Aurora Ledger 🌌

Aurora Ledger is a modern, full-stack personal finance and budgeting application designed for families and individuals. It provides an intuitive interface to track expenses, set saving goals, manage budgets, and forecast future financial trends using intelligent analytics.

## 🌟 Key Features
- **Comprehensive Dashboard:** Visualize your financial health instantly with interactive charts.
- **Transactions & Budgets:** Log daily expenses, define monthly budgets, and avoid overspending.
- **Saving Goals:** Set distinct targets (e.g., Vacation, Emergency Fund) and track your progress.
- **Family Sharing:** Collaborate with family members with defined roles (Head, Manager, Contributor, Observer).
- **Advanced Analytics & Forecast:** Analyze spending trends and predict future category expenses.
- **Multi-Currency Support:** Automatically handles currency conversions and preferences.
- **Secure Authentication:** JWT-based robust authentication with optional Google OAuth.

## 🚀 Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion, Axios, Recharts, Lucide Icons.
- **Backend:** Node.js, Express.js, PostgreSQL (pg), JWT, bcrypt, node-cron.
- **Deployment:** Vercel (Frontend), Render (Backend), Neon (Serverless PostgreSQL).

## 🛠 Installation & Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Local or Cloud like Neon/Supabase)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/aurora-ledger.git
cd aurora-ledger
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Rename `.env.example` to `.env` and configure your database string:
```bash
cp .env.example .env
```
Start the backend (Migrations run automatically):
```bash
npm start
```
*Note: Ensure your PostgreSQL instance is running. The server will auto-create all necessary tables.*

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Rename `.env.example` to `.env` (it defaults to `http://localhost:5000/api`):
```bash
cp .env.example .env
```
Start the development server:
```bash
npm run dev
```

## 📦 Deployment Instructions

### Deploying Frontend to Vercel
1. Connect your GitHub repository to Vercel.
2. Set the **Framework Preset** to `Vite`.
3. Set the Environment Variable:
   - `VITE_API_URL` = `https://your-backend-app.onrender.com/api`
4. Deploy!

### Deploying Backend to Render
1. Create a new "Web Service" connected to your GitHub repository.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `postgresql://user:password@host/database?sslmode=require`
   - `JWT_SECRET` = `your-secure-random-string`
   - `FRONTEND_URL` = `https://your-frontend-app.vercel.app`
6. Deploy! The server will automatically run migrations securely before binding to the port.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
