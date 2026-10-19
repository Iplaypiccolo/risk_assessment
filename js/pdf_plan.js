/* 작업계획서 PDF (pdfmake 문서 정의). 첨부 PDF·한글·워드는 app 쪽에서 pdf-lib로 덧붙임 */
(function (g) {
  'use strict';
  var L = LOGIC, D = L.D;
  var LGRAY = '#EFEFEF', BLUE = '#1F3FD1';
  function cl(s) { return L.clean(s); }
  var thin = { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0.6; } };
  function box(t, x) { return Object.assign({ text: cl(t), fontSize: 9, alignment: 'center' }, x || {}); }
  function lab(t, x) { return Object.assign({ text: t, fontSize: 9, alignment: 'center', bold: true, fillColor: LGRAY }, x || {}); }
  function yy(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? '’' + m[1].slice(2) + '.' + m[2] + '.' + m[3] + '.' : ''; }

  /* c: 업체 기록, P: 작업계획서 설정(SET.plan), A: 첨부 목록 [{no, title, file}] → 이미지 첨부는 여기서 쪽으로 넣음 */
  function build(c, P, opt) {
    opt = opt || {};
    var info = c.info || {}, pd = (c.docs && c.docs.plan) || {};
    var company = cl(info.company), ceo = cl(info.ceo);
    var workers = (c.workers || []).filter(function (w) { return w.name && w.name.trim(); });
    var names = workers.map(function (w) { return cl(w.name); });
    var workerTxt = names.length > 2 ? names.slice(0, 2).join(', ') + ' 등 ' + names.length + '명' : names.join(', ');
    var period = (yy(pd.start) || '’  .  .  .') + ' ~ ' + (yy(pd.end) || '’  .  .  .');
    var units = (pd.units || []).filter(function (u) { return typeOf(P, u.type); });
    var atts = opt.attachments || [];   // [{no, title, name, kind, data, unit}]
    var refs = function (pred) { var n = atts.filter(pred).map(function (a) { return a.no; }); return n.length ? '  (별첨 ' + n.join(', ') + ')' : ''; };
    var content = [], sigPages = {};

    if (!units.length) content.push({ text: '작업계획서를 만들 장비가 없습니다. 「장비」 단계에서 장비를 추가해 주세요.', fontSize: 12, margin: [0, 40, 0, 0] });

    units.forEach(function (u, ui) {
      var T = typeOf(P, u.type);
      if (ui > 0) content.push({ text: '', pageBreak: 'before' });
      var di = (u.driver === '' || u.driver == null) ? -1 : +u.driver;
      var drv = di >= 0 ? (c.workers || [])[di] : null;
      var apv = (P.approvals || []).length ? P.approvals : [{ label: '검토자', who: '사 업 주' }];
      var nA = apv.length;
      var whoTxt = function (a) {
        var w = cl(a.who || '');
        if (/사\s*업\s*주/.test(w) && ceo) w += '  ' + ceo;
        return w + ' (인)';
      };
      var body = [];
      apv.forEach(function (a, i) {
        var row = [];
        if (i === 0) row.push({ colSpan: 3, rowSpan: nA, stack: [
          { text: cl(T.name) + ' 작업계획서', fontSize: 17, alignment: 'center', margin: [0, nA > 1 ? 4 : 2, 0, 2] },
          { text: '- ' + cl(T.sub) + ' -', fontSize: 10, color: '#555', alignment: 'center', margin: [0, 0, 0, 2] }
        ] }, {}, {});
        else row.push({}, {}, {});
        row.push(lab(cl(a.label), { margin: [0, 5, 0, 5] }), box(whoTxt(a), { margin: [0, 5, 0, 5] }));
        body.push(row);
      });
      body.push([lab('작업명(장소)'), box(pd.workName || '', { colSpan: 2 }), {}, lab('작업기간'), box(period)]);
      body.push([lab('작업업체/작업자'), lab('업체명', { fillColor: null }), box(company), lab('작업자'), box(workerTxt)]);
      body.push([lab('운전원'), lab('성명', { fillColor: null }), { text: [cl(drv ? drv.name : ''), { text: ' ' + cl(P.driverNote || '') + refs(function (a) { return a.unit === ui && a.lic; }), fontSize: 7.5 }], fontSize: 9, alignment: 'left' }, lab('연락처'), box(drv ? drv.phone : '')]);
      body.push([lab('유도자'), lab('성명', { fillColor: null }), box((P.guide || {}).name || '', { alignment: 'left' }), lab('연락처'), box((P.guide || {}).phone || '')]);
      body.push([lab('사전조사 내용'), { colSpan: 4, text: [{ text: '[별첨] ', bold: true }, cl(P.surveyNote || '') + refs(function (a) { return a.unit == null; })], fontSize: 9 }, {}, {}, {}]);
      body.push([lab('기계·장비 제원'), { colSpan: 4, text: [{ text: '[별첨] ', bold: true }, cl(T.equipNote || '') + refs(function (a) { return a.unit === ui && !a.lic; })], fontSize: 9 }, {}, {}, {}]);
      content.push({ id: 'sig_plan_' + ui, table: { widths: [74, 46, '*', 52, 128], body: body }, layout: { hLineWidth: function (i, n) { return i === 0 || i === n.table.body.length ? 1.2 : 0.6; }, vLineWidth: function (i, n) { return i === 0 || i === n.table.widths.length ? 1.2 : 0.6; } }, margin: [0, 0, 0, 6] });

      /* 점검표 */
      var ck = T.checks || [], cb = [[lab('구분'), lab('점검 항목'), lab('적정'), lab('부적정'), lab('안전조치')]];
      ck.forEach(function (it, i) {
        var span = 1;
        if (i === 0 || ck[i - 1].group !== it.group) { while (ck[i + span] && ck[i + span].group === it.group) span++; }
        var first = i === 0 || ck[i - 1].group !== it.group;
        var txt = [{ text: (i + 1) + '. ' + cl(it.text), bold: !!it.hi, color: it.hi ? BLUE : 'black' }];
        if (it.note) txt.push({ text: '\n' + cl(it.note), fontSize: 7, color: '#333', bold: false });
        cb.push([
          first ? { text: cl(it.group), rowSpan: span, bold: true, alignment: 'center', fontSize: 9, fillColor: '#F6F6F6' } : {},
          { text: txt, fontSize: 8.5, lineHeight: 1.3 },
          { text: '□', alignment: 'center', fontSize: 11 }, { text: '□', alignment: 'center', fontSize: 11 },
          { text: cl(it.action || ''), fontSize: 7.5, alignment: 'center', color: '#444' }
        ]);
      });
      content.push({ _big: true, table: { headerRows: 1, widths: [52, '*', 30, 34, 80], body: cb }, layout: { hLineWidth: function (i, n) { return i === 0 || i === 1 || i === n.table.body.length ? 1.2 : 0.6; }, vLineWidth: function (i, n) { return i === 0 || i === n.table.widths.length ? 1.2 : 0.6; } }, margin: [0, 0, 0, 10] });

      /* 운행경로 및 작업방법 */
      var img = opt.routeImage ? opt.routeImage(u, T) : null;
      var st = T.steps || [];
      var rb = [[{ text: '운행경로 및 작업계획 도면', colSpan: 4, bold: true, alignment: 'center', fontSize: 10, fillColor: LGRAY, margin: [0, 2, 0, 2] }, {}, {}, {}],
        [img ? { colSpan: 4, image: img, fit: [440, 300], alignment: 'center', margin: [0, 6, 0, 6] } : { colSpan: 4, text: '(그림 없음)', alignment: 'center', color: '#999', margin: [0, 40, 0, 40] }, {}, {}, {}],
        [lab('작업내용(순서)', { colSpan: 2 }), {}, lab('위험요인'), lab('제거대책')]];
      st.forEach(function (s, i) {
        var span = 1, first = i === 0 || st[i - 1].work !== s.work;
        if (first) while (st[i + span] && st[i + span].work === s.work) span++;
        rb.push([{ text: String(i + 1), alignment: 'center', fontSize: 8.5 }, first ? { text: cl(s.work), rowSpan: span, alignment: 'center', fontSize: 8.5 } : {}, { text: cl(s.risk), fontSize: 8.5, alignment: 'center' }, { text: cl(s.fix), fontSize: 8.5, alignment: 'center' }]);
      });
      content.push({ unbreakable: true, stack: [{ text: '□ 운행경로 및 작업방법', fontSize: 12, margin: [0, 4, 0, 4] }, { table: { headerRows: 0, widths: [22, 90, '*', '*'], body: rb }, layout: { hLineWidth: function (i, n) { return i === 0 || i === n.table.body.length ? 1.2 : 0.6; }, vLineWidth: function (i, n) { return i === 0 || i === n.table.widths.length ? 1.2 : 0.6; } } }] });
    });

    /* 별첨 */
    if (atts.length) {
      content.push({ text: '', pageBreak: 'before' });
      content.push({ text: '별 첨 목 록', fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 14] });
      content.push({ table: { headerRows: 1, widths: [40, '*', 150, 90], body: [[lab('번호'), lab('내용'), lab('파일'), lab('비고')]].concat(atts.map(function (a) {
        return [box(String(a.no)), box(a.title, { alignment: 'left' }), box(a.name, { fontSize: 8 }),
          box(a.kind === 'image' ? '아래에 첨부' : a.kind === 'pdf' ? '뒤쪽에 첨부' : 'PDF 안의 첨부파일\n(따로 출력)', { fontSize: 8 })];
      })) }, layout: thin });
      atts.forEach(function (a) {
        if (a.kind !== 'image') return;
        content.push({ text: '', pageBreak: 'before' });
        content.push({ text: '별첨 ' + a.no + '. ' + cl(a.title), fontSize: 11, bold: true, margin: [0, 0, 0, 2] });
        content.push({ text: cl(a.name), fontSize: 8, color: '#666', margin: [0, 0, 0, 8] });
        content.push({ image: a.data, fit: [476, 690], alignment: 'center' });
      });
    }

    (function walk(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(walk); if (n.table) { n.table.dontBreakRows = true; n.table.body.forEach(function (r) { r.forEach(walk); }); } if (n.stack) walk(n.stack); })(content);
    return {
      pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [56, 40, 56, 40],
      defaultStyle: { font: 'NotoKR', fontSize: 9, lineHeight: 1.15 },
      info: { title: '작업계획서', author: company },
      pageBreakBefore: function (node, followingOnPage) {
        if (node.id && /^sig_/.test(node.id)) sigPages[node.id] = (node.pageNumbers || []).slice();
        return !!(node.headlineLevel === 1 && followingOnPage.length === 0);
      },
      footer: function (cur) { return { text: '- ' + cur + ' -', alignment: 'center', fontSize: 8, color: '#777', margin: [0, 14, 0, 0] }; },
      _sigPages: sigPages,
      content: content
    };
  }
  function typeOf(P, id) { return (P.types || []).filter(function (t) { return t.id === id; })[0]; }

  g.PLANDOC = { build: build, typeOf: typeOf };
})(window);
