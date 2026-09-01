# 🔋 AK Enterprises CRM

A premium, minimalistic, and highly secure internal CRM designed specifically for **AK Enterprises**.
This application streamlines the tracking of battery sales, service tickets, and inventory management.

![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20Supabase%20%2B%20Tailwind-black?style=for-the-badge&logo=react)

## ✨ Features

- **📊 Sales Tracking:** Record new sales, auto-calculate warranty expiry dates, and attach vehicle details.
- **🛠️ Service Management:** Log batteries brought in for charging/repair with an easy status tracker (Pending, Charging, Ready, Unrepairable).
- **📦 Inventory Management:** Maintain a live database of available battery brands, models, and pricing. Auto-fills during sales entry.
- **👥 Role-Based Access Control:**
  - **Admin (Owner):** Full access, can delete records, and manage worker accounts.
  - **Workers:** Can add and edit records, but cannot delete them.
- **🛡️ Secure Approval System:** Workers can sign up, but must be approved by the Admin in the built-in Admin Panel before they can view any shop data.
- **🔍 Search, Filter & Sort:** Instantly find records by customer name, phone number, vehicle number, or battery brand.
- **📱 Fully Responsive:** Premium dark-mode UI that works flawlessly on desktop computers and mobile phones.

## 🛠️ Tech Stack

- **Frontend:** React.js (Vite)
- **Styling:** Tailwind CSS (Glassmorphism design)
- **Animations:** Framer Motion
- **Backend/Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React

## 🚀 Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/xCaptaiN09/ak-enterprises-shop.git
   cd ak-enterprises-shop
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
