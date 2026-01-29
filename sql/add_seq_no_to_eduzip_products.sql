-- eduzip_products 테이블에 연번(seq_no) 컬럼 추가
-- Supabase 대시보드 → SQL Editor → 새 쿼리 → 아래 한 줄 붙여넣기 → Run

ALTER TABLE eduzip_products
ADD COLUMN seq_no integer;
