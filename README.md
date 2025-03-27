# Audioscape

## 🎵 Overview
Audioscape is a feature-rich music streaming web application built using the **MERN stack**. It allows users to search, play, and manage music using the **YouTube Data API**, while also storing their listening history in **Firestore**.

## 🚀 Features
- 🎧 **Search & Play Music** via YouTube Data API
- 📂 **Custom Music Player** with YouTube IFrame API
- 🔄 **History Tracking** (Stores played songs in Firestore)
- 📑 **Dynamic Playlists** & Right-side slider for track details
- 🔍 **Categories Page** with paginated albums & "See All" feature
- 🛠 **Authentication with Firebase**

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, ShadCN/UI
- **Backend**: Node.js, Express, Firebase
- **Authentication**: Firebase + Google Oauth
- **Database**: Firestore (User song history tracking)
- **APIs**: YouTube Data API, YouTube IFrame API

## 📜 Installation & Setup
### 1️⃣ Clone the Repository
```sh
git clone https://github.com/Anirban780/audioscape.git
cd audioscape
```
### 2️⃣ Install Dependencies
```sh
npm install  # For both frontend & backend
```
### 3️⃣ Configure Environment Variables
Create a **.env** file in the root directory and add the following:
```env
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
REACT_APP_YOUTUBE_API_KEY=your-youtube-api-key
REACT_APP_AWS_S3_BUCKET=your-s3-bucket-name
BACKEND_URL=http://localhost:5000
etc.
```
### 4️⃣ Start the Development Server
#### Frontend:
```sh
npm run dev
```
#### Backend:
```sh
cd backend
npm start
```

## 🌍 Deployment
### **Frontend (Vercel)**:
```sh
vercel deploy
```
### **Backend (Vercel/AWS)**:
```sh
vercel --prod
```


## 🙌 Contributing
Contributions are welcome! Feel free to fork the repo, create a feature branch, and submit a PR.

## 📜 License
This project is licensed under the MIT License.

## 📞 Contact
For support or queries, reach out via [fairytailanirbans@gmail.com](mailto:fairytailanirbans@gmail.com).
