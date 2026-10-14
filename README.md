# IIE Connect — Full Stack (React + Django REST API)

## Project Structure
```
iie_connect_fullstack/
├── backend/          # Django REST API
│   ├── IIE/          # Project config (settings, urls)
│   ├── connect/      # App (models, serializers, api_views)
│   ├── manage.py
│   └── requirements.txt
└── frontend/         # React (Vite)
    ├── src/
    │   ├── api/          # Axios client
    │   ├── components/   # Layout & common UI
    │   ├── context/      # Auth context
    │   ├── pages/        # Admin / Employee / Student / Counselor pages
    │   └── styles/       # Global CSS
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Backend Setup

### 1. Create virtualenv & install
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Database (MySQL)
In `IIE/settings.py` update:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'iie_connect',
        'USER': 'root',
        'PASSWORD': 'your_password',
        'HOST': '127.0.0.1',
        'PORT': '3306',
    }
}
```
> **Or use SQLite** (default, no config needed — already set for dev):
> `'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'`

### 3. Migrate & create superuser
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 4. Run backend
```bash
python manage.py runserver 8000
```
Local API base URL: `http://localhost:8000/api/`
Deployment API base URL: `https://iiepulse.indrainstitute.com/api/`

---

## Frontend Setup

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Run frontend
```bash
npm run dev
```
Opens at: `http://localhost:3000`

> By default, set `VITE_API_BASE_URL=https://iiepulse.indrainstitute.com/api` for deployment. Set `VITE_API_PROXY_TARGET=http://localhost:8000` when you want the dev server to use a local backend through the `/api/` and `/media/` proxy.

---

## Authentication

Login via: `POST /api/auth/login/`
```json
{
  "username": "admin",
  "password": "your_password",
  "user_type": "admin"   // "admin" | "employee" | "student"
}
```
Returns JWT access + refresh tokens.

---

## Role Portals

| Role | URL | Notes |
|------|-----|-------|
| Admin | `/admin` | Superuser / Django staff |
| Trainer/Mentor | `/employee` | Employee with trainer/mentor designation |
| Counselor | `/counselor` | Employee with counselor designation |
| Student | `/student` | Students model user |

---

## Key API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/login/` | Login (returns JWT) |
| POST | `/api/auth/logout/` | Logout (blacklists token) |
| GET | `/api/dashboard/admin/` | Admin dashboard stats |
| GET/POST | `/api/students/` | List / create students |
| GET/POST | `/api/employees/` | List / create employees |
| GET/POST | `/api/courses/` | List / create courses |
| GET/POST | `/api/batches/` | List / create batches |
| POST | `/api/attendance/mark/` | Mark attendance |
| POST | `/api/materials/upload/` | Upload study material |
| POST | `/api/quiz/upload/` | Upload quiz (CSV) |
| GET | `/api/quiz/` | List quizzes |
| POST | `/api/quiz/{id}/take/` | Submit quiz answers |
| GET/POST | `/api/staff-leave/` | Staff leave requests |
| GET/POST | `/api/student-leave/` | Student leave requests |
| GET/POST | `/api/announcements/` | Announcements |

---

## CSV Quiz Format

Upload quizzes as CSV with these columns:
```
question,option_a,option_b,option_c,option_d,correct_answer,marks
"What is Python?","A language","A snake","A tool","A library","A",1
```

---

## Production Deployment

## QA Testing

Use the QA runner before local testing, before pushing to GitHub, before cPanel/VPS deployment, and before Play Store AAB builds.

Local code/build checks:
```powershell
python qa\run_qa.py --mode local
```

Local code/build checks plus running route checks:
```powershell
python qa\run_qa.py --mode local --live
```

Production domain smoke checks after deployment:
```powershell
python qa\run_qa.py --mode production --live
```

QA reports are saved under `qa/reports/`. The release checklist is in `qa/RELEASE_CHECKLIST.md`.

### Backend
1. Set `DEBUG = False` in settings.py
2. Set `ALLOWED_HOSTS = ['yourdomain.com']`
3. Generate new `SECRET_KEY`
4. Configure MySQL
5. `python manage.py collectstatic`
6. Use gunicorn + nginx

### Frontend
```bash
npm run build   # Outputs to dist/
```
Serve `dist/` via nginx or any static host.
