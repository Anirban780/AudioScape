# 🎧 Audioscape

Overview
Audioscape is a feature-rich music streaming web application built with the MERN stack. It allows users to search, play, and manage music using the YouTube Data API, while maintaining their listening history in Firestore. The application features a custom-built music player powered by the YouTube IFrame API.

## 🚀 Features

🔍 Search & Play Music using the YouTube Data API

🎵 Custom Music Player with YouTube IFrame API

📜 Listening History stored per user in Firestore

🎼 Dynamic Playlists with right-side sliding track details

🗂 Category-Based Album Pages with pagination and "See All" support

🔐 Authentication with Firebase + Google OAuth

⚡ Queue System with related tracks and history integration

🌗 Dark/Light Theme Support

## 🛠 Tech Stack

Frontend: React, Vite, Tailwind CSS, ShadCN/UI

Backend: Node.js, Express

Authentication: Firebase Authentication (with Google OAuth)

Database: Firestore (for storing user data & listening history)

APIs: YouTube Data API, YouTube IFrame API

## 📦 Installation & Setup

1️⃣ Clone the Repository
bash
Copy
Edit
git clone https://github.com/Anirban780/audioscape.git
cd audioscape

2️⃣ Install Dependencies
Frontend
bash
Copy
Edit
cd frontend
npm install
Backend
bash
Copy
Edit
cd backend
npm install

3️⃣ Configure Environment Variables
Create a .env file in both the frontend and backend directories.

Frontend (frontend/.env):
env
Copy
Edit
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_YOUTUBE_API_KEY=your-youtube-api-key
VITE_BACKEND_URL=http://localhost:5000

Backend (backend/.env):
env
Copy
Edit
YOUTUBE_API_KEY=your-youtube-api-key
FIREBASE_SERVICE_ACCOUNT=your-service-account-json-path-or-string
PORT=5000

4️⃣ Run the Application
Start Backend
bash
Copy
Edit
cd backend
npm start
Start Frontend
bash
Copy
Edit
cd ../frontend
npm run dev

## 🌍 Deployment
🔹 Frontend (Vercel)
bash
Copy
Edit
cd frontend
vercel deploy --prod
🔹 Backend (Optional: Vercel, AWS, Render, etc.)
You can deploy the backend using:

Vercel (with API routes)

AWS EC2 or Lambda

Render (recommended for Express apps)

## 🤝 Contributing
Contributions are welcome!
To contribute:

Fork the repository

Create a feature branch

Commit your changes

Open a Pull Request

## 📜 License
This project is licensed under the MIT License.

## 📬 Contact
For support or inquiries, reach out at:
fairytailanirbans@gmail.com
