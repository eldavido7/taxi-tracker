# 🚖 Taxi Tracker

A **real-time taxi tracking system** that provides:
- A **backend API** for trip management and live location updates.
- A **web interface** for passengers to view the driver's live location in real time.
- Used by the **Flutter Driver App** for scanning QR codes and updating location data.

---

## ✅ Features
- **Trip Creation & QR Codes**: Generate unique trip sessions with QR codes for drivers.
- **Real-Time Location Updates**: Drivers share live location via the mobile app.
- **Customer View**: `/track` page displays driver location on an interactive map.
- **Distance & Duration Calculation**: Tracks trip metrics upon completion.
- **Responsive UI**: Optimized for mobile and desktop.

---

## 🛠️ Tech Stack
- **Frontend**: [Next.js](https://nextjs.org/) + [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via [Neon](https://neon.tech/))
- **Maps**: Google Maps JavaScript API

---

## 📦 Prerequisites
- Node.js `>=18`
- PostgreSQL database (or Neon for serverless access)
- Google Maps API key
- Google maps app password
- (Optional) Ngrok for local HTTPS tunneling when testing on devices

---

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/taxi-tracker.git
cd taxi-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env.local` file in the project root and add:

```
DATABASE_URL='your-db-url'
JWT_SECRET=your-jwt-secret
REFRESH_SECRET=your-refresh-secret
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
APP_URL=https://your-url-for-this-app
```

### 4. Run Database Migrations
(If using Prisma)
```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Dev Server
```bash
npm run dev
```

The app will run at:  
`http://localhost:3000`

---

## 🌐 Important Routes
- **Homepage**: `/`  
  Displays test driver QR code.
  
- **Track Page**: `/track?sessionId=<id>`  
  Customers view live driver location here (powered by leaflet).
  
- **API Endpoints**:
  - `POST /api/sessions` → Create a trip session (returns sessionId & QR code link)
  - `PATCH /api/sessions/:id` → Update session (end trip, set distance/duration)
  - `GET /api/sessions/:id` → Fetch session details
  - `POST /api/location` → Driver updates current location
  - `GET /api/location?sessionId=:id` → Fetch latest driver location for a session
etc
---

## 🔗 Integration with Flutter App
- The **Flutter Driver App** uses this backend for:
  - Logging in drivers
  - Starting trips (scanning QR codes)
  - Sending location updates to `/api/location`
- Customers view the trip in real time via the `/track` page.

---

## 📂 Project Structure
```
.
├── app/
    └── track/
│       ├── page.tsx/
│       │   
│       └── MapView.tsx    # Location update & fetch
│   ├── page.tsx           # Test driver QR code
│   ├── reset-password/         
│   ├── MapView.tsx        # Live tracking page for viewers
│   └── api/
│       ├── sessions/
│       │── [...]/         # CRUD and auth endpoints
│       └── location/      # Location update & fetch
├── lib/                   # Utilities (auth client, helpers)
└── prisma/                # Schema & migrations
```

---

## ✅ Usage
1. **User starts a trip** in the mobile app.
2. **User scans driver QR code** → Redirects to a map selector where they select destination → Redirects to `/track?sessionId=<id>`.
3. **User shares location** to others → `/track` page updates in real time for viewers to see.
4. **Trip ends** → Distance and duration calculated, trip summary shown to user on app.

---

### 🔗 Related
- **User App (Flutter)** → [Driver Tracker Mobile App](https://github.com/eldavido7/driver_tracker)
