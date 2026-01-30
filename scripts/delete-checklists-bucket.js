/**
 * checklists 버킷과 그 안의 모든 파일을 한 번에 삭제하는 스크립트
 * 사용: npm run delete-checklists-bucket  (또는 프로젝트 루트에서 node scripts/delete-checklists-bucket.js)
 *
 * 실행 전 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정하세요.
 * (Service role 키는 절대 Git에 올리지 마세요.)
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const requireFromRoot = createRequire(path.join(projectRoot, 'package.json'));
const { createClient } = requireFromRoot('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정해 주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function deleteChecklistsBucket() {
  const bucketName = 'checklists';

  console.log(`"${bucketName}" 버킷 내 파일 삭제 중...`);
  const { error: emptyError } = await supabase.storage.emptyBucket(bucketName);
  if (emptyError) {
    console.error('파일 삭제 실패:', emptyError.message);
    process.exit(1);
  }

  console.log(`"${bucketName}" 버킷 삭제 중...`);
  const { error: deleteError } = await supabase.storage.deleteBucket(bucketName);
  if (deleteError) {
    console.error('버킷 삭제 실패:', deleteError.message);
    process.exit(1);
  }

  console.log(`"${bucketName}" 버킷과 내부 파일이 모두 삭제되었습니다.`);
}

deleteChecklistsBucket();
