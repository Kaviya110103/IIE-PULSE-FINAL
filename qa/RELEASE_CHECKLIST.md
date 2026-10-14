# IIE Pulse QA And Release Checklist

Run this checklist before pushing to `IIE-PULSE-FINAL`, before cPanel/VPS deployment, and before Play Store AAB upload.

## 1. Local QA

Start backend and frontend locally, then run:

```powershell
python qa\run_qa.py --mode local --live
```

This verifies:

- Django system health
- Missing migrations
- React production build
- Mobile TypeScript and Expo config
- Public API routes that must load without login
- Protected routes that must reject unauthenticated access

## 2. Manual A-Z Flow

Use a fresh test student and confirm:

- Counselor can add student with branch, course, discount, actual fee
- Parallel course fee and batch assignment are correct
- Trainer can complete sessions and mark attendance
- Student can view batches, sessions, materials, quizzes/tests, fee bill, leave, profile
- Quiz/test upload, assignment, student submission, and mentor result view work
- Payment request, admin approval, bill PDF, and email delivery work
- Completion request, reassignment, and course completion report work
- Mobile app materials open inside the app
- Mobile app ZIP/image/text/PDF material viewing works

## 3. Production Domain QA

After changing config to production domain and deploying to cPanel/VPS:

```powershell
python qa\run_qa.py --mode production --live
```

Expected production domain:

- Web: `https://iiepulse.indrainstitute.com`
- API: `https://iiepulse.indrainstitute.com/api/`

## 4. cPanel/VPS SSH Deployment Guard

Before deployment:

- Confirm backend `.env` has `DJANGO_DEBUG=False`
- Confirm `DEPLOYMENT_DOMAIN=iiepulse.indrainstitute.com`
- Confirm allowed hosts include `iiepulse.indrainstitute.com`
- Confirm CSRF/CORS origins use HTTPS production URLs
- Run migrations on VPS
- Run `collectstatic`
- Restart backend service/process
- Upload latest frontend `dist/` to cPanel public web path
- Confirm `/api/news/`, `/api/gallery/`, `/api/awards/`, and `/api/course-types/` load

## 5. Play Store AAB Guard

Before AAB build:

- `MobileApp/app.json` version is higher than previous Play Store release
- Android `versionCode` is higher than previous release
- `MobileApp/eas.json` production build type is `app-bundle`
- Production API URL is HTTPS
- APK/dev-client smoke test is done for login, materials, tests, fee bill, and dashboard

Build:

```powershell
cd MobileApp
eas build -p android --profile production
```
