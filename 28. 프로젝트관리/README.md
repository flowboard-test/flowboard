# FlowBoard - 프로젝트 관리 시스템

칸반 보드 + 업무 이관 워크플로우 기반 프로젝트 관리 도구

## 배포 방법

### 1단계: GitHub에 Push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/flowboard.git
git push -u origin main
```

### 2단계: 백엔드 배포 (Render.com)

1. https://render.com 가입 (GitHub 연동)
2. New → Web Service → GitHub 레포 선택
3. 설정:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/server.js`
   - Environment: Node
4. 환경변수 추가:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (자동생성 또는 임의 문자열)
5. Deploy 클릭
6. 배포 완료 후 URL 복사 (예: https://flowboard-api.onrender.com)

### 3단계: 프론트엔드 배포 (Vercel)

1. https://vercel.com 가입 (GitHub 연동)
2. New Project → GitHub 레포 선택
3. 설정:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy 클릭
5. 배포 완료 후 `vercel.json`의 API URL을 실제 Render URL로 수정

### 4단계: vercel.json 수정

`frontend/vercel.json`에서 백엔드 URL을 실제 Render 배포 URL로 변경:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR-RENDER-URL.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 로컬 실행

```bash
# 백엔드
cd backend
npm install
npm run dev

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 테스트 계정

| 이메일 | 비밀번호 | 이름 |
|--------|----------|------|
| admin@flowboard.dev | password123 | 관리자 |
| kim@flowboard.dev | password123 | 김기획 |
| lee@flowboard.dev | password123 | 이디자 |
| park@flowboard.dev | password123 | 박개발 |
| choi@flowboard.dev | password123 | 최테스 |
