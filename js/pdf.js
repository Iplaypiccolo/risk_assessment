/* 입력값으로 원본 양식의 PDF 문서 정의(pdfmake)를 만듭니다. */
(function (g) {
  'use strict';
  var F = TPL.FIXED, L = LOGIC, D = L.D;
  var PINK = '#FBE4E8', GRAY = '#D9D9D9', LGRAY = '#EFEFEF', BLUE = '#DCE6F2', MINT = '#DDF2F0';
  var PW = 476, LW = 723; // 본문 폭(세로/가로)

  function cl(s) { return L.clean(s); }

  function build(c, assets) {
    var info = c.info || {}, E = c.edit, A = c.answers || {};
    var Y = D.year(info.writeDate);
    var y = function (s) { return cl(String(s == null ? '' : s).replace(/\{Y\}/g, Y)); };
    var company = cl(info.company), contract = cl(info.contract), ceo = cl(info.ceo);
    var workers = (c.workers || []).filter(function (w) { return w.name && w.name.trim(); });
    var wNames = workers.map(function (w) { return cl(w.name); });
    var wRoleNames = workers.map(function (w) { return cl((w.role || '운전원') + ' ' + w.name); });
    var workerCount = info.workerCount ? String(info.workerCount) : (workers.length ? workers.length + '명' : '');
    if (info.workerCount && /^\d+$/.test(String(info.workerCount))) workerCount = info.workerCount + '명';
    var ev = L.evalSummary(c);
    var sch = c.schedule || {};
    var photos = c.photos || {};
    var ceoTxt = ceo ? '사장 ' + ceo : '사장';
    var content = [];

    function pageBreak(orient) { content.push({ text: '', pageBreak: 'before', pageOrientation: orient || 'portrait' }); }
    function centered(node) { return { columns: [{ width: '*', text: '' }, { width: 'auto', stack: [node] }, { width: '*', text: '' }] }; }
    function lines(arr, opt) {
      return arr.map(function (t) {
        if (t && typeof t === 'object' && t.b) return Object.assign({ text: y(t.b), bold: true, margin: [0, 3, 0, 1] }, opt || {});
        return Object.assign({ text: y(t), margin: [0, 1, 0, 1] }, opt || {});
      });
    }
    /* 원본의 "제목칸 + 내용" 상자 */
    function sectionBox(title, body) {
      return {
        margin: [0, 0, 0, 14], unbreakable: true,
        table: { widths: ['auto', '*'], dontBreakRows: true, body: [
          [{ text: title, fillColor: PINK, fontSize: 10, margin: [2, 2, 2, 2] }, { text: '' }],
          [{ colSpan: 2, stack: Array.isArray(body) ? body : [body], margin: [4, 2, 4, 6], fontSize: 8.5, lineHeight: 1.45 }, {}]
        ] },
        layout: { hLineWidth: function (i, n) { return i === 0 || i === n.table.body.length ? 0.8 : 0; }, vLineWidth: function (i, n) { return i === 0 || i === n.table.widths.length ? 0.8 : 0; } }
      };
    }
    function divider(title) {
      pageBreak();
      content.push({
        table: { widths: ['*'], heights: [700], body: [[{ stack: [centered({
          table: { widths: [220], body: [[{ text: title, fontSize: 24, bold: true, alignment: 'center', lineHeight: 1.6, margin: [6, 22, 6, 22], fillColor: PINK }]] },
          layout: { hLineWidth: function () { return 1.2; }, vLineWidth: function () { return 1.2; } }
        })], margin: [0, 40, 0, 0] }]] },
        layout: { hLineWidth: function () { return 0.8; }, vLineWidth: function () { return 0.8; } }
      });
    }
    function titleBox(text, fill, color) {
      return centered({ table: { widths: [220], body: [[{ text: text, alignment: 'center', bold: true, fontSize: 13, color: color || 'black', fillColor: fill || null, margin: [4, 8, 4, 8] }]] }, margin: [0, 0, 0, 14] });
    }
    function lineTitle(text) {
      return { stack: [
        { canvas: [{ type: 'line', x1: 40, y1: 0, x2: PW - 40, y2: 0, lineWidth: 0.8 }] },
        { text: text, fontSize: 15, alignment: 'center', margin: [0, 8, 0, 8] },
        { canvas: [{ type: 'line', x1: 40, y1: 0, x2: PW - 40, y2: 0, lineWidth: 0.8 }] }
      ], margin: [0, 0, 0, 22] };
    }
    function orgChart() {
      var box = function (head, fill, rowsArr) {
        return centered({ table: { widths: [36, 64], body: [[{ text: head, colSpan: 2, alignment: 'center', fillColor: fill, fontSize: 8 }, {}]].concat(rowsArr) }, layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } } });
      };
      var ceoBox = box('사 장', '#F3E6F3', [[{ text: '대표', fontSize: 8 }, { text: ceo, fontSize: 8, alignment: 'center' }]]);
      var wr = wNames.length ? [[{ text: wNames.join(', '), colSpan: 2, alignment: 'center', fontSize: 8 }, {}]] : [[{ text: ' ', colSpan: 2 }, {}]];
      var wBox = box('참여근로자', MINT, wr);
      return { stack: [ceoBox, centered({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 0, y2: 34, lineWidth: 0.8 }] }), wBox], margin: [0, 6, 0, 6] };
    }
    var thin = { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } };
    var tight = { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; }, paddingLeft: function () { return 2; }, paddingRight: function () { return 2; }, paddingTop: function () { return 2; }, paddingBottom: function () { return 2; } };
    function photoCell(dataUrl, w, h) {
      if (dataUrl) return { image: dataUrl, width: w, height: h, alignment: 'center', margin: [0, 2, 0, 2] };
      return { text: '', margin: [0, h / 2, 0, h / 2] };
    }

    /* ===== 1쪽 표지 ===== */
    content.push(
      { canvas: [{ type: 'rect', x: 0, y: 0, w: PW, h: 5, color: '#ADADAD' }], margin: [0, 60, 0, 6] },
      { text: contract || '계약명', fontSize: 22, bold: true, alignment: 'center', margin: [0, 6, 0, 6] },
      { canvas: [{ type: 'rect', x: 0, y: 0, w: PW, h: 5, color: '#ADADAD' }], margin: [0, 0, 0, 0] },
      { text: D.ym(info.writeDate), fontSize: 15, bold: true, alignment: 'center', margin: [0, 110, 0, 0] },
      { text: company || '업 체 명', fontSize: 22, alignment: 'center', margin: [0, 230, 0, 0] }
    );
    /* ===== 2쪽 목차 ===== */
    pageBreak();
    content.push({ margin: [0, 120, 0, 0], table: { widths: ['*'], body: [[{ stack: [
      { text: '목 차', fontSize: 16, alignment: 'center', margin: [0, 16, 0, 30] },
      { text: '1. 위험성평가 실시규정', bold: true, fontSize: 12, margin: [24, 0, 0, 28] },
      { text: '2. 위험성평가 실시', bold: true, fontSize: 12, margin: [24, 0, 0, 28] },
      { text: '3. 위험성평가 교육 실시', bold: true, fontSize: 12, margin: [24, 0, 0, 28] },
      { text: '4. 기타 제출서류', bold: true, fontSize: 12, margin: [24, 0, 0, 30] }
    ] }]] }, layout: { hLineWidth: function () { return 1; }, vLineWidth: function () { return 1; } } });
    /* ===== 3쪽 결과보고서 표지 ===== */
    pageBreak();
    content.push({ table: { widths: ['*'], heights: [700], body: [[{ stack: [
      { table: { widths: ['*'], body: [[{ text: '', fillColor: GRAY, margin: [0, 5, 0, 5] }], [{ stack: [
        { text: contract || '계약명', fontSize: 18, bold: true, alignment: 'center', margin: [0, 10, 0, 6] },
        { text: '위험성평가 결과보고서', fontSize: 26, bold: true, alignment: 'center', margin: [0, 0, 0, 14] }
      ] }], [{ text: '', fillColor: GRAY, margin: [0, 5, 0, 5] }]] }, layout: thin, margin: [4, 16, 4, 0] },
      { text: D.ym(info.writeDate), fontSize: 15, bold: true, alignment: 'center', margin: [0, 200, 0, 0] },
      { text: company || '업 체 명', fontSize: 22, alignment: 'center', margin: [0, 150, 0, 0] }
    ] }]] }, layout: { hLineWidth: function () { return 1; }, vLineWidth: function () { return 1; } } });
    /* ===== 4쪽 안전보건방침 ===== */
    pageBreak();
    content.push({ text: '안전보건방침', fontSize: 22, bold: true, alignment: 'center', margin: [0, 10, 0, 20] });
    content.push({ table: { widths: ['*'], heights: [520], body: [[{ stack: F.policy.map(function (p) { return { text: p, fontSize: 12, lineHeight: 1.6, margin: [6, 10, 6, 10] }; }), margin: [10, 14, 10, 10] }]] }, layout: { hLineWidth: function () { return 1; }, vLineWidth: function () { return 1; } } });
    content.push({ text: [{ text: '회사명 : ', bold: true }, company + '      ', { text: '대표 : ', bold: true }, ceo + '      ', { text: '(서 명)', color: '#555' }], alignment: 'center', fontSize: 11, margin: [0, 40, 0, 0] });

    /* ===== 1. 위험성평가 실시규정 ===== */
    divider('1.\n위험성평가\n실시규정');
    pageBreak();
    content.push({ margin: [0, 0, 0, 14], table: { widths: [56, 72, 90, '*', '*', '*'], heights: [20, 34], body: [
      [{ text: '사업장명', bold: true, fontSize: 8, alignment: 'center' }, { text: company, fontSize: 8, alignment: 'center' }, { text: '위험성평가\n실시규정', rowSpan: 2, bold: true, fontSize: 11, alignment: 'center', lineHeight: 1.3 }, { text: '담당자', fontSize: 8, alignment: 'center', bold: true }, { text: '근로자\n대표', fontSize: 8, alignment: 'center', bold: true }, { text: '승인자', fontSize: 8, alignment: 'center', bold: true }],
      [{ text: '작성일자', bold: true, fontSize: 8, alignment: 'center' }, { text: D.short(info.writeDate), fontSize: 8, alignment: 'center' }, {}, '', '', '']
    ] }, layout: thin });
    content.push(sectionBox('1. 실시목적', { text: F.rules.purpose }));
    content.push(sectionBox('2. 적용범위', { text: F.rules.scope }));
    content.push(sectionBox('3. 조직구성', [orgChart(), { text: F.rules.orgNote, alignment: 'center', fontSize: 7 }]));
    content.push({ margin: [0, 0, 0, 14], table: { widths: [110, '*'], body: [
      [{ text: '담당자', alignment: 'center', fillColor: PINK }, { text: '4. 역할과 책임', alignment: 'center', fillColor: PINK }],
      [{ text: '사 장\n( ' + (ceo || '성명') + ' )', alignment: 'center', bold: true, fontSize: 8.5, margin: [0, 4, 0, 0] }, { stack: lines(F.rules.roleCeo), fontSize: 8, lineHeight: 1.35 }],
      [{ text: '근로자(작업자)\n(' + (wNames.length ? wNames.join(', ') : '○○○, ○○○') + ')', alignment: 'center', bold: true, fontSize: 8.5, margin: [0, 4, 0, 0] }, { stack: lines(F.rules.roleWorker), fontSize: 8, lineHeight: 1.35 }]
    ] }, layout: thin });
    content.push(sectionBox('5. 평가대상', lines(F.rules.target)));
    content.push(sectionBox('6. 실시시기', lines(F.rules.timing)));
    content.push(sectionBox('7. 위험성평가 실시원칙 및 추진절차', lines(F.rules.principle)));
    /* 흐름도 + 표1~4 */
    var flowStack = [];
    if (assets && assets.flow) flowStack.push({ image: assets.flow, width: 330, alignment: 'center', margin: [0, 4, 0, 8] });
    content.push({ margin: [0, 0, 0, 10], table: { widths: ['*'], body: [[{ stack: flowStack.concat([
      { table: { widths: ['*'], body: [[{ stack: lines(F.rules.flowSteps), fontSize: 8, lineHeight: 1.4 }]] }, layout: thin, margin: [0, 0, 0, 6] },
      centered({ table: { widths: [250], body: [[{ text: F.rules.formula, bold: true, alignment: 'center', fillColor: BLUE, margin: [0, 3, 0, 3] }]] }, layout: { hLineWidth: function () { return 1.2; }, vLineWidth: function () { return 1.2; }, hLineColor: function () { return '#3355AA'; }, vLineColor: function () { return '#3355AA'; } } }),
      { text: F.rules.formulaNote, fontSize: 7.5, margin: [0, 4, 0, 0] }
    ]) }]] }, layout: { hLineWidth: function () { return 0; }, vLineWidth: function () { return 0; } } });
    var smallT = function (head, rows, widths, headFill) {
      return { table: { widths: widths, body: [head.map(function (h) { return { text: h, bold: true, alignment: 'center', fillColor: headFill || LGRAY, fontSize: 8 }; })].concat(rows) }, layout: thin, margin: [0, 2, 0, 12] };
    };
    content.push({ text: '<표 1> 가능성(빈도)', fontSize: 8.5 });
    content.push(smallT(['구분', '가능성', '내용'], F.rules.table1.map(function (r) { return [{ text: r[0], alignment: 'center', fontSize: 8 }, { text: r[1], alignment: 'center', fontSize: 8 }, { text: r[2], fontSize: 8 }]; }), [60, 60, '*']));
    content.push({ text: '<표 2> 중대성(강도)', fontSize: 8.5 });
    content.push(smallT(['구분', '중대성', '내 용'], F.rules.table2.map(function (r) { return [{ text: r[0], alignment: 'center', fontSize: 8 }, { text: r[1], alignment: 'center', fontSize: 8 }, { text: r[2], fontSize: 8 }]; }), [60, 60, '*']));
    content.push({ text: '<표 3> 위험성 크기(수준)', fontSize: 8.5 });
    var riskFill = function (t) { return t.indexOf('높음') === 0 ? '#FF2020' : t.indexOf('보통') === 0 ? '#3FC5E8' : '#D9D9D9'; };
    content.push({ table: { widths: ['*', '*', '*', '*'], body: [F.rules.table3Head.map(function (h) { return { text: h, alignment: 'center', fontSize: 8, fillColor: GRAY }; })].concat(F.rules.table3.map(function (r) {
      return r.map(function (cv, i) { return i === 0 ? { text: cv, alignment: 'center', fontSize: 8, fillColor: GRAY } : { text: cv, alignment: 'center', fontSize: 8, fillColor: riskFill(cv), color: cv.indexOf('높음') === 0 ? 'white' : 'black' }; });
    })) }, layout: thin, margin: [0, 2, 0, 12] });
    content.push({ table: { widths: ['*'], body: [[{ text: F.rules.step4, fontSize: 8.5, lineHeight: 1.45, fillColor: '#FCEEEE', margin: [4, 4, 4, 4] }]] }, layout: { hLineWidth: function () { return 0; }, vLineWidth: function () { return 0; } }, margin: [0, 0, 0, 10] });
    content.push({ text: '<표 4> 위험성 결정', fontSize: 8.5 });
    var t4fill = ['#33CCEE', '#B5E61D', null];
    content.push({ table: { widths: [50, 60, 80, '*'], body: [
      [{ text: '위험성 수준', colSpan: 2, alignment: 'center', fillColor: LGRAY, fontSize: 8 }, {}, { text: '허용가능 여부', alignment: 'center', fillColor: LGRAY, fontSize: 8 }, { text: '관리 기준', alignment: 'center', fillColor: LGRAY, fontSize: 8 }]
    ].concat(F.rules.table4.map(function (r, i) { return r.map(function (cv, j) { return { text: cv, alignment: j === 3 ? 'left' : 'center', bold: j === 3, fontSize: 8, fillColor: t4fill[i] }; }); })) }, layout: thin, margin: [0, 2, 0, 12] });
    content.push({ table: { widths: ['*'], body: [[{ text: F.rules.step56, fontSize: 8.5, lineHeight: 1.45, margin: [4, 4, 4, 4] }]] }, layout: thin, margin: [0, 0, 0, 14] });
    content.push(sectionBox('8. 위험성평가의 방법', { text: F.rules.method }));
    content.push(sectionBox('9. 위험성의 수준 판단 기준', { text: F.rules.criteria }));
    content.push(sectionBox('10. 근로자에 대한 공유', lines(F.rules.share)));
    content.push(sectionBox('11. 근로자의 참여 방법', { text: F.rules.participate }));
    content.push(sectionBox('12. 유의사항', [{ text: F.rules.caution1 }, { table: { widths: ['*'], body: [[{ stack: lines(F.rules.cautionBox), fontSize: 7.5 }]] }, layout: thin, margin: [0, 4, 0, 4] }].concat(lines(F.rules.caution2))));
    content.push(sectionBox('13. 점검 및 개선활동', lines(F.rules.improve)));

    /* ===== 2. 위험성평가 실시 ===== */
    divider('2.\n위험성평가\n실시');
    pageBreak();
    var P = E.process || {};
    var lab = function (t, extra) { return Object.assign({ text: t, bold: true, alignment: 'center', fontSize: 8.5, fillColor: null }, extra || {}); };
    var val = function (t, extra) { return Object.assign({ text: cl(t), fontSize: 8.5, alignment: 'center' }, extra || {}); };
    content.push({ text: '1. 사업장 개요', bold: true, fontSize: 11, margin: [0, 0, 0, 14] });
    content.push({ table: { widths: [24, 40, 46, 40, 56, 50, 40, 56, '*'], body: [
      [lab('사업장명', { colSpan: 2 }), {}, val(company, { colSpan: 3 }), {}, {}, lab('사업주명', { colSpan: 2 }), {}, val(ceo, { colSpan: 2 }), {}],
      [lab('업종', { colSpan: 2 }), {}, val(info.bizType, { colSpan: 3 }), {}, {}, lab('근로자수', { colSpan: 2 }), {}, val(workerCount, { colSpan: 2 }), {}],
      [lab('주소', { colSpan: 2 }), {}, val([info.address, info.addressDetail].filter(Boolean).join(' '), { colSpan: 7, alignment: 'left' }), {}, {}, {}, {}, {}, {}],
      [lab('조직도', { colSpan: 2, margin: [0, 2, 0, 0] }), {}, { colSpan: 7, stack: [orgChart()], margin: [0, 10, 0, 10] }, {}, {}, {}, {}, {}, {}],
      [lab('공정분석', { colSpan: 9 }), {}, {}, {}, {}, {}, {}, {}, {}],
      [lab('No.'), lab('공정명', { colSpan: 2 }), {}, lab('대상'), lab('공정설명', { colSpan: 2 }), {}, lab('설비', { colSpan: 2 }), {}, lab('물질')],
      [val('1'), val(P.name, { colSpan: 2 }), {}, val(wNames.join('\n') || '근로자명'), val(P.desc, { colSpan: 2, lineHeight: 1.4 }), {}, val(P.equip, { colSpan: 2, lineHeight: 1.4 }), {}, val(P.material)]
    ] }, layout: thin });

    /* 17쪽 안전보건상 위험정보 (가로) */
    pageBreak('landscape');
    var inf = E.info || {};
    var chk = function (b) { return b ? '■' : '□'; };
    var hv = inf.heavy || {};
    var env = inf.envMeasure || 'none';
    var tr = c.traits || {};
    var traitsTxt = F.traits.map(function (t) { return t[1] + ' ' + chk(tr[t[0]]); });
    var otherInfo = F.otherInfoHead.slice();
    var sub = A.i_sub ? A.i_sub === 'O' : !!inf.subcontract;
    var permit = A.i_permit ? A.i_permit === 'O' : !!inf.permit;
    var checkup = A.i_checkup ? A.i_checkup === 'O' : !!inf.checkup;
    otherInfo = otherInfo.concat([
      '○ 도급(일부, 전부 또는 혼재작업) (유' + chk(sub) + ', 무' + chk(!sub) + ')',
      '○ 재해사례, 재해통계 등에 관한 정보',
      '- 재해사례 및 재해통계 정보조사 참조',
      '○ 안전작업허가증 필요작업(유' + chk(permit) + ', 무' + chk(!permit) + ')',
      '○ 중량물 인력 취급 시 단위 중량(' + cl(hv.unit || '') + ') 및 취급형태',
      '(들기' + chk(hv.lift) + ', 밀기' + chk(hv.push) + ', 끌기' + chk(hv.pull) + ', 해당무' + chk(hv.none) + ')',
      '○ 작업환경측정 유무(측정' + chk(env === 'yes') + ', 미측정' + chk(env === 'no') + ', 해당무' + chk(env === 'none') + ')',
      '○ 근로자 건강진단 유무(유' + chk(checkup) + ', 무' + chk(!checkup) + ')',
      '○ 근로자 구성 및 경력특성',
      traitsTxt.slice(0, 3).join('   '),
      traitsTxt.slice(3).join('   '),
      '○ 그 밖에 위험성평가에 참고가 되는 자료 등'
    ]);
    var eq = E.equipment || [];
    var ch = E.chemicals || [];
    var tl = function (t, x) { return Object.assign({ text: t, alignment: 'center', fontSize: 8, bold: true }, x || {}); };
    content.push({ table: { widths: [58, 60, 104, 50, 80, 56, 56, 60, 60, '*'], body: [
      [tl('작업'), val(E.work), { text: '안전ㆍ보건상 위험정보', colSpan: 6, rowSpan: 2, alignment: 'center', bold: true, fontSize: 15, fillColor: '#FDE9D9', margin: [0, 8, 0, 0] }, {}, {}, {}, {}, {}, tl('근로자수'), val(workerCount)],
      [tl('평가일시'), val(D.kor(info.writeDate), { fontSize: 7.5 }), {}, {}, {}, {}, {}, {}, tl('평가자'), val(ceo)],
      [tl('공정', { rowSpan: 2, margin: [0, 8, 0, 0] }), tl('기계 ･ 기구 및 설비', { colSpan: 3, fillColor: LGRAY }), {}, {}, tl('유 해 화 학 물 질', { colSpan: 3, fillColor: LGRAY }), {}, {}, tl('기타 안전ㆍ보건상 정보', { colSpan: 3, rowSpan: 2, fillColor: LGRAY, margin: [0, 8, 0, 0] }), {}, {}],
      [{}, tl('설 비 명', { colSpan: 2 }), {}, tl('수량'), tl('화학물질명'), tl('취급량(일)'), tl('취급시간'), {}, {}, {}],
      [val(E.work, { margin: [0, 4, 0, 0] }),
        { colSpan: 2, stack: eq.map(function (e) { return { text: cl(e.name), fontSize: 8, alignment: 'center', margin: [0, 2, 0, 2] }; }), margin: [0, 4, 0, 0] }, {},
        { stack: eq.map(function (e) { return { text: cl(e.qty), fontSize: 8, alignment: 'center', margin: [0, 2, 0, 2] }; }), margin: [0, 4, 0, 0] },
        { stack: ch.map(function (e) { return { text: cl(e.name), fontSize: 8, alignment: 'center' }; }), margin: [0, 4, 0, 0] },
        { stack: ch.map(function (e) { return { text: cl(e.amount), fontSize: 8, alignment: 'center' }; }), margin: [0, 4, 0, 0] },
        { stack: ch.map(function (e) { return { text: cl(e.time), fontSize: 8, alignment: 'center' }; }), margin: [0, 4, 0, 0] },
        { colSpan: 3, stack: otherInfo.map(function (t) { return { text: t, fontSize: 7.5, margin: [2, 1.5, 2, 1.5] }; }) }, {}, {}]
    ] }, layout: thin });

    /* 18~19쪽 순회점검 조사표 */
    pageBreak('portrait');
    var patrolRows = (E.patrol || []).map(function (r) { return [{ text: cl(r.text), colSpan: 3, fontSize: 7.5 }, {}, {}, { text: cl(r.type), fontSize: 7.5 }]; });
    content.push({ _big: true, table: { headerRows: 4, widths: [80, 120, '*', 100], body: [
      [{ text: '사업장 순회점검에 의한 유해·위험요인 조사표', colSpan: 4, bold: true, alignment: 'center', fillColor: LGRAY, fontSize: 9.5 }, {}, {}, {}],
      [{ text: '실시방법', bold: true, alignment: 'center', fillColor: LGRAY, fontSize: 8 }, { text: '위험성평가 수행자가 정기적으로 사업장을 순회점검하고 이 조사표를 사용하여 유해·위험요인을 찾음', colSpan: 3, fontSize: 8, lineHeight: 1.4 }, {}, {}],
      [{ text: '수행자 성명 : ' + (ceo ? ceo + ' ' : '') + '(사장)\n수 행 일 시 : ' + (D.dotWd(sch.patrolDate || info.writeDate) || ''), colSpan: 4, fontSize: 8, lineHeight: 1.6, margin: [2, 4, 2, 4] }, {}, {}, {}],
      [{ colSpan: 3, stack: [{ text: '유해·위험 작업', bold: true, alignment: 'center', fontSize: 8.5 }, { text: '※ 발견한 작업의 내용, 장소 및 유해위험 정도를 표시함', fontSize: 7 }], fillColor: LGRAY }, {}, {}, { stack: [{ text: '사고·질병의 유형', bold: true, alignment: 'center', fontSize: 8.5 }, { text: '※ 파악한 작업의 결과, 발생시의 사고 또는 질병형태를 표시함', fontSize: 7 }], fillColor: LGRAY }]
    ].concat(patrolRows).concat([
      [{ text: '사고·질병의 유형\n-위험성 평가 지원시스템 (KRAS) 분류-', colSpan: 4, bold: true, alignment: 'center', fontSize: 8.5, fillColor: LGRAY }, {}, {}, {}]
    ]).concat(F.kras.map(function (k) { return [{ text: k[0], colSpan: 2, alignment: 'center', fontSize: 7.5 }, {}, { text: k[1], colSpan: 2, fontSize: 7.5 }, {}]; })) }, layout: thin });

    /* 20쪽 재해사례·통계 */
    pageBreak();
    content.push(titleBox('재해사례, 재해통계\n정보 조사', '#F47A20', 'white'));
    var acc = c.accident || {};
    var hadAcc = A.q10b === 'O';
    var accCases = hadAcc ? (acc.cases || 0) : 0, accDead = hadAcc && A.q10c === 'O' ? (acc.dead || 0) : 0, accInj = hadAcc ? (acc.injured || 0) : 0;
    content.push({ text: '□ 공종명 : ' + cl(E.work), fontSize: 9, margin: [0, 6, 0, 10] });
    content.push({ text: '□ 재해통계(' + (Y - 4) + '년~' + (Y - 1) + ')', fontSize: 9, margin: [0, 0, 0, 6] });
    content.push({ table: { widths: ['*', '*', '*', '*'], body: [
      ['사 고', '사망(명)', '부상(명)', '비고'].map(function (h) { return { text: h, alignment: 'center', fontSize: 8.5, fillColor: '#FDE9D9' }; }),
      [{ text: '총 ' + accCases + '건', alignment: 'center', fontSize: 8.5 }, { text: accDead ? accDead + '명' : '-', alignment: 'center', fontSize: 8.5 }, { text: accInj + '명', alignment: 'center', fontSize: 8.5 }, { text: '' }]
    ] }, layout: thin, margin: [0, 0, 0, 14] });
    content.push({ text: '□ 유사사례', fontSize: 9, margin: [0, 0, 0, 6] });
    content.push({ _big: true, table: { headerRows: 1, widths: [44, 40, 80, '*', 44], body: [
      ['구분', '연도', '기관명', '사고내용', '비고'].map(function (h) { return { text: h, alignment: 'center', fontSize: 8.5, fillColor: '#FDE9D9' }; })
    ].concat((E.cases || []).map(function (r) { return [r.kind, r.year, r.org, r.text, r.note].map(function (v, i) { return { text: cl(v), fontSize: 8, alignment: i === 3 ? 'left' : 'center', lineHeight: 1.3 }; }); })) }, layout: thin });

    /* 21쪽 MSDS */
    pageBreak();
    content.push(titleBox('물질안전보건자료'));
    var ms = (E.msds || []).slice();
    var msRows = [];
    var nRows = Math.max(22, ms.length);
    for (var i = 0; i < nRows; i++) {
      var m = ms[i] || {};
      msRows.push([String(i + 1), m.name, m.cas, m.use, m.store, m.purpose].map(function (v) { return { text: cl(v || ''), fontSize: 8, alignment: 'center' }; }));
    }
    content.push({ _big: true, table: { headerRows: 2, widths: [36, '*', 60, 70, 70, 80], body: [
      [{ text: 'MSDS 목록', colSpan: 6, alignment: 'center', fontSize: 13, margin: [0, 4, 0, 4] }, {}, {}, {}, {}, {}],
      ['연번', '물질명', 'CAS No.', '사용량\n(ℓ·㎏/일)', '저장량\n(ℓ·㎏/일)', '용도'].map(function (h) { return { text: h, alignment: 'center', fontSize: 8, fillColor: LGRAY }; })
    ].concat(msRows) }, layout: thin });

    /* 22쪽 유해위험요인 분류 */
    pageBreak();
    var checks = {}; (E.hazardChecks || []).forEach(function (k) { checks[k] = true; });
    var hzBody = [
      [{ text: '유해위험요인 분류', colSpan: 11, alignment: 'center', bold: true, fontSize: 13, margin: [0, 4, 0, 4] }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
      [tl('공 정'), val(E.work, { fontSize: 7.5 }), tl('세부 분류', { colSpan: 2 }), {}, val(E.resultSubName || E.work, { fontSize: 7.5 }), tl('설비', { colSpan: 2 }), {}, val(E.hazardEquip || '-', { fontSize: 7.5 }), tl('물질', { colSpan: 2 }), {}, val(E.hazardMaterial || '-', { fontSize: 7.5 })]
    ];
    F.hazardGroups.forEach(function (grp, gi) {
      var rowsN = Math.ceil(grp.items.length / 3);
      for (var r = 0; r < rowsN; r++) {
        var row = [];
        var fill = gi % 2 ? null : '#F2F2F2';
        if (r === 0) { row.push({ text: grp.no, rowSpan: rowsN, fontSize: 8, alignment: 'center', fillColor: fill }); row.push({ text: grp.name, rowSpan: rowsN, fontSize: 8, alignment: 'center', fillColor: fill }); }
        else { row.push({}); row.push({}); }
        for (var k = 0; k < 3; k++) {
          var it = grp.items[r * 3 + k];
          if (it) row.push({ text: chk(checks[it[0]]), alignment: 'center', fontSize: 9, fillColor: fill }, { text: it[0], fontSize: 7.5, alignment: 'center', fillColor: fill }, { text: it[1], fontSize: 7.5, fillColor: fill });
          else row.push({ text: '', fillColor: fill }, { text: '', fillColor: fill }, { text: '', fillColor: fill });
        }
        hzBody.push(row);
      }
    });
    content.push({ table: { widths: [18, 54, 14, 22, '*', 14, 22, '*', 14, 22, '*'], body: hzBody }, layout: thin });

    /* 23~26쪽 위험성평가 결과서 (가로) */
    pageBreak('landscape');
    var hd = function (t, x) { return Object.assign({ text: t, alignment: 'center', fontSize: 7.5, bold: true, fillColor: '#E2EFDA' }, x || {}); };
    var rsBody = [
      [hd('공정명', { colSpan: 2 }), {}, val(E.work, { colSpan: 2, fontSize: 8 }), {}, { text: '위험성평가 결과서', colSpan: 6, rowSpan: 2, alignment: 'center', bold: true, fontSize: 16, color: 'white', fillColor: '#2E9E6E', margin: [0, 6, 0, 0] }, {}, {}, {}, {}, {}, hd('평가일자', { colSpan: 2 }), {}, val(D.dot(info.writeDate), { colSpan: 2, fontSize: 8 }), {}],
      [hd('세부공정명', { colSpan: 2 }), {}, val(E.resultSubName || E.work, { colSpan: 2, fontSize: 8 }), {}, {}, {}, {}, {}, {}, {}, hd('평 가 자', { colSpan: 2 }), {}, val(ceo, { colSpan: 2, fontSize: 8 }), {}],
      [hd('세부작업', { rowSpan: 2 }), hd('유해위험요인 파악', { colSpan: 2 }), {}, hd('현재 안전보건조치', { rowSpan: 2 }), hd('재해사례\n(안전보건\n정보 참조)', { rowSpan: 2 }), hd('현재 위험성', { colSpan: 3 }), {}, {}, hd('감소대책', { colSpan: 2 }), {}, hd('개선후\n위험성', { rowSpan: 2 }), hd('개선\n예정일', { rowSpan: 2 }), hd('완료일', { rowSpan: 2 }), hd('담당자', { rowSpan: 2 })],
      [{}, hd('위험분류'), hd('유해・위험 상황 및 결과'), {}, {}, hd('가능성\n(빈도)'), hd('중대성\n(강도)'), hd('위험성'), hd('NO'), hd('세부내용'), {}, {}, {}, {}]
    ];
    var riskLabel = function (v) { return v >= 6 ? '높음' : v === 4 ? '보통' : '낮음'; };
    (E.results || []).forEach(function (r) {
      var p = +r.p || 0, s = +r.s || 0, rv = p && s ? p * s : '';
      var f = { fontSize: 7.5, lineHeight: 1.25 };
      rsBody.push([
        Object.assign({ text: cl(r.task), alignment: 'center' }, f),
        Object.assign({ text: cl(r.cls), alignment: 'center' }, f),
        Object.assign({ text: cl(r.situation) }, f),
        Object.assign({ text: cl(r.measure) }, f),
        Object.assign({ text: cl(r.cases) }, f),
        Object.assign({ text: p ? String(p) : '', alignment: 'center' }, f),
        Object.assign({ text: s ? String(s) : '', alignment: 'center' }, f),
        Object.assign({ text: rv ? rv + '\n(' + riskLabel(rv) + ')' : '', alignment: 'center' }, f),
        Object.assign({ text: cl(r.redNo), alignment: 'center' }, f),
        Object.assign({ text: cl(r.redText) }, f),
        Object.assign({ text: cl(r.after), alignment: 'center' }, f),
        Object.assign({ text: cl(r.plan), alignment: 'center' }, f),
        Object.assign({ text: cl(r.done), alignment: 'center' }, f),
        Object.assign({ text: cl(r.owner), alignment: 'center' }, f)
      ]);
    });
    content.push({ _big: true, table: { headerRows: 4, dontBreakRows: true, widths: [44, 50, '*', 104, 40, 26, 26, 30, 18, 78, 30, 38, 34, 38], body: rsBody }, layout: tight });

    /* ===== 3. 위험성평가 교육 ===== */
    divider('3.\n위험성평가\n교육');
    var eduPage = function (title, dateKey, placeKey, topics, p1, p2) {
      pageBreak();
      content.push(lineTitle(y(title)));
      var place = sch[placeKey] || '';
      var row = function (lbl, v) { return { text: [{ text: 'o ' }, { text: lbl, bold: true }, ' ' + cl(v)], fontSize: 11, margin: [0, 0, 0, 16] }; };
      content.push({ text: '□ 교육결과', fontSize: 11, margin: [0, 0, 0, 18] });
      content.push(row('(일    시)', D.dot(sch[dateKey]) || D.ym(info.writeDate)));
      content.push(row('(장    소)', place));
      content.push(row('(교 육 자)', ceoTxt));
      content.push(row('(참 석 자)', wRoleNames.join(', ')));
      content.push({ text: 'o (교육내용)', bold: true, fontSize: 11, margin: [0, 2, 0, 8] });
      topics.forEach(function (t) { content.push({ text: 'o ' + y(t), fontSize: 10, margin: [0, 0, 0, 8] }); });
      content.push({ text: '□ 사진대지', fontSize: 11, margin: [0, 12, 0, 8] });
      var pw = (PW - 12) / 2, ph = pw * 3 / 4;
      content.push({ table: { widths: ['*', '*'], body: [[photoCell(photos[p1], pw - 4, ph - 4), photoCell(photos[p2], pw - 4, ph - 4)], [{ text: '사진', alignment: 'center', fontSize: 8 }, { text: '사진', alignment: 'center', fontSize: 8 }]] }, layout: thin, unbreakable: true });
    };
    eduPage('{Y}년 위험성평가 사전 교육 결과', 'preEduDate', 'preEduPlace', (E.preEdu || {}).topics || [], 'pre1', 'pre2');
    /* 청취조사표 */
    pageBreak();
    var ivRows = [
      [{ stack: [{ text: '근로자 청취조사에 의한 유해·위험요인 조사표', bold: true, alignment: 'center', fontSize: 10 }, { text: '*알기 쉬운 위험성평가 업무 가이드북(도로교통연구원, 2020년)', fontSize: 6.5, alignment: 'right' }], colSpan: 2 }, {}],
      [lab('실시대상', { fillColor: LGRAY }), val(contract || '용역명')],
      [lab('수행자(소속/성명)', { fillColor: LGRAY }), val(ceoTxt)],
      [lab('근로자(소속/성명)', { fillColor: LGRAY }), val(wRoleNames.join(', '))],
      [lab('수행일시', { fillColor: LGRAY }), val(D.dot(sch.interviewDate || info.writeDate))]
    ];
    content.push({ table: { widths: [130, '*'], body: ivRows }, layout: thin });
    (E.interviews || []).forEach(function (iv, i) {
      var wn = workers[iv.worker] ? cl(workers[iv.worker].name) : (wNames[0] || '');
      var ivb = [];
      ivb.push([{ text: '경험담 ' + (i + 1) + '   성 명 : ' + wn + '  (인)', bold: true, fontSize: 8.5, fillColor: LGRAY }]);
      ivb.push([{ stack: [
        { text: '【대상공종】' + cl(iv.work), fontSize: 8.5, margin: [0, 2, 0, 3] },
        { text: '【근로자 의견】' + cl(iv.opinion), fontSize: 8.5, margin: [0, 0, 0, 3] },
        { text: '【위험성평가 담당자 의견】' + cl(iv.reply), fontSize: 8.5, lineHeight: 1.35, margin: [0, 0, 0, 4] }
      ] }]);
      content.push({ table: { widths: ['*'], body: ivb }, layout: { hLineWidth: function (k) { return k === 0 ? 0 : 0.6; }, vLineWidth: function () { return 0.6; } } });
    });
    eduPage('{Y}년 위험성평가 결과 교육 실시', 'postEduDate', 'postEduPlace', (E.postEdu || {}).topics || [], 'post1', 'post2');

    /* ===== 4. 기타 제출서류 ===== */
    divider('4.\n기타\n제출서류');
    pageBreak();
    content.push({ text: '[수급업체 산업재해예방 조치능력 평가표(#2,#4)*]', fontSize: 13, alignment: 'center', margin: [0, 0, 0, 6] });
    content.push({ text: '* 공사 2억원 미만, 용역 고시금액 미만 시', fontSize: 10, margin: [0, 0, 0, 14] });
    content.push({ columns: [{ width: '*', text: '' }, { width: 300, table: { widths: [50, '*', '*', '*'], heights: [14, 30], body: [
      [{ text: '결\n\n재', rowSpan: 2, alignment: 'center', fontSize: 8, margin: [0, 6, 0, 0] }, { text: '담당자', alignment: 'center', fontSize: 8 }, { text: '팀장', alignment: 'center', fontSize: 8 }, { text: '기관장', alignment: 'center', fontSize: 8 }],
      [{}, '', '', '']
    ] }, layout: thin }], margin: [0, 0, 0, 14] });
    var sc = ev.scores;
    var scTxt = function (k) { var v = sc[k]; return v === 'exclude' ? '제외' : v == null ? '' : String(v); };
    var evBody = [
      [lab('사업명', { fontSize: 8 }), val(contract, { fontSize: 7.5 }), lab('업체명', { fontSize: 8 }), val(company, { fontSize: 7.5 }), lab('계약기간', { fontSize: 8 }), { text: D.contract(info.contractStart) + ' ~\n' + D.contract(info.contractEnd), colSpan: 3, alignment: 'center', fontSize: 8 }, {}, {}],
      [lab('평가항목', { colSpan: 2, fontSize: 8 }), {}, lab('세부항목', { colSpan: 3, fontSize: 8 }), {}, {}, lab('배점', { fontSize: 8 }), lab('자기배점', { fontSize: 8 }), lab('심사배점', { fontSize: 8 })]
    ];
    var lastGroup = '';
    F.evalItems.forEach(function (it, idx) {
      if (it.group !== lastGroup) { evBody.push([{ text: F.evalGroups[it.group], colSpan: 8, alignment: 'center', fontSize: 8.5 }, {}, {}, {}, {}, {}, {}, {}]); lastGroup = it.group; }
      var nameCell;
      if (it.key === 'q2a') nameCell = { text: it.name, colSpan: 2, rowSpan: 2, fontSize: 8 };
      else if (it.key === 'q2b') nameCell = {};
      else nameCell = { text: it.name, colSpan: 2, fontSize: 8 };
      evBody.push([nameCell, {}, { text: it.sub, colSpan: 3, fontSize: 8 }, {}, {}, { text: String(it.max), alignment: 'center', fontSize: 8 }, { text: scTxt(it.key), alignment: 'center', fontSize: 8 }, { text: '' }]);
    });
    evBody.push([{ text: '소계', colSpan: 6, alignment: 'center', fontSize: 8.5 }, {}, {}, {}, {}, {}, { text: ev.done || Object.keys(sc).length ? String(ev.subtotal) : '', alignment: 'center', fontSize: 8.5 }, '']);
    evBody.push([{ text: '합 계', colSpan: 2, alignment: 'center', fontSize: 8.5 }, {}, { text: ev.total != null ? ev.total + '점' : '', colSpan: 6, alignment: 'center', fontSize: 8.5 }, {}, {}, {}, {}, {}]);
    evBody.push([{ text: '평가등급', colSpan: 2, alignment: 'center', fontSize: 8.5 }, {}, { text: ev.grade ? ev.grade + (ev.note ? ' (' + ev.note + ')' : '') : '', colSpan: 6, alignment: 'center', fontSize: 8.5 }, {}, {}, {}, {}, {}]);
    evBody.push([{ text: '수급업체 평가등급', colSpan: 2, alignment: 'center', fontSize: 8 }, {}, { text: F.evalGrade, colSpan: 6, fontSize: 8 }, {}, {}, {}, {}, {}]);
    content.push({ table: { widths: [54, 50, 54, 50, 50, 46, 46, '*'], body: evBody }, layout: thin, margin: [0, 0, 0, 10] });
    content.push({ table: { widths: ['*'], body: [[{ stack: [{ text: F.evalAction[0], bold: true, fontSize: 9 }].concat(F.evalAction.slice(1).map(function (t) { return { text: t, fontSize: 8.5 }; })) }]] }, layout: { hLineWidth: function () { return 1.2; }, vLineWidth: function () { return 1.2; } } });
    /* 34~37쪽 평가 기준 */
    pageBreak();
    F.evalCriteria.forEach(function (cr) {
      if (cr.h) {
        var hb = [{ text: cr.h, bold: true, fontSize: 10, margin: [0, 8, 0, 6] }];
        if (cr.note) hb.push({ table: { widths: ['*'], body: [[{ text: cr.note, fontSize: 8.5 }]] }, layout: thin, margin: [0, 0, 0, 10] });
        content.push({ stack: hb, unbreakable: true, _keepNext: true });
        return;
      }
      if (cr.notes) { cr.notes.forEach(function (t) { content.push({ text: t, fontSize: 8.5, margin: [0, 3, 0, 3] }); }); return; }
      var blk = [{ text: cr.t, fontSize: 9.5, margin: [0, 6, 0, 6] }];
      if (cr.head) {
        var w = cr.head.length === 4 ? [140, '*', '*', '*'] : [140, '*', '*'];
        blk.push({ table: { widths: w, body: [cr.head.map(function (h) { return { text: h, alignment: 'center', fontSize: 8.5, fillColor: GRAY }; }), cr.row.map(function (v, i) { return { text: v, fontSize: 8.5, alignment: i ? 'center' : 'left' }; })] }, layout: thin, margin: [0, 0, 0, 4] });
        cr.desc.forEach(function (t) { blk.push({ text: t, fontSize: 8.5, lineHeight: 1.4, margin: [0, 1, 0, 1] }); });
        blk.push({ text: ' ', margin: [0, 0, 0, 6] });
      }
      content.push(blk.length > 1 || !cr.head ? { stack: blk, unbreakable: !!cr.head } : blk[0]);
    });

    /* 38쪽 안전예산 */
    pageBreak();
    var h1 = function (t) { return { text: t, bold: true, fontSize: 13, margin: [0, 0, 0, 14] }; };
    content.push(h1('안전 예산 현황'));
    content.push({ text: 'ㅇ 안전예산 편성 현황 (단위 : 천원)', fontSize: 10, margin: [0, 0, 0, 10] });
    var bsum = 0, anyAmt = false;
    (E.budget || []).forEach(function (b) {
      if (/^\s*-/.test(b.item)) { var n = String(b.amount || '').replace(/[^\d]/g, ''); if (n) { bsum += +n; anyAmt = true; } }
    });
    // 하위항목(-로 시작) 합계가 없으면 상위항목 금액 합계 사용
    if (!anyAmt) (E.budget || []).forEach(function (b) { var n = String(b.amount || '').replace(/[^\d]/g, ''); if (n) { bsum += +n; anyAmt = true; } });
    content.push({ _big: true, table: { headerRows: 2, widths: ['*', 150], body: [
      [{ text: '구 분', rowSpan: 2, alignment: 'center', fillColor: BLUE, bold: true, fontSize: 9, margin: [0, 6, 0, 0] }, { text: String(Y), alignment: 'center', fillColor: BLUE, bold: true, fontSize: 9 }],
      [{}, { text: '예산', alignment: 'center', fillColor: BLUE, bold: true, fontSize: 9 }],
      [{ text: '계', alignment: 'center', fontSize: 9 }, { text: anyAmt ? bsum.toLocaleString('ko-KR') : '', alignment: 'center', fontSize: 9 }]
    ].concat((E.budget || []).map(function (b) { return [{ text: cl(b.item), fontSize: 8.5 }, { text: L.fmtMoney(b.amount), alignment: 'center', fontSize: 8.5 }]; })) }, layout: thin });

    /* 39쪽 위험작업 관리계획 */
    pageBreak();
    content.push(h1('위험작업 관리계획'));
    content.push({ text: 'ㅇ 위험작업 검토', fontSize: 10, margin: [0, 0, 0, 10] });
    content.push({ _big: true, table: { headerRows: 1, widths: [110, 50, '*', 50], body: [
      ['작업내용', '위 치', '세부 공종 예시', '해당\n여부'].map(function (h) { return { text: h, alignment: 'center', bold: true, fontSize: 9, fillColor: LGRAY }; })
    ].concat((E.dangerWork || []).map(function (d) { return [{ text: cl(d.work), fontSize: 8.5 }, { text: cl(d.place), alignment: 'center', fontSize: 8.5 }, { text: cl(d.detail), fontSize: 8.5, lineHeight: 1.35 }, { text: d.yes ? '√' : '', alignment: 'center', fontSize: 10 }]; })) }, layout: { hLineWidth: function (i, n) { return i < 2 || i === n.table.body.length ? 0.8 : 0.3; }, vLineWidth: function () { return 0; } }, margin: [0, 0, 0, 18] });
    (E.dangerPlan || []).forEach(function (d) {
      content.push({ text: [{ text: cl(d.b), bold: true }, cl(d.t)], fontSize: 10, lineHeight: 1.5, margin: [0, 0, 0, d.sub ? 2 : 12] });
      if (d.sub) content.push({ text: cl(d.sub), fontSize: 8, margin: [0, 0, 0, 12] });
    });

    /* 40쪽 개인보호구 */
    pageBreak();
    content.push(h1('개인보호구'));
    content.push({ text: '□ 개인보호구 지급계획서', fontSize: 10, bold: true, margin: [0, 0, 0, 8] });
    var ppe = E.ppe || { rows: [], mgmt: [] };
    var ppeRows = (ppe.rows || []);
    var targetTxt = (wRoleNames.length ? wRoleNames.join('\n') : '운전원') + (ppe.team ? '\n\n' + cl(ppe.team) : '');
    var ppeBody = [['대상자', '지급계획', '비고'].map(function (h) { return { text: h, alignment: 'center', bold: true, fontSize: 9, fillColor: LGRAY }; })];
    ppeRows.forEach(function (r, i) {
      ppeBody.push([i === 0 ? { text: targetTxt, rowSpan: Math.max(1, ppeRows.length), alignment: 'center', fontSize: 8.5, lineHeight: 1.3 } : {}, { text: cl(r.plan), fontSize: 8.5, lineHeight: 1.5 }, { text: cl(r.note), fontSize: 8, alignment: 'center' }]);
    });
    if (!ppeRows.length) ppeBody.push([{ text: targetTxt, fontSize: 8.5 }, '', '']);
    content.push({ _big: true, table: { headerRows: 1, widths: [130, '*', 110], body: ppeBody }, layout: { hLineWidth: function (i, n) { return 0.6; }, vLineWidth: function (i, n) { return i === 0 || i === 3 ? 0 : 0.6; } }, margin: [0, 0, 0, 22] });
    content.push({ text: '□ 개인보호구 관리·운영방안', fontSize: 10, bold: true, margin: [0, 0, 0, 8] });
    (ppe.mgmt || []).forEach(function (t) { content.push({ text: 'ㅇ ' + cl(t), fontSize: 10, margin: [0, 0, 0, 6] }); });

    /* 41쪽 안전점검 계획 */
    pageBreak();
    content.push(h1('안전점검 계획'));
    content.push({ text: '□ 작업전 안전점검 항목 및 계획', fontSize: 10, bold: true, margin: [0, 0, 0, 10] });
    content.push({ text: 'ㅇ 고위험요인 안전점검 항목 (※ 위험성 높은 작업 중심으로 작성)', fontSize: 9.5, margin: [0, 0, 0, 4] });
    content.push({ text: '- 작업전 일일점검 시행', fontSize: 9.5, margin: [0, 0, 0, 10] });
    content.push({ _big: true, table: { headerRows: 1, widths: [80, '*', '*', 50], body: [
      ['공정', '위험요소', '안전점검사항', '비고'].map(function (h) { return { text: h, alignment: 'center', bold: true, fontSize: 9, fillColor: LGRAY }; })
    ].concat((E.inspection || []).map(function (r) { return [{ text: cl(r.proc), alignment: 'center', fontSize: 8.5 }, { text: cl(r.risk), fontSize: 8.5, lineHeight: 1.4 }, { text: cl(r.check), fontSize: 8.5, lineHeight: 1.4 }, { text: cl(r.note), fontSize: 8.5 }]; })) }, layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function (i, n) { return i === 0 || i === 4 ? 0 : 0.6; } }, margin: [0, 0, 0, 16] });
    content.push({ text: 'ㅇ 점검계획', fontSize: 10, margin: [0, 0, 0, 6] });
    (E.inspectionPlan || []).forEach(function (t) { content.push({ text: cl(t), fontSize: 10, margin: [0, 0, 0, 4] }); });

    /* 42쪽 교육실적 */
    pageBreak();
    content.push(h1('교육실적'));
    content.push({ text: '□ 산업재해 예방 교육 실적(제설작업 관련)', fontSize: 10, bold: true, margin: [0, 0, 0, 10] });
    var newEdu = A.q7 === 'O' ? 'O' : A.q7 === 'X' ? 'X' : 'O/X';
    content.push({ _big: true, table: { headerRows: 1, widths: [70, 70, 40, 40, '*', 60], body: [
      ['구분', '대상', '기준', '실시', '대상자', '비고'].map(function (h) { return { text: h, alignment: 'center', bold: true, fontSize: 9, fillColor: LGRAY }; })
    ].concat((E.eduRecord || []).map(function (r) {
      return [{ text: cl(r.kind), fontSize: 8.5 }, { text: cl(r.target), fontSize: 8.5 }, { text: cl(r.std), alignment: 'center', fontSize: 8.5 }, { text: r.done === 'auto' ? newEdu : cl(r.done), alignment: 'center', fontSize: 8.5 }, { text: wNames.join(', '), fontSize: 8.5 }, { text: cl(r.note), fontSize: 8.5 }];
    })) }, layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function (i) { return i === 0 || i === 6 ? 0 : 0.6; } }, margin: [0, 0, 0, 20] });
    content.push({ text: 'ㅇ 사진대지', fontSize: 10, bold: true, margin: [0, 0, 0, 8] });
    var eW = PW - 8, eH = eW / 1.6;
    content.push({ table: { widths: [120, '*'], body: [
      [{ colSpan: 2, stack: [photoCell(photos.edu, eW - 8, eH - 8)] }, {}],
      [{ text: '내 용', alignment: 'center', fontSize: 9 }, { text: cl(E.eduPhotoLabel || ''), alignment: 'center', fontSize: 9 }]
    ] }, layout: thin, unbreakable: true });

    /* 43쪽 신호 및 연락체계 */
    pageBreak();
    content.push(h1('신 호 및 연 락 체 계'));
    content.push({ text: '□ 연락체계', fontSize: 10, bold: true, margin: [0, 0, 0, 10] });
    var ctBody = [
      [{ text: (company || '00 회사') + ' 연락처', colSpan: 4, alignment: 'center', bold: true, fontSize: 9, fillColor: LGRAY }, {}, {}, {}],
      ['구 분', '성 명', '연락처', '관계'].map(function (h) { return { text: h, alignment: 'center', bold: true, fontSize: 9 }; }),
      [{ text: '사 장', alignment: 'center', fontSize: 9 }, val(ceo), val(info.ceoPhone), '']
    ];
    (workers.length ? workers : [{ name: '', phone: '', role: '운전원' }]).forEach(function (w) {
      ctBody.push([{ text: '근로자\n(' + cl(w.role || '운전원') + ')', alignment: 'center', fontSize: 9 }, val(w.name), val(w.phone), '']);
    });
    (c.emergency || []).forEach(function (em, i) {
      ctBody.push([{ text: '비상연락처 ' + (i + 1), alignment: 'center', fontSize: 9 }, val(em.name), val(em.phone), val(em.rel)]);
    });
    content.push({ _big: true, table: { headerRows: 2, widths: [90, '*', '*', 70], body: ctBody }, layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function (i) { return i === 0 || i === 4 ? 0 : 0.6; } } });

    /* 44쪽 비상대책 */
    pageBreak();
    content.push(h1('비 상 대 책'));
    content.push({ text: '□ 재해발생 시 행동매뉴얼', fontSize: 10, bold: true, margin: [0, 0, 0, 10] });
    content.push({ text: '(예시 1) 재해발생시 흐름도', fontSize: 9.5, bold: true, margin: [0, 0, 0, 10] });
    var flowBody = [];
    (E.emergencyFlow || []).forEach(function (f, i, arr) {
      flowBody.push([{ text: cl(f.step), bold: true, fontSize: 8, alignment: 'center', border: [true, true, true, true] }, { text: cl(f.text), fontSize: 8, border: [false, false, false, false], margin: [4, 2, 0, 0] }]);
      if (i < arr.length - 1) flowBody.push([{ text: '↓', alignment: 'center', fontSize: 8, border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }]);
    });
    content.push({ _big: true, table: { widths: [70, '*'], body: flowBody }, layout: thin, margin: [0, 0, 0, 18] });
    content.push({ text: '□ 재해발생 시 유관기관 연락망', fontSize: 10, bold: true, margin: [0, 0, 0, 10] });
    var ag = c.agencies || {};
    var agn = function (k, def) { return cl((ag[k] && ag[k].name) || def); };
    var agp = function (k) { return cl((ag[k] && ag[k].phone) || '000-000-0000'); };
    content.push({ table: { widths: ['*', '*', '*', '*'], body: [
      [{ text: '긴급 구호기관 연락처(관리구간 및 작업장 접근성 등 고려 선정)', colSpan: 4, alignment: 'center', bold: true, fontSize: 9, fillColor: GRAY }, {}, {}, {}],
      [val(agn('fire', '00 119안전센터'), { fontSize: 8 }), val(agp('fire'), { fontSize: 8 }), val(agn('hospital', '00 병원'), { fontSize: 8 }), val(agp('hospital'), { fontSize: 8 })],
      [val(agn('police', '00 경찰서'), { fontSize: 8 }), val(agp('police'), { fontSize: 8 }), val(agn('patrol', '고속도로 00지구대 순찰대'), { fontSize: 8 }), val(agp('patrol'), { fontSize: 8 })]
    ] }, layout: thin });

    return {
      pageSize: 'A4', pageOrientation: 'portrait',
      pageBreakBefore: function (node, followingOnPage) {
        // 제목(머리글)만 페이지 끝에 홀로 남지 않도록
        return !!(node.headlineLevel === 1 && followingOnPage.length === 0);
      },
      pageMargins: [62, 42, 57, 42],
      defaultStyle: { font: 'NotoKR', fontSize: 9, lineHeight: 1.15 },
      info: { title: (contract || '위험성평가') + ' 위험성평가 결과보고서', author: company },
      content: finalize(content)
    };
  }

  /* 모든 표: 한 행이 두 쪽으로 쪼개지지 않게. 크기가 정해진 표·상자는 통째로 다음 쪽으로 넘김.
   * 「<표 n>」 제목은 아래 표와 함께 묶음. */
  function finalize(content) {
    function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.table) {
        n.table.dontBreakRows = true;
        n.table.body.forEach(function (row) { row.forEach(walk); });
      }
      ['stack', 'columns', 'content'].forEach(function (k) { if (n[k]) walk(n[k]); });
    }
    var out = [];
    for (var i = 0; i < content.length; i++) {
      var n = content[i];
      walk(n);
      if (n && n.table && !n._big && !n.table.heights) n.unbreakable = true;
      if (n && typeof n.text === 'string' && /^<표 \d>/.test(n.text) && content[i + 1]) {
        var nx = content[i + 1]; walk(nx);
        out.push({ stack: [n, nx], unbreakable: true }); i++; continue;
      }
      if (n && n._keepNext && content[i + 1] && !content[i + 1]._big) {
        var nx2 = content[i + 1]; walk(nx2);
        out.push({ stack: [n, nx2], unbreakable: true }); i++; continue;
      }
      // 표 바로 앞의 제목 글은 페이지 맨 끝에 홀로 남지 않게
      if (n && typeof n.text !== 'undefined' && !n.table && content[i + 1] && (content[i + 1].table || content[i + 1].stack)) n.headlineLevel = 1;
      out.push(n);
    }
    return out;
  }

  g.PDFDOC = { build: build };
})(window);
