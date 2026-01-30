-- 학교 입장 비밀번호(4자리) 테이블
-- 담당 교사가 최초 입장 시 설정, 같은 학교 담당/일반 교사가 동일 비밀번호로 입장

CREATE TABLE IF NOT EXISTS school_passwords (
  school_code text PRIMARY KEY,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE school_passwords IS '학교별 입장 비밀번호(4자리) - 해시만 저장';
COMMENT ON COLUMN school_passwords.school_code IS 'NEIS 학교코드 (대문자)';
COMMENT ON COLUMN school_passwords.password_hash IS 'bcrypt 해시';
COMMENT ON COLUMN school_passwords.created_at IS '최초 설정 시각';

-- RLS: anon은 접근 불가. 비밀번호 조회/설정/검증은 Netlify Function(service_role)에서만 수행.
ALTER TABLE school_passwords ENABLE ROW LEVEL SECURITY;

-- anon 정책 없음 → anon 사용자는 SELECT/INSERT/UPDATE 불가
-- service_role은 RLS를 우회하므로 Netlify Function에서 service_role 키로 사용 가능
