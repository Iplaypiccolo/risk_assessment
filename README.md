# 제설작업 안전 서류 만들기

휴대폰에서 간단히 입력하면 **위험성평가 결과보고서 · 작업계획서(장비별) · 특별교육 안전교육일지** PDF를 만들어 주는 웹페이지입니다. 업체 정보와 근로자 명단은 세 서류가 함께 씁니다.

- 주소: https://iplaypiccolo.github.io/risk_assessment/
- 입력한 내용과 사진은 **사용하는 기기의 브라우저 안에만** 저장됩니다. 서버나 GitHub로 전송되지 않습니다.
- 「여러 업체 작성하기」: 여러 업체(근로자 포함)를 목록으로 관리합니다.
- 「○○ 기본 내용 바꾸기」(첫 화면, 서류별): 위험요인·점검표·교육내용 등 미리 들어 있는 내용을 고칩니다. 모든 업체에 공통 적용. 설정만 파일로 저장·불러오기 가능.
- 작업계획서 첨부: 그림은 PDF 쪽으로, PDF는 뒤에 이어 붙이고, 한글·워드는 PDF 안의 첨부파일로 넣습니다(인쇄는 따로).
- 구호기관 자동 찾기: `js/config.js`에 카카오 JavaScript 키를 넣으면 지사 근처 119·병원·경찰서·순찰대를 찾아 줍니다(카카오맵 무료 쿼터). 키가 없으면 카카오맵 검색 링크가 나옵니다.

## 구성
| 파일 | 내용 |
|---|---|
| `index.html`, `css/style.css` | 화면 |
| `js/template.js` | 원본 HWP 보고서 내용 (실시규정, 평가표 기준, 수정 가능한 쪽의 기본값) |
| `js/logic.js` | 설문(⭕/❌) 흐름과 점수 계산 |
| `js/pdf.js` | 위험성평가 PDF 양식 (pdfmake) |
| `js/doc_tpl.js`, `js/pdf_plan.js`, `js/pdf_edu.js` | 작업계획서·특별교육 기본 내용과 PDF 양식 |
| `js/imgedit.js` | 첨부 그림 돌리기·자르기 |
| `img/plan/` | 장비별 운행경로 기본 그림 |
| `js/photo.js` | 사진 자동 맞춤·자르기 |
| `js/store.js` | 브라우저 저장 (IndexedDB) |
| `js/near.js`, `js/config.js` | 가까운 구호기관 찾기 (카카오맵) |
| `lib/pdfmake.min.js`, `lib/pdf-lib.min.js` | PDF 라이브러리 (MIT) |
| `fonts/` | Noto Sans KR 일부 글자 (SIL OFL 1.1) |
