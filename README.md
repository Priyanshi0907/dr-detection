# 🔬 AcuSight AI — Diabetic Retinopathy Detection System

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![CNN](https://img.shields.io/badge/Model-CNN-orange?style=flat-square)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)

> ⚠️ **Disclaimer:** This AI system is intended for **screening assistance only** and does not replace professional medical diagnosis. Always consult a qualified ophthalmologist for clinical evaluation and treatment decisions.

---

## 📌 Overview

**AcuSight AI** is an end-to-end web application for automated **Diabetic Retinopathy (DR) detection** from retinal fundus images. Built on a custom-trained Convolutional Neural Network (CNN), the system classifies DR severity into five grades and provides actionable recommendations, Grad-CAM heatmap visualizations, and progress monitoring — all through an intuitive web interface.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| 🖥️ Frontend | [https://dr-detection-tau.vercel.app](https://dr-detection-tau.vercel.app) |
| ⚙️ Backend API | [https://dr-detection-lhhi.onrender.com](https://dr-detection-lhhi.onrender.com) |

---

## ✨ Features

- 🧠 **AI-Powered DR Detection** — Upload a retinal fundus image and get instant classification
- 🏷️ **5-Class Severity Grading** — No DR · Mild · Moderate · Severe · Proliferative DR
- 💡 **Precautions & Recommendations** — Personalized guidance based on detected DR class
- 🗺️ **Grad-CAM Heatmaps** — Visual explanation of which retinal regions influenced the prediction
- 📊 **Progress Monitoring** — Track DR progression over time with interactive charts
- 📄 **Report Generation** — Download detailed reports with predictions, heatmaps, and trend analysis
- 👤 **User Authentication** — Secure login, registration, and forgot password flow
- 📁 **Detection History** — Access and review all past screening results via Dashboard
- 🌗 **Theme Support** — Light/Dark mode via ThemeContext

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| ML Model | Convolutional Neural Network (CNN) — Keras |
| Database | SQLite (`acusight.db`) |
| Heatmaps | Grad-CAM (`gradcam.py`) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## 🧠 ML Model

- **Architecture:** Custom CNN (`classifier.py`) trained with Keras
- **Training Notebook:** `Diabetic_Retinopathy.ipynb`
- **Saved Model:** `best_dr_model.keras`
- **Classes:** No DR · Mild · Moderate · Severe · Proliferative DR
- **Output:** Class prediction + confidence score + Grad-CAM heatmap

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Python 3.10+
- Node.js 18+
- pip & npm

### 1. Clone the repository

```bash
git clone https://github.com/Priyanshi0907/dr-detection.git
cd dr-detection
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `/backend`:

```env
JWT_SECRET=your_secret_key
```

Start the backend:

```bash
python run.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `/frontend`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

---

## 📁 Project Structure

```
DR/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── classifier.py       # CNN model inference
│   │   │   └── gradcam.py          # Grad-CAM heatmap generation
│   │   ├── auth.py                 # Authentication logic
│   │   ├── config.py               # App configuration
│   │   ├── database.py             # SQLite DB setup
│   │   ├── main.py                 # FastAPI app & routes
│   │   ├── schemas.py              # Pydantic schemas
│   │   └── utils.py                # Helper functions
│   ├── static/uploads/
│   │   ├── heatmap/                # Generated heatmap images
│   │   ├── original/               # Uploaded retinal images
│   │   └── reports/                # Generated PDF reports
│   ├── acusight.db                 # SQLite database
│   ├── best_dr_model.keras         # Trained CNN model
│   ├── Diabetic_Retinopathy.ipynb  # Model training notebook
│   ├── Dockerfile.backend
│   ├── requirements.txt
│   ├── runtime.txt
│   └── run.py                      # Entry point
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js           # Axios API client
    │   ├── assets/                 # Images & SVGs
    │   ├── components/
    │   │   ├── AnimatedText.jsx
    │   │   ├── DisclaimerBanner.jsx
    │   │   ├── Navbar.jsx
    │   │   └── ProfileModal.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx     # Auth state management
    │   │   └── ThemeContext.jsx    # Dark/light mode
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── ForgotPasswordPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   └── ScanPage.jsx        # Main DR detection page
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Password reset |
| POST | `/api/predict` | Upload retinal image & get DR prediction |
| GET | `/api/history` | Fetch past detection records |
| GET | `/api/report/{id}` | Download report for a detection |

---

## 📄 License

This project is licensed under the MIT License.

---

## 👩‍💻 Author

**Priyanshi** — [GitHub](https://github.com/Priyanshi0907)

---

*Built with ❤️ to make DR screening accessible and enable early diagnosis.*