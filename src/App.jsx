import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Trash2,
  Edit3,
  Download,
  Save,
  X,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ============================================
// Supabase 클라이언트 설정
// ============================================

const supabaseUrl = 'https://yrywezxcnoglkpsloynu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyeXdlenhjbm9nbGtwc2xveW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODMxOTYsImV4cCI6MjA4NTE1OTE5Nn0.0pIUdNXRFrqJSDm8Ponhp39L5GKhZn35Q55ItH7Dct4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// [서식2] 체크리스트 웹하드 링크
const FORM2_WEBHARD_URL = 'https://works.do/xfWoVL3';

// 체크리스트 파일 스토리지 버킷 (Supabase Storage)
const CHECKLIST_BUCKET = 'checklists';

// ============================================
// Supabase API 함수들
// ============================================

// 연번으로 체크리스트 파일 다운로드 (hwpx → hwp → zip → pdf 순으로 시도)
const downloadChecklistFile = async (seqNo) => {
  for (const ext of ['hwpx', 'hwp', 'zip', 'pdf']) {
    const path = `${seqNo}.${ext}`;
    const { data, error } = await supabase.storage.from(CHECKLIST_BUCKET).download(path);
    if (!error && data) return { blob: data, ext };
  }
  return null;
};

// 에듀집 제품 목록 조회
const fetchEduzipProducts = async () => {
  const { data, error } = await supabase
    .from('eduzip_products')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('에듀집 제품 조회 오류:', error);
    return [];
  }
  
  // criteria 배열로 변환 (seq_no: 연번 → 체크리스트 파일명 매핑용, 예: 1 → 1.hwp / 1.zip / 1.pdf)
  return data.map(item => ({
    id: item.id,
    seqNo: item.seq_no,
    name: item.name,
    provider: item.provider,
    type: item.type,
    criteria: [
      item.criteria_1_1,
      item.criteria_1_2,
      item.criteria_1_3,
      item.criteria_2_1,
      item.criteria_3_1,
      item.criteria_4_1,
      item.criteria_5_1,
      item.criteria_5_2,
      item.criteria_5_3
    ]
  }));
};

// 필수기준 충족 여부 판단 (미충족이 하나라도 있으면 X)
const checkCriteriaPassed = (criteria) => {
  if (!criteria || criteria.every(c => !c)) return null; // 에듀집 미등록 제품
  return !criteria.includes('미충족');
};

// 수요조사 목록 조회
const fetchSurveyData = async (schoolCode) => {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('school_code', schoolCode)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('수요조사 조회 오류:', error);
    return [];
  }
  
  return data.map(item => ({
    id: item.id,
    schoolCode: item.school_code,
    teacherName: item.teacher_name,
    subject: item.subject,
    productName: item.product_name,
    purpose: item.purpose,
    hasPersonalInfo: item.has_personal_info,
    isInEduzip: item.is_in_eduzip,
    createdAt: item.created_at?.split('T')[0]
  }));
};

// 수요조사 제출
const submitSurvey = async (data) => {
  const { data: result, error } = await supabase
    .from('surveys')
    .insert({
      school_code: data.schoolCode,
      teacher_name: data.teacherName,
      subject: data.subject,
      product_name: data.productName,
      purpose: data.purpose,
      has_personal_info: data.hasPersonalInfo,
      is_in_eduzip: data.isInEduzip
    })
    .select()
    .single();
  
  if (error) {
    console.error('수요조사 제출 오류:', error);
    return { success: false };
  }
  
  return { success: true, id: result.id };
};

// 수요조사 수정
const updateSurvey = async (id, data) => {
  const { error } = await supabase
    .from('surveys')
    .update({
      teacher_name: data.teacherName,
      subject: data.subject,
      product_name: data.productName,
      purpose: data.purpose,
      has_personal_info: data.hasPersonalInfo === 'yes',
      is_in_eduzip: data.isInEduzip === 'yes'
    })
    .eq('id', id);
  
  if (error) {
    console.error('수요조사 수정 오류:', error);
    return { success: false };
  }
  
  return { success: true };
};

// 수요조사 삭제
const deleteSurvey = async (id) => {
  const { error } = await supabase
    .from('surveys')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('수요조사 삭제 오류:', error);
    return { success: false };
  }
  
  return { success: true };
};

// 선정이유 목록 조회
const fetchSelectionReasons = async (productName) => {
  const { data, error } = await supabase
    .from('selection_reasons')
    .select('*')
    .eq('product_name', productName)
    .order('use_count', { ascending: false });
  
  if (error) {
    console.error('선정이유 조회 오류:', error);
    return [];
  }
  
  return data.map(item => ({
    id: item.id,
    productName: item.product_name,
    reason: item.reason,
    schoolCode: item.school_code,
    useCount: item.use_count,
    createdAt: item.created_at?.split('T')[0]
  }));
};

// 선정이유 저장
const saveSelectionReason = async (productName, reason, schoolCode) => {
  const { data, error } = await supabase
    .from('selection_reasons')
    .insert({
      product_name: productName,
      reason: reason,
      school_code: schoolCode,
      use_count: 1
    })
    .select()
    .single();
  
  if (error) {
    console.error('선정이유 저장 오류:', error);
    return { success: false };
  }
  
  return { success: true, id: data.id };
};

// 선정이유 사용횟수 증가
const incrementReasonUseCount = async (reasonId) => {
  const { data: current } = await supabase
    .from('selection_reasons')
    .select('use_count')
    .eq('id', reasonId)
    .single();
  
  const { error } = await supabase
    .from('selection_reasons')
    .update({ use_count: (current?.use_count || 0) + 1 })
    .eq('id', reasonId);
  
  if (error) {
    console.error('사용횟수 증가 오류:', error);
    return { success: false };
  }
  
  return { success: true };
};

// 제품명으로 타 학교 수요조사 데이터 조회 (사용과목, 주요용도)
const fetchSurveysByProduct = async (productName) => {
  const { data, error } = await supabase
    .from('surveys')
    .select('subject, purpose')
    .eq('product_name', productName)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('제품별 수요조사 조회 오류:', error);
    return [];
  }
  
  // 중복 제거하여 고유한 사용과목/주요용도 조합 반환
  const uniqueData = [];
  const seen = new Set();
  
  data.forEach(item => {
    const key = `${item.subject}||${item.purpose}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueData.push({
        subject: item.subject,
        purpose: item.purpose
      });
    }
  });

  // 제품별 상위 5개의 타학교 입력 데이터만 반환
  return uniqueData.slice(0, 5);
};

// ============================================
// 서식3 엑셀 다운로드
// ============================================

const exportForm3ToExcel = async (products, form3Data, eduzipProducts, schoolCode) => {
  // SheetJS 라이브러리 로드
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  const XLSX = window.XLSX;
  
  // 데이터 변환
  const worksheetData = [
    ['학년', '관련 교과', '기업명', '제품명', '필수 기준 충족', '선택 기준 충족', '선정이유'],
    ...products.map((product) => {
      const eduzipData = eduzipProducts.find(p => p.name === product.productName);
      const criteriaPassed = eduzipData ? checkCriteriaPassed(eduzipData.criteria) : null;
      const reasonData = form3Data[product.productName];
      
      return [
        '전학년', // 학년 (기본값)
        product.subjects.join(', '), // 관련 교과
        eduzipData?.provider || '-', // 기업명
        product.productName, // 제품명
        criteriaPassed === null ? '-' : (criteriaPassed ? '○' : 'X'), // 필수 기준
        '-', // 선택 기준 (학교 자율)
        reasonData?.reason || '' // 선정이유
      ];
    })
  ];
  
  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 8 },   // 학년
    { wch: 15 },  // 관련 교과
    { wch: 20 },  // 기업명
    { wch: 25 },  // 제품명
    { wch: 12 },  // 필수 기준
    { wch: 12 },  // 선택 기준
    { wch: 50 },  // 선정이유
  ];
  
  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '추천 소프트웨어 의견서');
  
  // 파일 다운로드
  const fileName = `서식3_추천의견서_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// ============================================
// 유틸리티 함수
// ============================================

const exportToExcel = async (data, schoolCode) => {
  // SheetJS 라이브러리 로드 (전역 스크립트 방식)
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  const XLSX = window.XLSX;
  
  // 데이터 변환
  const worksheetData = [
    ['번호', '신청교사', '사용 과목', '제품명', '에듀집 등록', '주요 용도', '학생 개인정보 여부', '신청일'],
    ...data.map((item, index) => [
      index + 1,
      item.teacherName,
      item.subject,
      item.productName,
      item.isInEduzip ? '등록' : '미등록',
      item.purpose,
      item.hasPersonalInfo ? '예' : '아니오',
      item.createdAt
    ])
  ];
  
  // 워크시트 생성
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // 컬럼 너비 설정
  worksheet['!cols'] = [
    { wch: 5 },   // 번호
    { wch: 10 },  // 신청교사
    { wch: 10 },  // 사용 과목
    { wch: 25 },  // 제품명
    { wch: 10 },  // 에듀집 등록
    { wch: 30 },  // 주요 용도
    { wch: 15 },  // 학생 개인정보 여부
    { wch: 12 },  // 신청일
  ];
  
  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '수요조사');
  
  // 파일 다운로드
  const fileName = `수요조사_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// ============================================
// 컴포넌트: 버튼
// ============================================

const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', icon: Icon }) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 disabled:bg-indigo-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus:ring-indigo-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-indigo-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// ============================================
// 컴포넌트: 입력 필드
// ============================================

const Input = ({ label, value, onChange, placeholder, type = 'text', required, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
    />
  </div>
);

// ============================================
// 컴포넌트: 선택 필드
// ============================================

const Select = ({ label, value, onChange, options, required, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// ============================================
// 컴포넌트: 텍스트 영역
// ============================================

const Textarea = ({ label, value, onChange, placeholder, required, rows = 3, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
    />
  </div>
);

// ============================================
// 컴포넌트: 카드
// ============================================

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

// ============================================
// 컴포넌트: 알림 메시지
// ============================================

const Alert = ({ type = 'success', message, onClose }) => {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
  };
  
  const Icon = icons[type];
  
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles[type]}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:opacity-70 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ============================================
// 페이지: 메인 (학교코드 입력 + 역할 선택)
// ============================================

// NEIS API 학교코드 형식: SD_SCHUL_CODE=7자리 숫자(예: 7010911), ATPT_OFCDC_SC_CODE=3자리(예: B10)
// 참고: https://github.com/my-school-info/neis-api
const NEIS_API_KEY = '2773b688e2d74b028faa01081f8c407d';
const NEIS_BASE = 'https://open.neis.go.kr/hub/schoolInfo';

const buildSchoolInfoUrl = (params) => {
  const search = new URLSearchParams({
    KEY: NEIS_API_KEY,
    Type: 'json',
    pIndex: '1',
    pSize: '100',
    ...params
  });
  return `${NEIS_BASE}?${search.toString()}`;
};

// 입력된 코드를 시도교육청코드(3자) + 표준학교코드(7자)로 파싱
const parseSchoolCodeInput = (input) => {
  const raw = String(input).trim().toUpperCase();
  if (/^[0-9]{7}$/.test(raw)) {
    return { sdSchulCode: raw }; // 7자리만: 표준학교코드만 사용
  }
  if (/^[A-Z][0-9]{9}$/.test(raw)) {
    return { atptOfcdcScCode: raw.slice(0, 3), sdSchulCode: raw.slice(3, 10) };
  }
  return null;
};

// 나이스 API로 학교 정보 조회 (Netlify Function 사용)
const fetchSchoolInfo = async (schoolCodeInput) => {
  const parsed = parseSchoolCodeInput(schoolCodeInput);
  if (!parsed) return { success: false };

  const params = new URLSearchParams({ SD_SCHUL_CODE: parsed.sdSchulCode });
  if (parsed.atptOfcdcScCode) params.append('ATPT_OFCDC_SC_CODE', parsed.atptOfcdcScCode);

  try {
    const response = await fetch(`/.netlify/functions/neis?${params.toString()}`);
    const data = await response.json();

    const head = data.schoolInfo?.[0]?.head;
    const result = Array.isArray(head) ? head[0] : head;
    if (result?.RESULT?.CODE && result.RESULT.CODE !== 'INFO-000') {
      console.warn('NEIS API 결과:', result.RESULT.CODE, result.RESULT.MESSAGE);
      return { success: false };
    }

    const row = data.schoolInfo?.[1]?.row;
    const list = Array.isArray(row) ? row : row ? [row] : [];
    const school = list[0];
    if (!school) return { success: false };

    return {
      success: true,
      schoolName: school.SCHUL_NM,
      address: school.ORG_RDNMA,
      schoolType: school.SCHUL_KND_SC_NM,
      sdSchulCode: school.SD_SCHUL_CODE,
      atptOfcdcScCode: school.ATPT_OFCDC_SC_CODE
    };
  } catch (error) {
    console.error('학교 정보 조회 오류:', error);
    return { success: false };
  }
};

// 학교명으로 검색해 API가 반환하는 학교코드 확인 (Netlify Function 사용)
const fetchSchoolListByName = async (schoolName) => {
  const params = new URLSearchParams({ SCHUL_NM: schoolName });
  try {
    const response = await fetch(`/.netlify/functions/neis?${params.toString()}`);
    const data = await response.json();
    const row = data.schoolInfo?.[1]?.row;
    const list = Array.isArray(row) ? row : row ? [row] : [];
    return list.map((s) => ({
      name: s.SCHUL_NM,
      sdSchulCode: s.SD_SCHUL_CODE,
      atptOfcdcScCode: s.ATPT_OFCDC_SC_CODE,
      fullCode: `${s.ATPT_OFCDC_SC_CODE}${s.SD_SCHUL_CODE}`,
      address: s.ORG_RDNMA
    }));
  } catch (e) {
    console.error('학교명 검색 오류:', e);
    return [];
  }
};

// 학교 비밀번호 API (Netlify Function)
const fetchSchoolPasswordStatus = async (schoolCode) => {
  try {
    const res = await fetch(`/.netlify/functions/school-password?school_code=${encodeURIComponent(schoolCode.trim().toUpperCase())}`);
    const data = await res.json();
    if (!res.ok) return { hasPassword: false };
    return { hasPassword: !!data.hasPassword };
  } catch (e) {
    console.error('학교 비밀번호 상태 조회 오류:', e);
    return { hasPassword: false };
  }
};

const setSchoolPassword = async (schoolCode, password, role) => {
  const res = await fetch('/.netlify/functions/school-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set', school_code: schoolCode.trim().toUpperCase(), password, role })
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || '설정 실패' };
  return { success: true };
};

const verifySchoolPassword = async (schoolCode, password) => {
  const res = await fetch('/.netlify/functions/school-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', school_code: schoolCode.trim().toUpperCase(), password })
  });
  const data = await res.json();
  if (!res.ok) return { valid: false, error: data.error };
  return { valid: !!data.valid, error: data.error };
};

const changeSchoolPassword = async (schoolCode, currentPassword, newPassword) => {
  const res = await fetch('/.netlify/functions/school-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      school_code: schoolCode.trim().toUpperCase(),
      current_password: currentPassword,
      new_password: newPassword
    })
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || '변경 실패' };
  return { success: data.success !== false, error: data.error };
};

const MainPage = ({ onNavigate }) => {
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [codeSearchName, setCodeSearchName] = useState('');
  const [codeSearchResults, setCodeSearchResults] = useState([]);
  const [codeSearchLoading, setCodeSearchLoading] = useState(false);
  const [codeSearchDone, setCodeSearchDone] = useState(false);
  // 비밀번호 단계: pendingEntry = { schoolCode, schoolName } (NEIS 검증 통과 후), 모달 표시용
  const [pendingEntry, setPendingEntry] = useState(null);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [showVerifyPasswordModal, setShowVerifyPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // 입장하기 (NEIS 검증 → 비밀번호 단계 → 페이지 이동)
  const handleSubmit = async () => {
    if (!schoolName.trim()) {
      setError('학교명을 입력해주세요.');
      return;
    }
    if (!schoolCode.trim()) {
      setError('NEIS 학교코드를 입력해주세요.');
      return;
    }
    if (!role) {
      setError('역할을 선택해주세요.');
      return;
    }
    
    const parsed = parseSchoolCodeInput(schoolCode);
    if (!parsed) {
      setError('올바른 NEIS 학교코드 형식이 아닙니다.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const info = await fetchSchoolInfo(schoolCode.trim());
    setIsLoading(false);
    
    if (!info.success) {
      setError('학교 정보를 찾을 수 없습니다. 학교코드를 확인해주세요.');
      return;
    }
    
    const inputName = schoolName.replace(/\s/g, '').toLowerCase();
    const apiName = info.schoolName.replace(/\s/g, '').toLowerCase();
    if (!apiName.includes(inputName) && !inputName.includes(apiName)) {
      setError(`입력하신 학교명과 일치하지 않습니다. (실제: ${info.schoolName})`);
      return;
    }
    
    const code = schoolCode.trim().toUpperCase();
    const status = await fetchSchoolPasswordStatus(code);
    
    if (!status.hasPassword) {
      if (role === 'teacher') {
        setError('비밀번호가 아직 설정되지 않았습니다. 담당 교사가 먼저 입장해 비밀번호를 설정해 주세요.');
        return;
      }
      setPendingEntry({ schoolCode: code, schoolName: info.schoolName });
      setPasswordInput('');
      setPasswordConfirm('');
      setPasswordError('');
      setShowSetPasswordModal(true);
      return;
    }
    
    setPendingEntry({ schoolCode: code, schoolName: info.schoolName });
    setPasswordInput('');
    setPasswordError('');
    setShowVerifyPasswordModal(true);
  };

  const doNavigate = () => {
    if (!pendingEntry || !role) return;
    if (role === 'teacher') {
      onNavigate('teacher', pendingEntry.schoolCode, pendingEntry.schoolName);
    } else {
      onNavigate('manager', pendingEntry.schoolCode, pendingEntry.schoolName);
    }
    setPendingEntry(null);
    setShowSetPasswordModal(false);
    setShowVerifyPasswordModal(false);
    setPasswordInput('');
    setPasswordConfirm('');
    setPasswordError('');
  };

  const handleSetPasswordConfirm = async () => {
    if (!/^\d{4}$/.test(passwordInput)) {
      setPasswordError('비밀번호는 숫자 4자리여야 합니다.');
      return;
    }
    if (passwordInput !== passwordConfirm) {
      setPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    const result = await setSchoolPassword(pendingEntry.schoolCode, passwordInput, 'manager');
    setPasswordLoading(false);
    if (result.success) {
      doNavigate();
    } else {
      setPasswordError(result.error || '설정에 실패했습니다.');
    }
  };

  const handleVerifyPasswordConfirm = async () => {
    if (!/^\d{4}$/.test(passwordInput)) {
      setPasswordError('비밀번호는 숫자 4자리여야 합니다.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    const result = await verifySchoolPassword(pendingEntry.schoolCode, passwordInput);
    setPasswordLoading(false);
    if (result.valid) {
      doNavigate();
    } else {
      setPasswordError(result.error || '비밀번호가 일치하지 않습니다.');
    }
  };

  const handleSearchCodeByName = async () => {
    const name = codeSearchName.trim();
    if (!name) return;
    setCodeSearchLoading(true);
    setCodeSearchResults([]);
    setCodeSearchDone(false);
    try {
      const list = await fetchSchoolListByName(name);
      setCodeSearchResults(list);
      setCodeSearchDone(true);
    } finally {
      setCodeSearchLoading(false);
    }
  };

  const applyCodeFromSearch = (school) => {
    setSchoolCode(school.fullCode);
    setSchoolName(school.name);
    setCodeSearchResults([]);
    setCodeSearchName('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <a
            href="https://class1234.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white mx-auto mb-4 cursor-pointer transition-transform duration-200 hover:scale-110 hover:shadow-md active:scale-95"
          >
            <img src="/logo.png" alt="로고" className="w-16 h-16 object-contain pointer-events-none" />
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">학습지원 소프트웨어</h1>
          <p className="text-slate-600 mb-4">수요조사 및 심의자료 생성 시스템</p>
          <a
            href="/classpay"
            download="2026학년도 학습지원 소프트웨어 교육자료 선정 계획(안).hwp"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4 shrink-0" />
            심의자료 서식
          </a>
        </div>
        
        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError('')} />
          </div>
        )}
        
        <div className="space-y-4">
          {/* 1. 학교명으로 NEIS 코드 조회 (맨 위) */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm font-medium text-indigo-900 mb-3">🔍 학교 검색</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeSearchName}
                onChange={(e) => setCodeSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchCodeByName()}
                placeholder="학교명 입력 (예: 상명초등학교)"
                className="flex-1 px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSearchCodeByName}
                disabled={codeSearchLoading}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {codeSearchLoading ? '조회 중...' : '조회'}
              </button>
            </div>
            {codeSearchResults.length > 0 && (
              <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {codeSearchResults.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 bg-white p-3 rounded-lg border border-indigo-200">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 truncate">{s.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyCodeFromSearch(s)}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shrink-0"
                    >
                      사용
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {codeSearchDone && codeSearchResults.length === 0 && codeSearchName.trim() && (
              <p className="mt-2 text-sm text-indigo-700">검색 결과가 없습니다.</p>
            )}
          </div>

          {/* 2. 학교명 입력 (자동 입력됨) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              학교명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="위에서 학교를 검색하세요"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          {/* 3. 학교코드 입력 (자동 입력됨) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              학교코드 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
              placeholder="위에서 학교를 검색하세요"
              maxLength={10}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 font-mono"
            />
          </div>
          
          {/* 5. 역할 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              역할 선택 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole('teacher')}
                className={`flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-4 rounded-lg border-2 transition-all duration-200 w-full min-w-0 ${
                  role === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  role === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <p className={`font-medium text-sm ${role === 'teacher' ? 'text-indigo-900' : 'text-slate-900'}`}>
                    일반 교사
                  </p>
                  <p className="text-xs text-slate-500">수요조사 참여</p>
                </div>
              </button>
              <button
                onClick={() => setRole('manager')}
                className={`flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-4 rounded-lg border-2 transition-all duration-200 w-full min-w-0 ${
                  role === 'manager'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  role === 'manager' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <p className={`font-medium text-sm ${role === 'manager' ? 'text-indigo-900' : 'text-slate-900'}`}>
                    담당 교사
                  </p>
                  <p className="text-xs text-slate-500">심의자료 생성</p>
                </div>
              </button>
            </div>
          </div>
          
          {/* 4. 입장하기 버튼 */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full mt-6"
            icon={ChevronRight}
          >
            {isLoading ? '확인 중...' : '입장하기'}
          </Button>
        </div>
      </Card>

      {/* 비밀번호 설정 모달 (담당 교사 최초 입장) */}
      {showSetPasswordModal && pendingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">학교 비밀번호 설정</h3>
            <p className="text-sm text-slate-600 mb-4">
              이 학교의 입장 비밀번호(4자리)를 설정합니다. 담당 교사·일반 교사 모두 동일한 비밀번호로 입장합니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 4자리</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 확인</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {passwordError && (
              <p className="mt-2 text-sm text-red-600">{passwordError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowSetPasswordModal(false); setPendingEntry(null); setPasswordError(''); }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <Button
                variant="primary"
                onClick={handleSetPasswordConfirm}
                disabled={passwordLoading}
                className="flex-1"
              >
                {passwordLoading ? '설정 중...' : '설정 후 입장'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 입력 모달 (이미 설정된 학교) */}
      {showVerifyPasswordModal && pendingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">학교 비밀번호 입력</h3>
            <p className="text-sm text-slate-600 mb-4">
              입장을 위해 학교 비밀번호 4자리를 입력하세요.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 4자리</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasswordConfirm()}
                placeholder="0000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {passwordError && (
              <p className="mt-2 text-sm text-red-600">{passwordError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowVerifyPasswordModal(false); setPendingEntry(null); setPasswordError(''); }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <Button
                variant="primary"
                onClick={handleVerifyPasswordConfirm}
                disabled={passwordLoading}
                className="flex-1"
              >
                {passwordLoading ? '확인 중...' : '입장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 페이지: 일반 교사 (수요조사 참여)
// ============================================

const TeacherPage = ({ schoolCode, schoolName, onBack }) => {
  const [formData, setFormData] = useState({
    teacherName: '',
    subject: '',
    productName: '',
    purpose: '',
    hasPersonalInfo: '',
    isInEduzip: false,
    selectedSeqNo: null, // 에듀집 제품 선택 시 연번(seq_no) 표시용
  });
  const [submissions, setSubmissions] = useState([]);
  const [alert, setAlert] = useState(null);
  
  // 에듀집 제품 검색 관련 상태
  const [eduzipProducts, setEduzipProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // 에듀집 제품 목록 로드
  useEffect(() => {
    const loadProducts = async () => {
      const products = await fetchEduzipProducts();
      setEduzipProducts(products);
    };
    loadProducts();
  }, []);
  
  // 제품 검색 필터링
  useEffect(() => {
    if (productSearch.trim()) {
      const filtered = eduzipProducts.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.provider.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, eduzipProducts]);
  
  const personalInfoOptions = [
    { value: '', label: '선택하세요' },
    { value: 'yes', label: '예 (학생 ID, 학습이력 등 포함)' },
    { value: 'no', label: '아니오' },
  ];
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // 에듀집 제품 선택 핸들러
  const handleProductSelect = (product) => {
    setFormData(prev => ({ 
      ...prev, 
      productName: product.name,
      isInEduzip: true,
      selectedSeqNo: product.seqNo ?? null
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
  };
  
  // 제품명 직접 입력 핸들러
  const handleProductInputChange = (value) => {
    setProductSearch(value);
    setShowProductDropdown(true);
    
    // 에듀집 목록에 있는지 확인 및 연번 매칭
    const matched = eduzipProducts.find(p => 
      p.name.toLowerCase() === value.toLowerCase()
    );
    
    setFormData(prev => ({ 
      ...prev, 
      productName: value,
      isInEduzip: !!matched,
      selectedSeqNo: matched ? (matched.seqNo ?? null) : null
    }));
  };
  
  // 제품명 입력 완료 핸들러 (blur 시)
  const handleProductInputBlur = () => {
    // 약간의 딜레이를 주어 클릭 이벤트가 먼저 처리되도록 함
    setTimeout(() => {
      setShowProductDropdown(false);
    }, 200);
  };
  
  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.teacherName || !formData.subject || !formData.productName || !formData.purpose || !formData.hasPersonalInfo) {
      setAlert({ type: 'error', message: '모든 필수 항목을 입력해주세요.' });
      return;
    }
    
    const newSubmission = {
      schoolCode,
      teacherName: formData.teacherName,
      subject: formData.subject,
      productName: formData.productName,
      purpose: formData.purpose,
      hasPersonalInfo: formData.hasPersonalInfo === 'yes',
      isInEduzip: formData.isInEduzip,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    const result = await submitSurvey(newSubmission);
    
    if (result.success) {
      setSubmissions(prev => [...prev, { ...newSubmission, id: result.id }]);
      setFormData({
        teacherName: formData.teacherName, // 이름은 유지
        subject: formData.subject, // 과목도 유지
        productName: '',
        purpose: '',
        hasPersonalInfo: '',
        isInEduzip: false,
        selectedSeqNo: null,
      });
      setProductSearch(''); // 제품 검색 초기화
      setAlert({ type: 'success', message: '수요조사가 제출되었습니다. 추가 제품을 신청하실 수 있습니다.' });
    } else {
      setAlert({ type: 'error', message: '제출 중 오류가 발생했습니다. 다시 시도해주세요.' });
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{schoolName}</h1>
            <p className="text-sm text-slate-500">수요조사 참여</p>
          </div>
        </div>
      </header>
      
      {/* 본문 */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {alert && (
          <div className="mb-6">
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          </div>
        )}
        
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">에듀테크 제품 수요조사</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="신청교사명"
                value={formData.teacherName}
                onChange={(v) => handleInputChange('teacherName', v)}
                placeholder="예: 김교사"
                required
              />
              <Input
                label="사용 과목"
                value={formData.subject}
                onChange={(v) => handleInputChange('subject', v)}
                placeholder="예: 영어, 수학, 전교과 등"
                required
              />
            </div>
            
            {/* 제품명 입력 (에듀집 검색) */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                제품명 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => handleProductInputChange(e.target.value)}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={handleProductInputBlur}
                  placeholder="에듀집 제품 검색 또는 직접 입력"
                  className={`w-full px-3 py-2 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 pr-24 ${
                    formData.productName && !formData.isInEduzip 
                      ? 'border-amber-400 bg-amber-50' 
                      : formData.productName && formData.isInEduzip
                      ? 'border-green-400 bg-green-50'
                      : 'border-slate-300'
                  }`}
                />
                {formData.productName && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded ${
                    formData.isInEduzip 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {formData.isInEduzip
                      ? (formData.selectedSeqNo != null ? `에듀집 등록 (연번: ${formData.selectedSeqNo})` : '에듀집 등록')
                      : '미등록 제품'}
                  </span>
                )}
              </div>
              
              {/* 검색 결과 드롭다운 */}
              {showProductDropdown && productSearch && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    <>
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">에듀집 등록 제품</p>
                      </div>
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <p className="font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{product.provider} · {product.type}</p>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">에듀집에 등록되지 않은 제품입니다.</p>
                      <p className="text-xs text-slate-400 mt-1">그대로 입력하시면 '미등록 제품'으로 신청됩니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 주요 용도 (30자 제한) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                주요 용도 <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-2">({formData.purpose.length}/30자)</span>
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value.slice(0, 30))}
                placeholder="예: 학생 영작문 피드백 및 교정"
                maxLength={30}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <Select
              label="학생 개인정보(학생계정) 포함 여부"
              value={formData.hasPersonalInfo}
              onChange={(v) => handleInputChange('hasPersonalInfo', v)}
              options={personalInfoOptions}
              required
            />
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              className="w-full"
              icon={Plus}
            >
              수요조사 제출하기
            </Button>
          </div>
        </Card>
        
        {/* 제출 내역 */}
        {submissions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              이번 세션 제출 내역 ({submissions.length}건)
            </h3>
            <div className="space-y-3">
              {submissions.map((item, index) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-sm text-slate-600 mt-1">{item.purpose}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded">
                          {item.subject}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.hasPersonalInfo 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          개인정보 {item.hasPersonalInfo ? '포함' : '미포함'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.isInEduzip 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isInEduzip ? '에듀집 등록' : '미등록 제품'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">#{index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

// ============================================
// 페이지: 담당 교사 (수요조사 관리)
// ============================================

const ManagerPage = ({ schoolCode, schoolName, onBack }) => {
  const [surveys, setSurveys] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [alert, setAlert] = useState(null);
  
  // 탭 관리
  const [activeTab, setActiveTab] = useState('survey'); // 'survey' | 'form2' | 'form3'
  
  // 서식3 관련 상태
  const [eduzipProducts, setEduzipProducts] = useState([]);
  const [form3Data, setForm3Data] = useState({}); // { productName: { reason: '', selectedReasonId: null } }
  const [reasonsCache, setReasonsCache] = useState({}); // { productName: [reasons] }
  
  // 수요조사 추가 관련 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    teacherName: '',
    subject: '',
    productName: '',
    purpose: '',
    hasPersonalInfo: '',
    isInEduzip: false,
    selectedSeqNo: null, // 에듀집 제품 선택 시 연번(seq_no) 표시용
  });
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // 타 학교 데이터 관련 상태
  const [otherSchoolData, setOtherSchoolData] = useState([]);
  const [otherSchoolDataLoading, setOtherSchoolDataLoading] = useState(false);
  
  // 선정이유 더보기 상태
  const [expandedReasons, setExpandedReasons] = useState({});
  
  // [서식2] 에듀집 등록 체크리스트 안내 모달
  const [showChecklistGuideModal, setShowChecklistGuideModal] = useState(false);
  const [checklistStorageCount, setChecklistStorageCount] = useState(null); // 모달에서 표시할 스토리지 체크리스트 개수
  
  // 학교 비밀번호 변경 모달
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changeCurrentPw, setChangeCurrentPw] = useState('');
  const [changeNewPw, setChangeNewPw] = useState('');
  const [changeNewPwConfirm, setChangeNewPwConfirm] = useState('');
  const [changePwError, setChangePwError] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  
  // 모달 열릴 때 스토리지 체크리스트 개수 조회
  useEffect(() => {
    if (!showChecklistGuideModal) return;
    setChecklistStorageCount(null);
    const fetchCount = async () => {
      const { data, error } = await supabase.storage.from(CHECKLIST_BUCKET).list('', { limit: 1000 });
      if (!error && Array.isArray(data)) setChecklistStorageCount(data.length);
    };
    fetchCount();
  }, [showChecklistGuideModal]);
  
  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchSurveyData(schoolCode);
      setSurveys(data);
      
      const products = await fetchEduzipProducts();
      setEduzipProducts(products);
    };
    loadData();
  }, [schoolCode]);
  
  // 제품 검색 필터링 (추가 폼용)
  useEffect(() => {
    if (productSearch.trim()) {
      const filtered = eduzipProducts.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.provider.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, eduzipProducts]);
  
  // 수요조사 추가 - 제품 선택 핸들러
  const handleAddProductSelect = async (product) => {
    setAddFormData(prev => ({ 
      ...prev, 
      productName: product.name,
      isInEduzip: true,
      selectedSeqNo: product.seqNo ?? null,
      subject: '',
      purpose: ''
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
    
    // 타 학교 데이터 로드
    setOtherSchoolDataLoading(true);
    const data = await fetchSurveysByProduct(product.name);
    setOtherSchoolData(data);
    setOtherSchoolDataLoading(false);
  };
  
  // 수요조사 추가 - 제품명 직접 입력 핸들러
  const handleAddProductInputChange = async (value) => {
    setProductSearch(value);
    setShowProductDropdown(true);
    
    const matched = eduzipProducts.find(p => 
      p.name.toLowerCase() === value.toLowerCase()
    );
    
    setAddFormData(prev => ({ 
      ...prev, 
      productName: value,
      isInEduzip: !!matched,
      selectedSeqNo: matched ? (matched.seqNo ?? null) : null
    }));
    
    // 타 학교 데이터 초기화
    setOtherSchoolData([]);
  };
  
  // 타 학교 데이터 선택 핸들러
  const handleSelectOtherSchoolData = (item) => {
    setAddFormData(prev => ({
      ...prev,
      subject: item.subject,
      purpose: item.purpose
    }));
  };
  
  // 수요조사 추가 - 제출 핸들러
  const handleAddSubmit = async () => {
    if (!addFormData.teacherName || !addFormData.subject || !addFormData.productName || !addFormData.purpose || !addFormData.hasPersonalInfo) {
      setAlert({ type: 'error', message: '모든 필수 항목을 입력해주세요.' });
      return;
    }
    
    const newSubmission = {
      schoolCode,
      teacherName: addFormData.teacherName,
      subject: addFormData.subject,
      productName: addFormData.productName,
      purpose: addFormData.purpose,
      hasPersonalInfo: addFormData.hasPersonalInfo === 'yes',
      isInEduzip: addFormData.isInEduzip,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    const result = await submitSurvey(newSubmission);
    
    if (result.success) {
      setSurveys(prev => [{ ...newSubmission, id: result.id }, ...prev]);
      // 신청교사명은 유지하고 나머지만 초기화
      setAddFormData(prev => ({
        teacherName: prev.teacherName,
        subject: '',
        productName: '',
        purpose: '',
        hasPersonalInfo: '',
        isInEduzip: false,
        selectedSeqNo: null,
      }));
      setProductSearch('');
      setOtherSchoolData([]);
      // showAddForm은 유지 (계속 추가할 수 있도록)
      setAlert({ type: 'success', message: '수요조사가 추가되었습니다.' });
    } else {
      setAlert({ type: 'error', message: '추가 중 오류가 발생했습니다.' });
    }
  };
  
  // 제품별 선정이유 로드
  const loadReasons = async (productName) => {
    if (!reasonsCache[productName]) {
      const reasons = await fetchSelectionReasons(productName);
      setReasonsCache(prev => ({ ...prev, [productName]: reasons }));
    }
  };
  
  // 수요조사에서 고유 제품 목록 추출
  const getUniqueProducts = () => {
    const productMap = new Map();
    surveys.forEach(s => {
      if (!productMap.has(s.productName)) {
        const eduzipProduct = eduzipProducts.find(p => p.name === s.productName);
        productMap.set(s.productName, {
          productName: s.productName,
          subjects: [s.subject],
          eduzipData: eduzipProduct || null,
          isInEduzip: s.isInEduzip
        });
      } else {
        const existing = productMap.get(s.productName);
        if (!existing.subjects.includes(s.subject)) {
          existing.subjects.push(s.subject);
        }
      }
    });
    return Array.from(productMap.values());
  };
  
  // 선정이유 선택/입력 핸들러
  const handleReasonSelect = async (productName, reasonId, reasonText) => {
    setForm3Data(prev => ({
      ...prev,
      [productName]: { reason: reasonText, selectedReasonId: reasonId }
    }));
    
    // 기존 선정이유 선택 시 사용횟수 증가
    if (reasonId) {
      await incrementReasonUseCount(reasonId);
    }
  };
  
  const handleReasonInput = (productName, reasonText) => {
    setForm3Data(prev => ({
      ...prev,
      [productName]: { reason: reasonText, selectedReasonId: null }
    }));
  };
  
  // 선정이유 저장 (직접 작성한 경우)
  const handleSaveReason = async (productName) => {
    const data = form3Data[productName];
    if (data && data.reason && !data.selectedReasonId) {
      const result = await saveSelectionReason(productName, data.reason, schoolCode);
      if (result.success) {
        setAlert({ type: 'success', message: '선정이유가 저장되었습니다.' });
        // 캐시 갱신
        setReasonsCache(prev => ({ ...prev, [productName]: undefined }));
      } else {
        setAlert({ type: 'error', message: '선정이유 저장 중 오류가 발생했습니다.' });
      }
    }
  };
  
  // 서식3 엑셀 다운로드
  const handleExportForm3 = async () => {
    const uniqueProducts = getUniqueProducts();
    
    // 모든 제품에 선정이유가 입력되었는지 확인
    const missingReasons = uniqueProducts.filter(p => !form3Data[p.productName]?.reason);
    if (missingReasons.length > 0) {
      setAlert({ type: 'error', message: `선정이유를 모두 입력해주세요. (미입력: ${missingReasons.map(p => p.productName).join(', ')})` });
      return;
    }
    
    try {
      await exportForm3ToExcel(uniqueProducts, form3Data, eduzipProducts, schoolCode);
      setAlert({ type: 'success', message: '[서식3] 엑셀 파일이 다운로드되었습니다.' });
    } catch (error) {
      setAlert({ type: 'error', message: '엑셀 다운로드 중 오류가 발생했습니다.' });
    }
  };
  
  // 체크리스트 일괄 다운로드 (선정이유 작성된 제품만, .hwpx → .hwp → .zip → .pdf 순으로 시도)
  const handleDownloadChecklists = async () => {
    const productsWithReason = getUniqueProducts().filter(p => form3Data[p.productName]?.reason);
    if (productsWithReason.length === 0) {
      setAlert({ type: 'error', message: '선정이유가 입력된 제품이 없습니다. [서식3]에서 선정이유를 먼저 작성해주세요.' });
      return;
    }
    const productsWithSeqNo = productsWithReason.filter(p => p.eduzipData?.seqNo != null);
    if (productsWithSeqNo.length === 0) {
      setAlert({ type: 'error', message: '연번(seq_no)이 있는 제품이 없어 체크리스트를 받을 수 없습니다.' });
      return;
    }
    let downloaded = 0;
    const safeName = (name) => (name || '').replace(/[/\\:*?"<>|]/g, '_').trim() || 'checklist';
    try {
      for (const product of productsWithSeqNo) {
        const seqNo = product.eduzipData.seqNo;
        const result = await downloadChecklistFile(seqNo);
        if (result) {
          const url = URL.createObjectURL(result.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${safeName(product.productName)}_${seqNo}.${result.ext}`;
          a.click();
          URL.revokeObjectURL(url);
          downloaded++;
        }
      }
      if (downloaded > 0) {
        const skipped = productsWithSeqNo.length - downloaded;
        setAlert({
          type: 'success',
          message: skipped > 0
            ? `체크리스트 ${downloaded}개 다운로드되었습니다. (스토리지에 없는 파일 ${skipped}개)`
            : `체크리스트 ${downloaded}개 다운로드되었습니다.`
        });
      } else {
        setAlert({ type: 'error', message: '체크리스트 파일을 받지 못했습니다. 스토리지에 해당 연번 파일이 있는지 확인해주세요.' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: '체크리스트 다운로드 중 오류가 발생했습니다.' });
    }
  };
  
  const handleEdit = (survey) => {
    setEditingId(survey.id);
    setEditForm({
      teacherName: survey.teacherName,
      subject: survey.subject,
      productName: survey.productName,
      purpose: survey.purpose,
      hasPersonalInfo: survey.hasPersonalInfo ? 'yes' : 'no',
      isInEduzip: survey.isInEduzip ? 'yes' : 'no',
    });
  };
  
  const handleSaveEdit = async (id) => {
    const result = await updateSurvey(id, editForm);
    
    if (result.success) {
      setSurveys(prev => prev.map(s => 
        s.id === id 
          ? { 
              ...s, 
              teacherName: editForm.teacherName,
              subject: editForm.subject,
              productName: editForm.productName,
              purpose: editForm.purpose,
              hasPersonalInfo: editForm.hasPersonalInfo === 'yes',
              isInEduzip: editForm.isInEduzip === 'yes'
            }
          : s
      ));
      setEditingId(null);
      setEditForm({});
      setAlert({ type: 'success', message: '수정되었습니다.' });
    } else {
      setAlert({ type: 'error', message: '수정 중 오류가 발생했습니다.' });
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    const result = await deleteSurvey(id);
    
    if (result.success) {
      setSurveys(prev => prev.filter(s => s.id !== id));
      setAlert({ type: 'success', message: '삭제되었습니다.' });
    } else {
      setAlert({ type: 'error', message: '삭제 중 오류가 발생했습니다.' });
    }
  };
  
  const handleExport = async () => {
    try {
      await exportToExcel(surveys, schoolCode);
      setAlert({ type: 'success', message: '엑셀 파일이 다운로드되었습니다.' });
    } catch (error) {
      setAlert({ type: 'error', message: '엑셀 다운로드 중 오류가 발생했습니다.' });
    }
  };
  
  const handleChangePasswordConfirm = async () => {
    if (!/^\d{4}$/.test(changeCurrentPw) || !/^\d{4}$/.test(changeNewPw)) {
      setChangePwError('비밀번호는 숫자 4자리여야 합니다.');
      return;
    }
    if (changeNewPw !== changeNewPwConfirm) {
      setChangePwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setChangePwLoading(true);
    setChangePwError('');
    const result = await changeSchoolPassword(schoolCode, changeCurrentPw, changeNewPw);
    setChangePwLoading(false);
    if (result.success) {
      setShowChangePasswordModal(false);
      setChangeCurrentPw('');
      setChangeNewPw('');
      setChangeNewPwConfirm('');
      setAlert({ type: 'success', message: '학교 비밀번호가 변경되었습니다.' });
    } else {
      setChangePwError(result.error || '변경에 실패했습니다.');
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{schoolName}</h1>
                <p className="text-sm text-slate-500">수요조사 관리</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(true);
                    setChangeCurrentPw('');
                    setChangeNewPw('');
                    setChangeNewPwConfirm('');
                    setChangePwError('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 mt-0.5"
                >
                  학교 비밀번호 변경
                </button>
              </div>
            </div>
            {activeTab === 'survey' ? (
              <Button
                variant="primary"
                onClick={handleExport}
                icon={Download}
                disabled={surveys.length === 0}
              >
                [서식1] 엑셀 다운로드
              </Button>
            ) : activeTab === 'form2' ? null : (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleExportForm3}
                  icon={Download}
                  disabled={surveys.length === 0}
                >
                  [서식3] 엑셀 다운로드
                </Button>
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={handleDownloadChecklists}
                  disabled={!getUniqueProducts().some(p => form3Data[p.productName]?.reason && p.eduzipData?.seqNo != null)}
                >
                  체크리스트 일괄 다운로드
                </Button>
              </div>
            )}
          </div>
          
          {/* 탭 */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('survey')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'survey'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              [서식1] 수요조사 취합
            </button>
            <button
              onClick={() => setActiveTab('form2')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'form2'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              [서식2] 체크리스트
            </button>
            <button
              onClick={() => setActiveTab('form3')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'form3'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              [서식3] 의견서 작성
            </button>
          </div>
        </div>
      </header>
      
      {/* 본문 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {alert && (
          <div className="mb-6">
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          </div>
        )}
        
        {activeTab === 'survey' ? (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{surveys.length}</p>
                    <p className="text-sm text-slate-500">총 신청</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {surveys.filter(s => !s.isInEduzip).length}
                    </p>
                    <p className="text-sm text-slate-500">미등록 제품</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {surveys.filter(s => s.hasPersonalInfo).length}
                    </p>
                    <p className="text-sm text-slate-500">개인정보 포함</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {new Set(surveys.map(s => s.teacherName)).size}
                    </p>
                    <p className="text-sm text-slate-500">신청 교사</p>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* 수요조사 목록 */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">수요조사 목록</h2>
                <Button
                  variant={showAddForm ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  icon={showAddForm ? X : Plus}
                >
                  {showAddForm ? '취소' : '직접 추가'}
                </Button>
              </div>
              
              {/* 수요조사 추가 폼 */}
              {showAddForm && (
                <div className="p-4 bg-indigo-50 border-b border-indigo-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        신청교사명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addFormData.teacherName}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, teacherName: e.target.value }))}
                        placeholder="예: 김교사"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    
                    {/* 제품명 입력 (에듀집 검색) */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        제품명 <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => handleAddProductInputChange(e.target.value)}
                          onFocus={() => setShowProductDropdown(true)}
                          onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                          placeholder="에듀집 제품 검색 또는 직접 입력"
                          className={`w-full px-3 py-2 border rounded-lg text-sm pr-24 ${
                            addFormData.productName && !addFormData.isInEduzip 
                              ? 'border-amber-400 bg-amber-50' 
                              : addFormData.productName && addFormData.isInEduzip
                              ? 'border-green-400 bg-green-50'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                        {addFormData.productName && (
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded ${
                            addFormData.isInEduzip 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {addFormData.isInEduzip
                              ? (addFormData.selectedSeqNo != null ? `에듀집 등록 (연번: ${addFormData.selectedSeqNo})` : '에듀집 등록')
                              : '미등록'}
                          </span>
                        )}
                      </div>
                      
                      {showProductDropdown && productSearch && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleAddProductSelect(product)}
                                className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm border-b border-slate-100 last:border-b-0"
                              >
                                <p className="font-medium text-slate-900">{product.name}</p>
                                <p className="text-xs text-slate-500">{product.provider}</p>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-500">
                              에듀집 미등록 제품입니다
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* 타 학교 데이터 불러오기 */}
                    {addFormData.productName && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-xs font-medium text-slate-600 mb-2">
                          📋 타 학교 입력 데이터 불러오기 (사용과목 · 주요용도)
                        </p>
                        {otherSchoolDataLoading ? (
                          <p className="text-xs text-slate-500">불러오는 중...</p>
                        ) : otherSchoolData.length > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {otherSchoolData.map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectOtherSchoolData(item)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  addFormData.subject === item.subject && addFormData.purpose === item.purpose
                                    ? 'bg-indigo-100 border border-indigo-300'
                                    : 'bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                }`}
                              >
                                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700 shrink-0">사용과목</span>
                                    <span className="text-slate-800">{item.subject || '-'}</span>
                                  </span>
                                  <span className="text-slate-300 shrink-0">|</span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700 shrink-0">주요용도</span>
                                    <span className="text-slate-700">{item.purpose || '-'}</span>
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">이 제품에 대한 타 학교 데이터가 없습니다. 직접 입력해주세요.</p>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          사용 과목 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={addFormData.subject}
                          onChange={(e) => setAddFormData(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="예: 영어, 수학, 전교과 등"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          주요 용도 <span className="text-red-500">*</span>
                          <span className="text-slate-400 font-normal ml-2">({addFormData.purpose.length}/30자)</span>
                        </label>
                        <input
                          type="text"
                          value={addFormData.purpose}
                          onChange={(e) => setAddFormData(prev => ({ ...prev, purpose: e.target.value.slice(0, 30) }))}
                          placeholder="예: 학생 영작문 피드백 및 교정"
                          maxLength={30}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        학생 개인정보 포함 여부 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={addFormData.hasPersonalInfo}
                        onChange={(e) => setAddFormData(prev => ({ ...prev, hasPersonalInfo: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        <option value="">선택하세요</option>
                        <option value="yes">예</option>
                        <option value="no">아니오</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        onClick={handleAddSubmit}
                        icon={Plus}
                      >
                        수요조사 추가
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {surveys.length === 0 ? (
                <div className="p-12 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">아직 제출된 수요조사가 없습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          신청교사
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          사용 과목
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          제품명
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          에듀집
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          주요 용도
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          개인정보
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {surveys.map((survey) => (
                        <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                          {editingId === survey.id ? (
                            <>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.teacherName}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, teacherName: e.target.value }))}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.subject}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                  placeholder="예: 영어"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.productName}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, productName: e.target.value }))}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={editForm.isInEduzip}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, isInEduzip: e.target.value }))}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                >
                                  <option value="yes">등록</option>
                                  <option value="no">미등록</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.purpose}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, purpose: e.target.value.slice(0, 30) }))}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                  maxLength={30}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={editForm.hasPersonalInfo}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, hasPersonalInfo: e.target.value }))}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                >
                                  <option value="yes">예</option>
                                  <option value="no">아니오</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveEdit(survey.id)}
                                    icon={Save}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingId(null); setEditForm({}); }}
                                    icon={X}
                                  />
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{survey.teacherName}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                                  {survey.subject}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-900">{survey.productName}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  survey.isInEduzip
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {survey.isInEduzip ? '등록' : '미등록'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">{survey.purpose}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  survey.hasPersonalInfo
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {survey.hasPersonalInfo ? '예' : '아니오'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(survey)}
                                    icon={Edit3}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(survey.id)}
                                    icon={Trash2}
                                    className="text-red-600 hover:bg-red-50"
                                  />
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ) : activeTab === 'form2' ? (
          <>
            {/* 서식2 체크리스트 - 웹하드 링크 (iframe 제거: 임베드 시 401 콘솔 에러 무한 발생) */}
            <Card className="mb-6">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">[서식2] 체크리스트</h2>
                <p className="text-sm text-slate-500 mt-1">체크리스트는 웹하드에서 확인·관리합니다.</p>
              </div>
              <div className="p-8 text-center space-y-4">
                <p className="text-slate-600">에듀집 등록 제품은 [서식3]에서 일괄 다운로드할 수 있고, 미등록 제품 체크리스트는 웹하드에서 확인할 수 있습니다.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={FORM2_WEBHARD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 min-w-[240px] bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    에듀집 미등록 체크리스트
                  </a>
                  <Button
                    variant="primary"
                    icon={Download}
                    onClick={() => setShowChecklistGuideModal(true)}
                    className="min-w-[240px] px-5 py-3"
                  >
                    에듀집 등록 체크리스트
                  </Button>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* 서식3 의견서 작성 */}
            <Card className="mb-6">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">추천 학습지원 소프트웨어 의견서</h2>
                <p className="text-sm text-slate-500 mt-1">수요조사에서 신청된 제품별로 선정이유를 작성해주세요.</p>
              </div>
              
              {surveys.length === 0 ? (
                <div className="p-12 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">먼저 수요조사를 진행해주세요.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {getUniqueProducts().map((product) => {
                    const eduzipData = product.eduzipData;
                    const criteriaPassed = eduzipData ? checkCriteriaPassed(eduzipData.criteria) : null;
                    const reasons = reasonsCache[product.productName] || [];
                    const currentReason = form3Data[product.productName];
                    
                    // 선정이유 목록 로드
                    if (!reasonsCache[product.productName]) {
                      loadReasons(product.productName);
                    }
                    
                    return (
                      <div key={product.productName} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* 제품 정보 */}
                          <div className="md:w-1/3">
                            <h3 className="font-semibold text-slate-900">{product.productName}</h3>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-slate-600">
                                <span className="text-slate-500">기업명:</span> {eduzipData?.provider || '-'}
                              </p>
                              <p className="text-slate-600">
                                <span className="text-slate-500">관련 교과:</span> {product.subjects.join(', ')}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-slate-500 text-sm">필수기준:</span>
                                {criteriaPassed === null ? (
                                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">에듀집 미등록</span>
                                ) : criteriaPassed ? (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">○ 충족</span>
                                ) : (
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium">X 미충족</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* 선정이유 선택/입력 */}
                          <div className="md:w-2/3">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              선정이유 선택 또는 직접 작성
                            </label>
                            
                            {/* 기존 선정이유 목록 */}
                            {reasons.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {(() => {
                                  const isExpanded = expandedReasons[product.productName];
                                  const visibleReasons = isExpanded ? reasons : reasons.slice(0, 1);
                                  const hiddenCount = reasons.length - 1;
                                  
                                  return (
                                    <>
                                      {visibleReasons.map((r) => (
                                        <label
                                          key={r.id}
                                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            currentReason?.selectedReasonId === r.id
                                              ? 'border-indigo-500 bg-indigo-50'
                                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`reason-${product.productName}`}
                                            checked={currentReason?.selectedReasonId === r.id}
                                            onChange={() => handleReasonSelect(product.productName, r.id, r.reason)}
                                            className="mt-0.5"
                                          />
                                          <div className="flex-1">
                                            <p className="text-sm text-slate-900">{r.reason}</p>
                                            <p className="text-xs text-slate-500 mt-1">{r.useCount}회 사용됨</p>
                                          </div>
                                        </label>
                                      ))}
                                      {hiddenCount > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedReasons(prev => ({
                                            ...prev,
                                            [product.productName]: !prev[product.productName]
                                          }))}
                                          className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                          {isExpanded ? '접기' : `더보기 (+${hiddenCount}개)`}
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            
                            {/* 직접 작성 */}
                            <div className={`p-3 rounded-lg border ${
                              currentReason && !currentReason.selectedReasonId && currentReason.reason
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200'
                            }`}>
                              <label className="flex items-center gap-2 mb-2">
                                <input
                                  type="radio"
                                  name={`reason-${product.productName}`}
                                  checked={currentReason && !currentReason.selectedReasonId && !!currentReason.reason}
                                  onChange={() => {}}
                                  className="mt-0.5"
                                />
                                <span className="text-sm font-medium text-slate-700">직접 작성하기</span>
                              </label>
                              <textarea
                                value={currentReason?.selectedReasonId ? '' : (currentReason?.reason || '')}
                                onChange={(e) => handleReasonInput(product.productName, e.target.value)}
                                placeholder="선정이유를 직접 작성해주세요..."
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                              />
                              {currentReason && !currentReason.selectedReasonId && currentReason.reason && (
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSaveReason(product.productName)}
                                    icon={Save}
                                  >
                                    선정이유 공유하기
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </main>

      {/* [서식2] 에듀집 등록 체크리스트 안내 모달 */}
      {showChecklistGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <p className="text-slate-700 text-center leading-relaxed mb-4">
              [서식3] 의견서 작성 을 하시면 수요조사 목록에 있는 제품의 체크리스트를 일괄다운로드 하실 수 있습니다
            </p>
            <p className="text-slate-600 text-center text-sm mb-6">
              {checklistStorageCount === null
                ? '스토리지 체크리스트 개수 불러오는 중…'
                : `총 ${checklistStorageCount}개의 체크리스트가 스토리지에 저장되어 있습니다.`}
            </p>
            <div className="flex justify-center">
              <Button
                variant="primary"
                onClick={() => {
                  setShowChecklistGuideModal(false);
                  setActiveTab('form3');
                }}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 학교 비밀번호 변경 모달 */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">학교 비밀번호 변경</h3>
            <p className="text-sm text-slate-600 mb-4">
              현재 비밀번호를 입력한 뒤 새 비밀번호 4자리를 설정하세요.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">현재 비밀번호</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={changeCurrentPw}
                  onChange={(e) => setChangeCurrentPw(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호 4자리</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={changeNewPw}
                  onChange={(e) => setChangeNewPw(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={changeNewPwConfirm}
                  onChange={(e) => setChangeNewPwConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {changePwError && (
              <p className="mt-2 text-sm text-red-600">{changePwError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangeCurrentPw('');
                  setChangeNewPw('');
                  setChangeNewPwConfirm('');
                  setChangePwError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <Button
                variant="primary"
                onClick={handleChangePasswordConfirm}
                disabled={changePwLoading}
                className="flex-1"
              >
                {changePwLoading ? '변경 중...' : '변경'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 메인 앱 컴포넌트
// ============================================

export default function App() {
  const [currentPage, setCurrentPage] = useState('main');
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  const handleNavigate = (page, code = '', name = '') => {
    setCurrentPage(page);
    setSchoolCode(code);
    setSchoolName(name);
  };
  
  const handleBack = () => {
    setCurrentPage('main');
    setSchoolCode('');
    setSchoolName('');
  };
  
  return (
    <div className="min-h-screen flex flex-col pb-14">
      <div className="flex-1 min-h-0">
        {currentPage === 'teacher' && <TeacherPage schoolCode={schoolCode} schoolName={schoolName} onBack={handleBack} />}
        {currentPage === 'manager' && <ManagerPage schoolCode={schoolCode} schoolName={schoolName} onBack={handleBack} />}
        {currentPage === 'main' && <MainPage onNavigate={handleNavigate} />}
      </div>
      <footer className="fixed bottom-0 left-0 right-0 py-3 px-4 text-center text-sm text-slate-500 border-t border-slate-200 bg-white z-10">
        <a
          href="https://class1234.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
        >
          class1234.com
        </a>
        {' '}선생님들의 칼퇴근을 위해 무료로 배포합니다. -클래스페이-
      </footer>
    </div>
  );
}
