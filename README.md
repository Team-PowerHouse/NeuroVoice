# 🧠 NeuroVoice AI
### Giving a Voice to Non-Verbal Autistic Children Through Personalized Behavioral Intelligence

> An AI-powered assistive healthcare platform that helps caregivers, therapists, schools, and hospitals understand the personalized behavioral communication of non-verbal autistic children.

---

## 🌟 Overview

NeuroVoice AI is a full-stack healthcare application designed to bridge the communication gap between non-verbal autistic children and their caregivers, therapists, teachers, and healthcare professionals.

Unlike traditional AAC (Augmentative and Alternative Communication) systems that require active child participation, NeuroVoice AI learns the unique behavioral patterns identified by caregivers and converts them into meaningful, explainable insights.

The platform creates a **Personalized Behaviour Dictionary**, predicts the child's needs using an explainable rule-based AI engine, and generates a **Communication Passport** that can be securely shared with hospitals and schools.

---

# 🎯 Problem Statement

Children with Level 3 Autism often communicate through unique behavioural patterns rather than speech.

Parents gradually learn these behaviours over years, but this valuable knowledge is usually unavailable during:

- 🏥 Hospital visits
- 🚑 Emergencies
- 🏫 Schools
- 🧑‍⚕️ Therapy sessions
- 👩‍🏫 New caregivers

This often leads to:

- Miscommunication
- Delayed care
- Increased distress
- Caregiver burden

NeuroVoice AI addresses this challenge by preserving and transferring caregiver knowledge through AI-assisted behavioural intelligence.

---

# 🚀 Key Features

## 👶 Child Profile Management
- Create and manage child profiles
- Store personalized behavioural information

## 🧠 Behaviour Dictionary
- Record behavioural observations
- Map behaviours to specific needs
- Confidence-based entries

## 🤖 Explainable Prediction Engine
- Rule-based behavioural prediction
- Transparent confidence scoring
- Behaviour history analysis
- Caregiver feedback loop

## 📘 Communication Passport
- Portable behavioural profile
- PDF export
- Hospital-ready format
- QR/shareable access

## 📊 Analytics Dashboard
- Behaviour trends
- Need distribution
- Confidence analysis
- Timeline visualization

## 🏥 Hospital Sharing
- Secure caregiver-to-hospital sharing
- Faster understanding of child behaviour
- Improved continuity of care

---

# 🏗️ System Architecture

```
                React + Vite Frontend
                        │
                 REST API Requests
                        │
                FastAPI Backend
                        │
          Rule-Based Prediction Engine
                        │
                 SQLite Database
                        │
 Behaviour Dictionary • Passport • Analytics
```

---

# 💻 Technology Stack

## Frontend
- React.js
- Vite
- JavaScript
- CSS
- Axios

## Backend
- FastAPI
- Python
- SQLAlchemy
- Pydantic

## Database
- SQLite

## Deployment
- Vercel
- Render

---

# 📸 Screenshots

> Replace these with actual screenshots.

### Dashboard

![Dashboard](docs/dashboard.png)

### Behaviour Dictionary

![Dictionary](docs/dictionary.png)

### Communication Passport

![Passport](docs/passport.png)

### Analytics Dashboard

![Analytics](docs/analytics.png)

---

# 🌐 Live Demo

### Frontend

https://neuro-voice-three.vercel.app/

### Backend API

https://neurovoice-ai-complete-neurovoice-backend.onrender.com/docs

### GitHub Repository

https://github.com/Team-PowerHouse/NeuroVoice

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/Team-PowerHouse/NeuroVoice.git
```

---

## Frontend

```bash
cd NeuroVoice_AI_Complete/frontend

npm install

npm run dev
```

---

## Backend

```bash
cd NeuroVoice_AI_Complete/neurovoice_backend

pip install -r requirements.txt

uvicorn app:app --reload
```

---

# 📂 Project Structure

```
NeuroVoice_AI_Complete
│
├── frontend
│   ├── src
│   ├── public
│   └── package.json
│
├── neurovoice_backend
│   ├── routers
│   ├── services
│   ├── uploads
│   ├── app.py
│   ├── database.py
│   ├── models.py
│   └── requirements.txt
│
└── README.md
```

---

# 🔄 Workflow

1. Caregiver creates child profile
2. Behaviour observations are recorded
3. Behaviours are labelled with needs
4. Behaviour Dictionary is built
5. Prediction engine analyses behaviour
6. Communication Passport is generated
7. Passport is shared with hospitals/schools
8. Better understanding and improved care

---

# 🎯 Current MVP

✅ React Frontend

✅ FastAPI Backend

✅ SQLite Database

✅ Child Profile Management

✅ Behaviour Dictionary

✅ Communication Passport

✅ PDF Export

✅ Analytics Dashboard

✅ Rule-Based Prediction Engine

✅ Hospital Sharing

---

# 🔮 Future Scope

- 🎥 MediaPipe Behaviour Detection
- 👁️ OpenCV Integration
- 🗣️ Text-to-Speech
- ⌚ Wearable Sensor Integration
- 📱 Android & iOS Apps
- ☁️ Cloud Deployment
- 🏥 Hospital EHR Integration
- 🤝 Federated Learning
- 🚑 Emergency Responder Support

---

# 🌍 Social Impact

NeuroVoice AI aims to improve the lives of:

- 👶 Non-verbal autistic children
- 👨‍👩‍👧 Parents & Caregivers
- 🏥 Hospitals
- 🧑‍⚕️ Doctors
- 🧑‍🏫 Therapists
- 🏫 Schools
- 🚑 Emergency Responders

By enabling personalized behavioural communication, the platform promotes dignity, inclusion, and continuity of care.

---

# 👥 Team PowerHouse

- **Haresh K**
- **Sukanth G M**
- **Athithya J M**

---

# 🏆 Hackathon Submission

Developed for:

- Samsung Solve for Tomorrow
- StartupTN AI for Social Impact Challenge

---

# 📄 License

This project is developed for educational, research, and hackathon purposes.

---

## ⭐ If you found this project interesting, please consider giving it a Star!
