/* 특별교육 — 안전교육일지 + 교육참석자 명단 + 사진대지 PDF */
(function (g) {
  'use strict';
  var L = LOGIC, D = L.D;
  var LGRAY = '#F1F1F1';
  function cl(s) { return L.clean(s); }
  var line = function (w) { return { hLineWidth: function () { return w || 0.8; }, vLineWidth: function () { return w || 0.8; } }; };
  function lab(t, x) { return Object.assign({ text: t, bold: true, alignment: 'center', fontSize: 10, fillColor: LGRAY }, x || {}); }
  function v(t, x) { return Object.assign({ text: cl(t), fontSize: 10, alignment: 'center' }, x || {}); }
  function korDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? m[1] + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일' : '        년    월    일'; }

  function build(c, S) {
    var info = c.info || {}, ed = (c.docs && c.docs.sedu) || {};
    var company = cl(info.company);
    var workers = (c.workers || []).filter(function (w) { return w.name && w.name.trim(); });
    var N = workers.length;
    var absent = ed.allDone === 'X' ? Math.max(0, Math.min(N, +ed.absent || 0)) : 0;
    var done = N - absent;
    var content = [], sigPages = {};
    var W = 476, LW = 62;   // 본문 폭, 왼쪽 제목칸 폭

    /* 머리: 제목 + 결재 */
    var apv = (S.approvals && S.approvals.length) ? S.approvals : [{ label: '담 당 자' }];
    var head = [[{ rowSpan: 2, stack: [{ text: cl(S.title), fontSize: 20, bold: true, alignment: 'center', margin: [0, 6, 0, 2] }, { text: cl(S.subtitle), fontSize: 12, bold: true, alignment: 'center', margin: [0, 0, 0, 4] }] },
      { text: '결\n\n재', rowSpan: 2, alignment: 'center', fontSize: 10, margin: [0, 8, 0, 0], fillColor: LGRAY }]
      .concat(apv.map(function (a) { return v(a.label, { fillColor: LGRAY }); })),
      [{}, {}].concat(apv.map(function () { return { text: ' ', margin: [0, 14, 0, 14] }; }))];
    content.push({ id: 'sig_edu', table: { widths: ['*', 22].concat(apv.map(function () { return 68; })), body: head }, layout: line(), margin: [0, 0, 0, 0] });

    var t = function (widths, body, extra) { content.push(Object.assign({ table: { widths: widths, body: body, dontBreakRows: true }, layout: line(), margin: [0, -0.8, 0, 0] }, extra || {})); };
    /* 왼쪽 제목칸 하나 + 오른쪽 안쪽 표 (rowSpan 대신: 높이 계산이 정확함) */
    var inner = { hLineWidth: function (i, n) { return i === 0 || i === n.table.body.length ? 0 : 0.8; }, vLineWidth: function (i, n) { return i === 0 || i === n.table.widths.length ? 0 : 0.8; } };
    var outer = { hLineWidth: function () { return 0.8; }, vLineWidth: function () { return 0.8; },
      paddingLeft: function (i) { return i === 1 ? 0 : 4; }, paddingRight: function (i) { return i === 1 ? 0 : 4; }, paddingTop: function () { return 0; }, paddingBottom: function () { return 0; } };
    var sect = function (label, widths, body, extra) {
      content.push(Object.assign({ table: { widths: [LW, '*'], dontBreakRows: true, body: [[lab(label, { margin: [0, 3, 0, 3], fontSize: label.length > 8 ? 9 : 10 }), { table: { widths: widths, body: body, dontBreakRows: true }, layout: inner }]] }, layout: outer, margin: [0, -0.8, 0, 0] }, extra || {}));
    };
    /* 교육일시 */
    t([LW, '*'], [[lab('교육일시', { margin: [0, 3, 0, 3] }), v(korDate(ed.date) + '  ' + (ed.time || S.timeText || ''), { alignment: 'left', margin: [2, 3, 0, 3] })]]);
    /* 교육구분 */
    var kinds = S.kinds || [], kb = [];
    for (var i = 0; i < kinds.length; i += 2) {
      var a = kinds[i], b = kinds[i + 1];
      kb.push([
        v((i + 1) + '. ' + (a.on ? '■' : '□') + ' ' + a.label, { alignment: 'left', margin: [2, 2, 0, 2] }),
        b ? v((i + 2) + '. ' + (b.on ? '■' : '□') + ' ' + b.label, { alignment: 'left', margin: [2, 2, 0, 2] }) : v('')]);
    }
    if (kb.length) sect('교육구분', ['*', '*'], kb);
    /* 교육인원 */
    var reason = ed.allDone === 'X' && absent ? (ed.reason || '') : '-';
    sect('교육인원', [110, 70, '*'], [
      [lab('구 분'), lab('계'), lab('교육 미이수 사유')],
      [v('교육 대상자(명)'), v(N ? String(N) : ''), v('-')],
      [v('교육 이수자(명)'), v(N ? String(done) : ''), v('-')],
      [v('교육 미이수자(명)'), v(absent ? String(absent) : '-'), v(reason)]
    ]);
    /* 교육제목 */
    t([LW, '*'], [[lab('교육제목', { margin: [0, 3, 0, 3] }), v(S.eduTitle, { bold: true, alignment: 'left', margin: [2, 3, 0, 3] })]]);
    /* 교육자료 */
    var mats = S.materials || [], mrow = [lab('교육자료', { margin: [0, 3, 0, 3] })], mw = [LW];
    mats.forEach(function (m) { mrow.push(v(m.label, { margin: [0, 3, 0, 3] }), v(m.on ? '■' : '□', { margin: [0, 3, 0, 3] })); mw.push('*', 28); });
    mrow.push(v('기타', { margin: [0, 3, 0, 3] }), v(S.materialEtc || '-', { margin: [0, 3, 0, 3] })); mw.push('*', '*');
    t(mw, [mrow]);
    /* 교육내용 (길면 다음 쪽으로 이어짐) */
    var stack = [];
    (S.blocks || []).forEach(function (bl, bi) {
      stack.push({ text: cl(String(bl.head || '').replace(/\{N\}/g, N ? String(N) : '○○')), bold: true, fontSize: 10, margin: [0, bi ? 6 : 2, 0, 1] });
      (bl.items || []).forEach(function (it) { stack.push({ text: '○ ' + cl(it), fontSize: 9, lineHeight: 1.12, margin: [0, 0.3, 0, 0.3] }); });
    });
    content.push({ _big: true, table: { widths: [LW, '*'], body: [[lab('교육내용', { margin: [0, 4, 0, 0] }), { stack: stack, margin: [4, 2, 4, 4] }]] }, layout: line(), margin: [0, -0.8, 0, 0] });
    /* 교육 실시자 및 장소 */
    var ins = (ed.instructors && ed.instructors.length ? ed.instructors : S.instructors) || [];
    var ib = [[lab('성 명'), lab('직 명'), lab('교육실시 장소')]];
    ins.forEach(function (r) { ib.push([v(r.name, { margin: [0, 1, 0, 1] }), v(r.title, { margin: [0, 1, 0, 1] }), v(r.place, { margin: [0, 1, 0, 1] })]); });
    sect('교육 실시자\n및 장소', ['*', '*', '*'], ib);

    /* 교육 참석자 명단 */
    content.push({ text: '', pageBreak: 'before' });
    content.push({ text: '교 육 참 석 자 명 단', fontSize: 18, bold: true, alignment: 'center', decoration: 'underline', margin: [0, 0, 0, 10] });
    content.push({ text: '(' + korDate(ed.date) + ')', alignment: 'right', fontSize: 10, margin: [0, 0, 0, 4] });
    var rows = Math.max(+S.rosterRows || 22, N), rb = [[lab('연 번'), lab('소 속'), lab('성 명'), lab('서 명'), lab('비 고')]];
    for (var r = 0; r < rows; r++) {
      var w = workers[r];
      rb.push([v(String(r + 1), { margin: [0, 3.5, 0, 3.5] }), v(w ? company : '', { margin: [0, 3.5, 0, 3.5] }), v(w ? w.name : '', { margin: [0, 3.5, 0, 3.5] }), v(''), v('')]);
    }
    content.push({ id: 'sig_roster', _big: true, table: { headerRows: 1, dontBreakRows: true, widths: [36, '*', '*', '*', 50], body: rb }, layout: line(0.6) });

    /* 사진대지 */
    content.push({ text: '', pageBreak: 'before' });
    content.push({ text: '사 진 대 지', fontSize: 18, bold: true, alignment: 'center', decoration: 'underline', margin: [0, 0, 0, 12] });
    var ph = c.photos || {};
    var cellImg = function (k) { return ph[k] ? { image: ph[k], fit: [W - 20, 320], alignment: 'center', margin: [0, 8, 0, 8] } : { text: '', margin: [0, 160, 0, 160] }; };
    content.push({ table: { widths: ['*'], heights: [336, 336], body: [[cellImg('sedu1')], [cellImg('sedu2')]] }, layout: line(1) });

    return {
      pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [56, 32, 56, 30],
      defaultStyle: { font: 'NotoKR', fontSize: 10, lineHeight: 1.2 },
      info: { title: '안전교육일지', author: company },
      pageBreakBefore: function (node) {
        if (node.id && /^sig_/.test(node.id)) sigPages[node.id] = (node.pageNumbers || []).slice();
        return false;
      },
      footer: function (cur) { return { text: '- ' + cur + ' -', alignment: 'center', fontSize: 8, color: '#777', margin: [0, 12, 0, 0] }; },
      _sigPages: sigPages,
      content: content
    };
  }
  g.EDUDOC = { build: build };
})(window);
