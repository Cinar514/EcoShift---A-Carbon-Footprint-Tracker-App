# EcoShift – A Carbon Footprint Tracker App

**EcoShift** is a web-based application designed to help individuals, especially interns, track their sustainable habits and measure real-time CO₂ savings. It promotes environmental awareness through habit tracking, data visualization, and community engagement.

---

## 🌟 Features
- ✅ Track daily sustainable actions (cycling, plant-based meals, etc.)
- 📊 Real-time dashboard with CO₂ savings, top performers, and category breakdowns
- 👥 Profile creation, switching, and management
- 📝 Log actions with quantity, date, and notes
- 📤 Export data as CSV, summary reports, and presentation-ready formats
- 📅 Date range filtering and quick select options
- 🔒 Local storage for auto-saving form data and preferences

---

## 🛠️ Tech Stack
- **Frontend**: HTML, CSS (Bootstrap), JavaScript (Chart.js)
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Other Libraries**: date-fns, body-parser, cors

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or later)

### Installation
```bash
git clone https://github.com/your-username/ecoshift.git
cd ecoshift
npm install
```

### Run the App
```bash
npm start
# or for development
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📸 Screenshots

### 🏠 Landing Page
![Landing Page](Screenshot%202025-09-22%20210549.png)

### 📊 Impact Dashboard
![Impact Dashboard](Screenshot%202025-09-22%20210730.png)

### 📈 Dashboard Analytics
![Dashboard Analytics](Screenshot%202025-09-22%20210800.png)

### 📝 Log Action
![Log Action](Screenshot%202025-09-22%20211148.png)

### 👤 Create Profile
![Create Profile](Screenshot%202025-09-22%20211122.png)

### 🔄 Switch Profile
![Switch Profile](Screenshot%202025-09-22%20211152.png)

### 🧾 Current Profile
![Current Profile](Screenshot%202025-09-22%20211229.png)

### 📤 Export & Reporting
![Export](Screenshot%202025-09-22%20211325.png)

---

## 📤 Export Capabilities
- **CSV Export**: Raw data for Excel/Google Sheets
- **Summary Report**: Executive overview with key metrics
- **Individual Reports**: Per-user progress summaries
- **Presentation Data**: Stakeholder-ready insights

---

## ⚙️ Configuration
- Configurable via `config.json`
- Supports themes, language, date format, and CO₂ factors
- Data retention: 365 days
- Export formats: CSV, HTML, PDF

---

## 📡 API Endpoints
- `GET /api/habits`
- `POST /api/users`
- `GET /api/users`
- `POST /api/users/:userId/habits`
- `GET /api/users/:userId/habits`
- `POST /api/logs`
- `GET /api/users/:userId/logs`
- `GET /api/dashboard`

---

## 📄 License
This project is licensed under the MIT License.

---

## 🙌 Acknowledgements
- Stakeholders and mentors for feedback
- Open-source libraries: Chart.js, Bootstrap, date-fns

