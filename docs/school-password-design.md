# 학교 비밀번호(4자리) 입장 설계

## 1. 요구사항 요약

- **담당 교사**가 최초 입장 시 해당 학교의 **비밀번호 4자리**를 설정한다.
- 같은 학교의 **담당 교사 / 일반 교사** 모두 입장 시 **동일한 4자리 비밀번호**를 입력해야 한다.
- 비밀번호가 설정되지 않은 학교는 **담당 교사만** 최초 입장 가능(설정 플로우); **일반 교사**는 "담당 교사가 먼저 설정해 주세요" 안내.

---

## 2. DB 스키마

### 2.1 테이블: `school_passwords`

| 컬럼           | 타입      | 설명 |
|----------------|-----------|------|
| `school_code`  | `text` PK | NEIS 학교코드 (대문자, 10자 이내) |
| `password_hash`| `text`    | 비밀번호 4자리의 해시 (bcrypt 등 권장) |
| `created_at`   | `timestamptz` | 최초 설정 시각 |

- **PK**: `school_code` (학교당 1개만 존재)
- 비밀번호는 **절대 평문 저장하지 않고** 해시만 저장 (DB 유출 시에도 4자리 노출 방지)

### 2.2 SQL (Supabase)

```sql
-- school_passwords 테이블 생성
CREATE TABLE IF NOT EXISTS school_passwords (
  school_code text PRIMARY KEY,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS 정책 (anon 키로 조회/삽입/수정 제한 가능)
-- 예: anon은 select만, 비밀번호 설정은 서비스 역할 또는 Netlify Function에서 처리
ALTER TABLE school_passwords ENABLE ROW LEVEL SECURITY;

-- 모든 사용자(anon)가 학교별로 비밀번호 존재 여부만 확인 가능 (hash는 노출 안 함)
CREATE POLICY "Allow read has_password for schools"
  ON school_passwords FOR SELECT
  USING (true);
-- 주의: SELECT 시 password_hash까지 반환되면 안 되므로, 실제로는 "비밀번호 존재 여부"만 쓰거나
-- Netlify Function 등 백엔드에서만 password_hash를 사용하는 것이 안전함.

-- 비밀번호 설정/변경은 서버(Netlify Function 또는 service_role)에서만 허용 권장.
```

- **보안**: 프론트에서 Supabase anon으로 `password_hash`를 직접 조회하지 않고, **비밀번호 설정**과 **비밀번호 검증**은 **Netlify Function**(또는 Supabase Edge Function)에서만 처리하는 구성을 권장합니다. (아래 API 설계 참고)

---

## 3. API 설계 (Netlify Functions 권장)

프론트는 `school_code`와 비밀번호(4자리)만 넘기고, **해시 저장 / 비교**는 서버에서만 수행합니다.

### 3.1 비밀번호 존재 여부

- **GET** `/api/school-password?school_code=XXX`
- **응답**: `{ "hasPassword": true }` 또는 `{ "hasPassword": false }`
- 용도: 입장 화면에서 "비밀번호 입력" vs "비밀번호 설정(담당 교사 전용)" 분기

### 3.2 비밀번호 설정 (담당 교사 최초 입장 시)

- **POST** `/api/school-password`
- **Body**: `{ "school_code": "B123456789", "password": "1234", "role": "manager" }`
- **로직**:
  - `role !== 'manager'` → 403
  - 해당 `school_code`에 이미 행이 있으면 → 409 "이미 설정됨" (변경은 별도 API)
  - `password` 길이 4, 숫자만 허용
  - bcrypt 등으로 해시 후 `school_passwords`에 insert
- **응답**: `{ "success": true }` 또는 에러 메시지

### 3.3 비밀번호 검증 (입장 시)

- **POST** `/api/school-password/verify`
- **Body**: `{ "school_code": "B123456789", "password": "1234" }`
- **로직**: DB에서 `password_hash` 조회 후 bcrypt compare
- **응답**: `{ "valid": true }` 또는 `{ "valid": false }`

- Supabase를 Netlify Function에서 쓰는 경우 **service_role** 키로 `school_passwords`를 읽고/쓰면 됩니다.

---

## 4. 입장 화면(MainPage) 플로우

### 4.1 현재 순서

1. 학교 검색(학교명) → 학교코드/학교명 자동 입력  
2. 역할 선택 (일반 교사 / 담당 교사)  
3. [입장하기] → NEIS 검증 후 해당 역할 페이지로 이동  

### 4.2 변경 후 순서

1. **학교 검색** → 학교코드/학교명 입력  
2. **역할 선택** (일반 교사 / 담당 교사)  
3. **[입장하기]** 클릭  
   - NEIS 검증(기존과 동일: `fetchSchoolInfo`, 학교명 일치 확인)  
   - 통과 후 → **비밀번호 단계**로 진행  

4. **비밀번호 단계** (NEIS 검증 성공 후)

   - **API 호출**: `GET /api/school-password?school_code=XXX` → `hasPassword`

   - **Case A: `hasPassword === false`**
     - **담당 교사**: 모달 표시  
       - 문구: "이 학교의 입장 비밀번호를 설정합니다. 4자리 숫자를 입력하세요."  
       - 입력 4자리 + 확인 4자리 (재입력)  
       - [설정 후 입장] → `POST /api/school-password` 호출 → 성공 시 해당 학교 담당 교사 페이지로 이동  
     - **일반 교사**: 에러 메시지  
       - "비밀번호가 아직 설정되지 않았습니다. 담당 교사가 먼저 입장해 비밀번호를 설정해 주세요."

   - **Case B: `hasPassword === true`**
     - **담당 교사 / 일반 교사 공통**: 모달 표시  
       - 문구: "학교 비밀번호 4자리를 입력하세요."  
       - 4자리 입력 후 [입장]  
       - `POST /api/school-password/verify` 호출 → `valid === true`이면 해당 역할 페이지로 이동, 아니면 "비밀번호가 일치하지 않습니다." 표시  

### 4.3 UI 요약

- **입장하기** 버튼은 기존처럼 "학교 검색 + 역할 선택" 후 한 번에 클릭.
- NEIS 검증 후에만 **비밀번호 입력/설정 모달**이 뜨도록 하면, 기존 화면 구조를 크게 바꾸지 않아도 됨.
- 모달 2종:
  - **비밀번호 설정 모달** (담당 교사, 해당 학교 최초): 4자리 입력 + 4자리 재입력, [설정 후 입장]
  - **비밀번호 입력 모달** (이미 설정된 학교): 4자리 입력, [입장]

---

## 5. 담당 교사 페이지에서의 "비밀번호 변경"

- **위치**: 담당 교사 전용 화면(ManagerPage) 상단 또는 설정 영역에 "학교 비밀번호 변경" 링크/버튼
- **동작**:
  - 현재 비밀번호 4자리 입력 → 새 비밀번호 4자리 + 재입력
  - **API**: `PUT /api/school-password` (Body: `school_code`, `current_password`, `new_password`)
  - 서버에서 `current_password` 검증 후 `new_password` 해시로 업데이트
- **권한**: 담당 교사만 접근 가능한 페이지이므로, `school_code`는 현재 입장한 학교로 고정해도 됨.

---

## 6. 구현 체크리스트

- [ ] **DB**: `school_passwords` 테이블 생성 (Supabase), RLS 정책
- [ ] **API**: Netlify Functions (또는 Supabase Edge Functions)
  - [ ] `GET /api/school-password` — hasPassword
  - [ ] `POST /api/school-password` — 설정 (담당 교사, 최초)
  - [ ] `POST /api/school-password/verify` — 검증
  - [ ] `PUT /api/school-password` — 변경 (담당 교사, 선택)
- [ ] **프론트 MainPage**
  - [ ] 입장하기 클릭 시 NEIS 검증 후 `GET /api/school-password` 호출
  - [ ] hasPassword false + 일반 교사 → 에러 메시지
  - [ ] hasPassword false + 담당 교사 → 비밀번호 설정 모달 → POST 설정 → 이동
  - [ ] hasPassword true → 비밀번호 입력 모달 → POST verify → 이동
- [ ] **프론트 ManagerPage**
  - [ ] "학교 비밀번호 변경" 버튼/메뉴 (선택)
  - [ ] 변경 모달 + PUT API 연동

---

## 7. 보안 참고

- 4자리 숫자만 허용해도 **해시 저장**을 권장 (레인보우 테이블 완화).
- Netlify Function에서만 `password_hash`를 읽고 쓰고, 프론트에는 `hasPassword`와 검증 결과만 내려주는 구성을 권장합니다.
- 필요하면 rate limit(같은 학교 코드에 대한 연속 검증 실패 제한)을 Netlify Function에 추가할 수 있습니다.
