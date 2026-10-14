# 위험성평가 결과보고서 만들기 (제설작업)

휴대폰에서 질문에 답하고 사진만 넣으면 **위험성평가 결과보고서 PDF**를 만들어 주는 웹페이지입니다.

- 주소: https://iplaypiccolo.github.io/risk_assessment/
- 입력한 내용과 사진은 **사용하는 기기의 브라우저 안에만** 저장됩니다. 서버나 GitHub로 전송되지 않습니다.
- 「여러 업체 작성하기」: 여러 업체(근로자 포함)를 목록으로 관리합니다.
- 「보고서 기본 내용 바꾸기」(첫 화면): 위험요인·점검항목 등 미리 들어 있는 내용을 고칩니다. 모든 업체에 공통 적용.
- 구호기관 자동 찾기: `js/config.js`에 카카오 JavaScript 키를 넣으면 지사 근처 119·병원·경찰서·순찰대를 찾아 줍니다(카카오맵 무료 쿼터). 키가 없으면 카카오맵 검색 링크가 나옵니다.

## 구성
| 파일 | 내용 |
|---|---|
| `index.html`, `css/style.css` | 화면 |
| `js/template.js` | 원본 HWP 보고서 내용 (실시규정, 평가표 기준, 수정 가능한 쪽의 기본값) |
| `js/logic.js` | 설문(⭕/❌) 흐름과 점수 계산 |
| `js/pdf.js` | PDF 양식 (pdfmake) |
| `js/photo.js` | 사진 자동 맞춤·자르기 |
| `js/store.js` | 브라우저 저장 (IndexedDB) |
| `js/near.js`, `js/config.js` | 가까운 구호기관 찾기 (카카오맵) |
| `lib/pdfmake.min.js` | PDF 라이브러리 (MIT) |
| `fonts/` | Noto Sans KR 일부 글자 (SIL OFL 1.1) |
