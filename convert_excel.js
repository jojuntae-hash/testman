const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, 'data', '고객별 정기 관리 확인서 상세 데이터_V4.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

function formatExcelDate(serial) {
  if (!serial) return '';
  if (typeof serial !== 'number') return serial.toString();
  // Excel dates are number of days since Dec 30, 1899
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

// Map the data to match the interface
const mappedData = jsonData.map((row, index) => ({
  id: index.toString(),
  고객번호: (row['고객번호'] || '').toString(),
  모델명: (row['모델명'] || '').toString(),
  계약일자: formatExcelDate(row['계약일자']),
  계약만료일자: formatExcelDate(row['계약만료일자']),
  최종점검일: formatExcelDate(row['최종점검일']),
  예약일자: formatExcelDate(row['예약일시']), // Mapping 예약일시 to 예약일자
  당월작업: (row['당월작업'] || '').toString(),
  최종작업내용: (row['최종작업내용'] || '').toString(),
  status: '작업미완료',
  계약자구분: (row['계약자구분'] || '').toString(),
  고객명_상호: (row['고객명/상호'] || '').toString(),
  사업자번호: (row['사업자번호'] || '').toString(),
  전화번호: (row['계약_전화번호'] || '').toString(),
  핸드폰번호: (row['계약_핸드폰번호'] || '').toString(),
  주소: (row['계약_주소'] || '').toString(),
  설치처구분: (row['설치처구분'] || '').toString(),
  설치자명: (row['설치자명'] || '').toString(),
  설치구분: (row['설치구분'] || '').toString(),
  설치전화번호: (row['설치_전화번호'] || '').toString(),
  설치핸드폰번호: (row['설치_핸드폰번호'] || '').toString(),
  설치주소: (row['설치_주소'] || '').toString(),
  설치시특이사항: (row['설치시특이사항'] || '').toString(),
}));

const tsContent = `import { CustomerData } from './DataContext'

export const initialCustomers: CustomerData[] = ${JSON.stringify(mappedData, null, 2)}
`;

fs.writeFileSync(path.join(__dirname, 'lib', 'initialData.ts'), tsContent);
console.log('Successfully updated lib/initialData.ts with corrected mapping');
