# 배포 가이드 (Netlify)

## 1. 로컬에서 빌드 확인

```bash
npm install
npm run build
```

`dist` 폴더가 생성되면 빌드 성공입니다. `npm run preview` 로 로컬에서 확인할 수 있습니다.

---

## 2. Netlify로 배포하는 방법

### 방법 A: Netlify 웹사이트 + Git 연결 (추천)

1. [Netlify](https://app.netlify.com) 로그인
2. **Add new site** → **Import an existing project**
3. **GitHub / GitLab / Bitbucket** 연결 후 이 저장소 선택
4. 설정 확인:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions` (기본값)
5. **Deploy site** 클릭

이후 `main`(또는 선택한 브랜치)에 push할 때마다 자동 배포됩니다.

---

### 방법 B: Netlify CLI로 수동 배포

1. Netlify CLI 설치 (한 번만):

   ```bash
   npm install -g netlify-cli
   ```

2. 로그인:

   ```bash
   netlify login
   ```

3. 배포:

   ```bash
   npm run build
   netlify deploy --prod
   ```

   - **Create & configure a new site** 선택 후 팀/사이트 이름 설정
   - **Publish directory**에 `dist` 입력

---

### 방법 C: 드래그 앤 드롭 (함수 없이 정적 페이지만)

- [Netlify Drop](https://app.netlify.com/drop) 에서 `dist` 폴더를 끌어다 놓으면 배포됩니다.
- **단, 이 방법은 Netlify Functions(`school-info.js`)는 배포되지 않습니다.**  
  API는 프론트에서 CORS 프록시로 NEIS를 직접 호출하고 있으므로, Functions를 쓰지 않는다면 동작은 합니다.

---

## 3. 배포 후 확인

- 사이트 URL: `https://<사이트이름>.netlify.app`
- 학교 정보 확인·로그인 플로우가 정상 동작하는지 확인

## 4. 환경 변수 (필요한 경우)

API 키 등을 코드에 넣지 않고 쓰려면 Netlify 대시보드에서 **Site settings** → **Environment variables** 에 추가하고, 코드에서는 `import.meta.env.VITE_NEIS_API_KEY` 등으로 읽도록 변경할 수 있습니다. 현재는 코드에 키가 있어 그대로 두어도 배포 가능합니다.

### 학교 입장 비밀번호(4자리) 기능 사용 시

- **SUPABASE_SERVICE_ROLE_KEY**: Supabase 프로젝트의 **Service role** 키 (비밀키).  
  Netlify Function `school-password`에서 `school_passwords` 테이블을 읽고 쓸 때 사용합니다.  
  **Site settings** → **Environment variables** 에 추가해 주세요.
- Supabase SQL Editor에서 `sql/school_passwords.sql` 내용을 실행해 `school_passwords` 테이블을 생성해야 합니다.
- 개인정보 수집·이용 동의 기록을 사용하려면 `sql/consent_log.sql` 내용을 실행해 `consent_log` 테이블을 생성해야 합니다.

### 시스템 관리자 로그인 사용 시

- **ADMIN_NAME**: 시스템 관리자 입장 시 사용하는 학교명(관리자 식별용). 예: `클래스페이`
- **ADMIN_CODE**: 시스템 관리자 입장 시 사용하는 학교코드(관리자 식별용). 예: `class1234`  
  위 두 값을 Netlify **Site settings** → **Environment variables** 에 추가해 주세요.  
  관리자 여부는 서버(`admin-login`, `school-password` reset)에서만 검증하며, 클라이언트 코드에는 관리자 코드가 포함되지 않습니다.
