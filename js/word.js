/* PDF용 문서 정의(pdfmake)를 그대로 Word(.docx) 파일로 바꿉니다.
 * 같은 내용·같은 표 모양을 쓰고, 줄 간격·쪽 나눔만 Word가 정합니다.
 * docx 라이브러리(lib/docx.min.js)는 「Word로 받기」를 누를 때 불러옵니다. */
(function (g) {
  'use strict';
  var X;                                   // window.docx
  var PAGE = { w: 595.28, h: 841.89 };     // A4 (pt)
  var FONT = '맑은 고딕';
  var tw = function (pt) { return Math.round(pt * 20); };            // pt → twip
  var imgDims = {};

  function color(c) {
    if (!c) return undefined;
    if (c === 'white') return 'FFFFFF';
    if (c === 'black') return '000000';
    c = String(c).replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    return /^[0-9a-fA-F]{6}$/.test(c) ? c.toUpperCase() : undefined;
  }
  function mg(m) {   // pdfmake margin → [왼, 위, 오른, 아래]
    if (m == null) return [0, 0, 0, 0];
    if (typeof m === 'number') return [m, m, m, m];
    if (m.length === 2) return [m[0], m[1], m[0], m[1]];
    return [m[0] || 0, m[1] || 0, m[2] || 0, m[3] || 0];
  }
  function inherit(ctx, n) {
    var o = Object.assign({}, ctx);
    ['fontSize', 'bold', 'alignment', 'color', 'lineHeight'].forEach(function (k) { if (n && n[k] != null) o[k] = n[k]; });
    return o;
  }
  function align(a) { return a === 'center' ? X.AlignmentType.CENTER : a === 'right' ? X.AlignmentType.RIGHT : a === 'justify' ? X.AlignmentType.JUSTIFIED : X.AlignmentType.LEFT; }
  function lineVal(lh) { return Math.max(200, Math.round(240 * (lh || 1.15) / 1.15)); }

  /* 빈 줄로 여백 만들기 (정확히 pt 높이) */
  function spacer(pt) { return new X.Paragraph({ spacing: { before: 0, after: 0, line: Math.max(20, tw(pt)), lineRule: X.LineRuleType.EXACT }, children: [] }); }

  /* 글자 → TextRun 목록 */
  function runs(t, ctx) {
    var out = [];
    (function add(v, c) {
      if (v == null) return;
      if (Array.isArray(v)) { v.forEach(function (x) { add(x, c); }); return; }
      if (typeof v === 'object') { add(v.text, inherit(c, v)); return; }
      String(v).split('\n').forEach(function (part, i) {
        out.push(new X.TextRun({ text: part, bold: !!c.bold, size: Math.round((c.fontSize || 9) * 2), color: color(c.color), break: i > 0 ? 1 : undefined }));
      });
    })(t, ctx);
    return out;
  }
  function para(children, ctx, m, extra) {
    m = m || [0, 0, 0, 0];
    return new X.Paragraph(Object.assign({
      children: children, alignment: align(ctx.alignment),
      spacing: { before: tw(Math.max(0, m[1])), after: tw(Math.max(0, m[3])), line: lineVal(ctx.lineHeight), lineRule: X.LineRuleType.AUTO },
      indent: (m[0] || m[2]) ? { left: tw(m[0]), right: tw(m[2]) } : undefined
    }, extra || {}));
  }
  function isEmpty(n) {
    if (n == null) return true;
    if (typeof n === 'string') return !n.trim();
    if (Array.isArray(n)) return n.every(isEmpty);
    if (n.table || n.image || n.canvas || n.columns) return false;
    if (n.stack) return isEmpty(n.stack);
    if ('text' in n) return isEmpty(n.text);
    return true;
  }
  function textOf(t) { if (t == null) return ''; if (Array.isArray(t)) return t.map(textOf).join(''); if (typeof t === 'object') return textOf(t.text); return String(t); }

  /* ---------- 글·묶음·그림·선 ---------- */
  function conv(n, ctx, avail) {
    if (n == null) return [];
    if (Array.isArray(n)) return n.reduce(function (a, x) { return a.concat(conv(x, ctx, avail)); }, []);
    if (typeof n === 'string' || typeof n === 'number') return [para(runs(String(n), ctx), ctx)];
    var c = inherit(ctx, n), m = mg(n.margin), out = [];
    if (n.table) {
      if (m[1] > 0) out.push(spacer(m[1]));
      out.push(table(n, c, avail, n._align));
      if (m[3] > 0) out.push(spacer(m[3]));
      return out;
    }
    if (n.stack) {
      if (m[1] > 0) out.push(spacer(m[1]));
      out = out.concat(conv(n.stack, c, avail - m[0] - m[2]));
      if (m[3] > 0) out.push(spacer(m[3]));
      return out;
    }
    if (n.columns) return columns(n, c, avail);
    if (n.image) return [para([image(n.image, n.width, n.height, n.fit, avail)], Object.assign({}, c, { lineHeight: 1 }), m)];
    if (n.canvas) return canvas(n, c, avail, m);
    if ('text' in n) {
      var t = textOf(n.text);
      if (!t && n.text !== 0) return [para([], Object.assign({}, c, { fontSize: Math.min(c.fontSize || 9, 9) }), m)];
      return [para(runs(n.text, c), c, m, n.headlineLevel ? { keepNext: true, keepLines: true } : null)];
    }
    return [];
  }
  /* centered() 와 결재칸처럼 한쪽만 내용이 있는 columns → 가운데/오른쪽 정렬 */
  function columns(n, c, avail) {
    var cols = n.columns, full = cols.map(function (x) { return !isEmpty(x); });
    var idx = full.indexOf(true);
    if (full.filter(Boolean).length === 1) {
      var col = cols[idx], al = idx === 0 ? 'left' : (idx === cols.length - 1 ? 'right' : 'center');
      var inner = col.stack && col.stack.length === 1 ? col.stack[0] : col;
      var mm = mg(n.margin), out = [];
      if (mm[1] > 0) out.push(spacer(mm[1]));
      if (inner.table) inner = Object.assign({}, inner, { _align: al });
      else inner = Object.assign({}, inner, { alignment: inner.alignment || al });
      out = out.concat(conv(inner, c, typeof col.width === 'number' ? col.width : avail));
      if (mm[3] > 0) out.push(spacer(mm[3]));
      return out;
    }
    /* 여러 칸: 테두리 없는 표로 */
    var widths = cols.map(function (x) { return x.width || '*'; });
    return conv({ table: { widths: widths, body: [cols.map(function (x) { return x; })] }, layout: 'noBorders', margin: n.margin }, c, avail);
  }
  function image(data, w, h, fit, avail) {
    var d = imgDims[data] || { w: 400, h: 300 };
    if (w && !h) h = w * d.h / d.w;
    if (h && !w) w = h * d.w / d.h;
    if (!w && !h) { w = d.w * 0.75; h = d.h * 0.75; }
    if (fit) { var s = Math.min(fit[0] / d.w, fit[1] / d.h); w = d.w * s; h = d.h * s; }
    if (w > avail) { h = h * avail / w; w = avail; }
    var type = /^data:image\/png/i.test(data) ? 'png' : 'jpg';
    var b = atob(String(data).split(',')[1] || ''), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new X.ImageRun({ type: type, data: u, transformation: { width: Math.round(w * 96 / 72), height: Math.round(h * 96 / 72) } });
  }
  function canvas(n, c, avail, m) {
    var out = [];
    (n.canvas || []).forEach(function (s) {
      if (s.type === 'polyline') { out.push(para([new X.TextRun({ text: '✔', size: 22, bold: true })], Object.assign({}, c, { alignment: 'center' }))); return; }
      if (s.type === 'rect') {   // 표지의 회색 띠
        out.push(new X.Paragraph({ shading: { type: X.ShadingType.CLEAR, color: 'auto', fill: color(s.color) || 'ADADAD' }, spacing: { before: tw(m[1]), after: tw(m[3]), line: Math.max(40, tw(s.h || 5)), lineRule: X.LineRuleType.EXACT }, children: [] }));
        return;
      }
      if (s.type === 'line') {
        if (Math.abs((s.y2 || 0) - (s.y1 || 0)) > Math.abs((s.x2 || 0) - (s.x1 || 0))) {   // 세로선 (조직도)
          out.push(para([new X.TextRun({ text: '│', size: 28 })], Object.assign({}, c, { alignment: 'center', lineHeight: 1 })));
          return;
        }
        var ind = Math.max(0, s.x1 || 0), ind2 = Math.max(0, avail - (s.x2 || avail));
        out.push(new X.Paragraph({ border: { bottom: { style: X.BorderStyle.SINGLE, size: Math.max(4, Math.round((s.lineWidth || 1) * 8)), color: '000000', space: 1 } },
          indent: { left: tw(ind), right: tw(ind2) }, spacing: { before: 0, after: 0, line: 40, lineRule: X.LineRuleType.EXACT }, children: [] }));
      }
    });
    return out;
  }

  /* ---------- 표 ---------- */
  var NOB = { hLineWidth: function () { return 0; }, vLineWidth: function () { return 0; } };
  function table(n, ctx, avail, al) {
    var t = n.table, body = t.body || [], nC = (t.widths || []).length || (body[0] || []).length;
    if (!body.length || !nC) return spacer(1);
    var L = n.layout === 'noBorders' ? NOB : (n.layout && typeof n.layout === 'object' ? n.layout : {});
    var f = function (name, def) { return typeof L[name] === 'function' ? L[name] : function () { return def; }; };
    var hW = f('hLineWidth', 1), vW = f('vLineWidth', 1), hC = f('hLineColor', 'black'), vC = f('vLineColor', 'black');
    var pL = f('paddingLeft', 4), pR = f('paddingRight', 4), pT = f('paddingTop', 2), pB = f('paddingBottom', 2);
    /* 칸 너비: 숫자는 그대로, '*'·'auto'는 남는 폭을 나눔 */
    var ws = (t.widths || []).slice(); while (ws.length < nC) ws.push('*');
    var nl = { table: t }, padOf = function (i) { return pL(i, nl) + pR(i, nl); };
    var W = ws.map(function (w, i) { return typeof w === 'number' ? w + padOf(i) : 0; });
    var fixed = W.reduce(function (a, b) { return a + b; }, 0);
    var stars = ws.filter(function (w) { return typeof w !== 'number'; }).length;
    if (stars) { var rest = Math.max(stars * 30, avail - fixed) / stars; W = W.map(function (w, i) { return typeof ws[i] === 'number' ? w : rest; }); }
    var tot = W.reduce(function (a, b) { return a + b; }, 0);
    if (tot > avail) { W = W.map(function (w) { return w * avail / tot; }); tot = avail; }
    var Wt = W.map(tw);
    var nodeForLayout = { table: t };
    var bd = function (w, col) { return w > 0 ? { style: X.BorderStyle.SINGLE, size: Math.max(2, Math.round(w * 8)), color: color(col) || '000000' } : { style: X.BorderStyle.NONE, size: 0, color: 'FFFFFF' }; };
    var heights = t.heights;
    var covered = body.map(function () { return []; });   // [r][c] = null | {origin cell, cs} for rowspan continue | 'skip'
    var rows = body.map(function (row, r) {
      var cells = [];
      for (var c = 0; c < nC; c++) {
        var cov = covered[r][c];
        if (cov === 'skip') continue;
        if (cov && cov.cont) {   // 위 칸과 세로로 합친 자리
          cells.push(new X.TableCell({ children: [new X.Paragraph({ children: [] })], columnSpan: cov.cs > 1 ? cov.cs : undefined, verticalMerge: X.VerticalMergeType.CONTINUE,
            width: { size: Wt.slice(c, c + cov.cs).reduce(function (a, b) { return a + b; }, 0), type: X.WidthType.DXA }, borders: cov.borders, shading: cov.shading }));
          c += cov.cs - 1; continue;
        }
        var cell = row[c];
        if (cell == null || typeof cell !== 'object') cell = { text: cell == null ? '' : String(cell) };
        var cs = Math.min(cell.colSpan || 1, nC - c), rs = Math.min(cell.rowSpan || 1, body.length - r);
        for (var rr = r; rr < r + rs; rr++) for (var cc = c; cc < c + cs; cc++) if (rr !== r || cc !== c) covered[rr][cc] = 'skip';
        var cm = mg(cell.margin);
        var cw = W.slice(c, c + cs).reduce(function (a, b) { return a + b; }, 0);
        var padL = pL(c, nodeForLayout), padR = pR(c, nodeForLayout), padT = pT(r, nodeForLayout), padB = pB(r, nodeForLayout);
        var bset = cell.border || [true, true, true, true];
        var borders = {
          top: bset[1] === false ? bd(0) : bd(hW(r, nodeForLayout), hC(r, nodeForLayout)),
          bottom: bset[3] === false ? bd(0) : bd(hW(r + rs, nodeForLayout), hC(r + rs, nodeForLayout)),
          left: bset[0] === false ? bd(0) : bd(vW(c, nodeForLayout), vC(c, nodeForLayout)),
          right: bset[2] === false ? bd(0) : bd(vW(c + cs, nodeForLayout), vC(c + cs, nodeForLayout))
        };
        var shading = cell.fillColor ? { type: X.ShadingType.CLEAR, color: 'auto', fill: color(cell.fillColor) || 'FFFFFF' } : undefined;
        var cctx = inherit(ctx, cell);
        var inner = Object.assign({}, cell); delete inner.margin; delete inner.colSpan; delete inner.rowSpan; delete inner.fillColor; delete inner.border;
        var kids = conv(inner, cctx, Math.max(20, cw - padL - padR - cm[0] - cm[2]));
        if (!kids.length || !(kids[kids.length - 1] instanceof X.Paragraph)) kids.push(new X.Paragraph({ spacing: { line: 20, lineRule: X.LineRuleType.EXACT }, children: [] }));
        if (rs > 1) for (var r2 = r + 1; r2 < r + rs; r2++) covered[r2][c] = { cont: true, cs: cs, borders: borders, shading: shading };
        cells.push(new X.TableCell({
          children: kids, columnSpan: cs > 1 ? cs : undefined, verticalMerge: rs > 1 ? X.VerticalMergeType.RESTART : undefined,
          width: { size: Wt.slice(c, c + cs).reduce(function (a, b) { return a + b; }, 0), type: X.WidthType.DXA },
          margins: { left: tw(padL + cm[0]), right: tw(padR + cm[2]), top: tw(padT + cm[1]), bottom: tw(padB + cm[3]) },
          borders: borders, shading: shading
        }));
        c += cs - 1;
      }
      var h = Array.isArray(heights) ? heights[r] : typeof heights === 'number' ? heights : null;
      return new X.TableRow({ children: cells, cantSplit: true, tableHeader: r < (t.headerRows || 0) ? true : undefined,
        height: h ? { value: tw(Math.min(h, 600)), rule: X.HeightRule.ATLEAST } : undefined });
    });
    return new X.Table({ rows: rows, columnWidths: Wt, width: { size: tw(tot), type: X.WidthType.DXA }, layout: X.TableLayoutType.FIXED,
      alignment: al === 'center' ? X.AlignmentType.CENTER : al === 'right' ? X.AlignmentType.RIGHT : undefined, borders: X.TableBorders.NONE });
  }

  /* ---------- 쪽 나눔·가로/세로 → Word 구역 ---------- */
  function footerFor(withNum) {
    return new X.Footer({ children: [new X.Paragraph({ alignment: X.AlignmentType.CENTER, children: withNum ? [new X.TextRun({ children: ['- ', X.PageNumber.CURRENT, ' -'], size: 16, color: '777777' })] : [] })] });
  }
  function build(dd) {
    var pm = mg(dd.pageMargins || 40);
    var sections = [], curS = null, ctx0 = { fontSize: (dd.defaultStyle || {}).fontSize || 9, lineHeight: (dd.defaultStyle || {}).lineHeight || 1.15 };
    /* PDF의 쪽 나눔마다 Word 「구역(다음 쪽부터)」을 새로 시작 — 앞 쪽이 꽉 차도 빈 쪽이 생기지 않고, 가로/세로도 바꿀 수 있음 */
    var startSection = function (orient) { curS = { orient: orient || 'portrait', children: [] }; sections.push(curS); };
    startSection(dd.pageOrientation);
    (dd.content || []).forEach(function (n) {
      if (n && n.pageBreak === 'before') {
        var o = n.pageOrientation || curS.orient;
        if (curS.children.length) startSection(o); else curS.orient = o;
        if (isEmpty(n)) return;
      }
      var avail = (curS.orient === 'landscape' ? PAGE.h : PAGE.w) - pm[0] - pm[2];
      var blocks = conv(n, ctx0, avail);
      curS.children = curS.children.concat(blocks);
    });
    return new X.Document({
      creator: (dd.info || {}).author || '', title: (dd.info || {}).title || '',
      styles: { default: { document: { run: { font: { ascii: FONT, eastAsia: FONT, hAnsi: FONT, cs: FONT }, size: Math.round(ctx0.fontSize * 2) }, paragraph: { spacing: { before: 0, after: 0 } } } } },
      sections: sections.map(function (s, i) {
        if (!s.children.length) s.children.push(new X.Paragraph({ children: [] }));
        return {
          properties: {
            titlePage: i === 0,
            page: { size: { width: tw(PAGE.w), height: tw(PAGE.h), orientation: s.orient === 'landscape' ? X.PageOrientation.LANDSCAPE : X.PageOrientation.PORTRAIT },
              margin: { left: tw(pm[0]), top: tw(pm[1]), right: tw(pm[2]), bottom: tw(pm[3]), header: tw(20), footer: tw(16) } }
          },
          footers: i === 0 ? { default: footerFor(true), first: footerFor(false) } : { default: footerFor(true) },
          children: s.children
        };
      })
    });
  }
  /* 그림 크기를 미리 알아 둠 (너비만 정해진 그림의 높이 계산용) */
  function preload(dd) {
    var list = [];
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n.image === 'string' && /^data:image/.test(n.image) && list.indexOf(n.image) < 0) list.push(n.image);
      ['stack', 'columns', 'content'].forEach(function (k) { if (n[k]) walk(n[k]); });
      if (n.table) n.table.body.forEach(walk);
    })(dd.content);
    return Promise.all(list.map(function (src) {
      if (imgDims[src]) return null;
      return new Promise(function (res) { var im = new Image(); im.onload = function () { imgDims[src] = { w: im.naturalWidth || 400, h: im.naturalHeight || 300 }; res(); }; im.onerror = function () { res(); }; im.src = src; });
    }));
  }
  /* zip 안의 「폴더」 항목 빼기 — 원드라이브 등 클라우드에서 열 때 문제가 되는 경우가 있음 */
  function stripDirs(u8) {
    try {
      var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), eocd = -1;
      for (var i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      if (eocd < 0) return u8;
      var n = dv.getUint16(eocd + 10, true), cdOff = dv.getUint32(eocd + 16, true), p = cdOff, ents = [];
      for (var k = 0; k < n; k++) {
        if (dv.getUint32(p, true) !== 0x02014b50) return u8;
        var nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
        var name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
        ents.push({ name: name, off: dv.getUint32(p + 42, true), cd: u8.subarray(p, p + 46 + nl + xl + cl) });
        p += 46 + nl + xl + cl;
      }
      if (!ents.some(function (e) { return /\/$/.test(e.name); })) return u8;
      var byOff = ents.slice().sort(function (a, b) { return a.off - b.off; });
      byOff.forEach(function (e, j) { e.end = j + 1 < byOff.length ? byOff[j + 1].off : cdOff; });
      var keep = ents.filter(function (e) { return !/\/$/.test(e.name); });
      var size = keep.reduce(function (a, e) { return a + (e.end - e.off) + e.cd.length; }, 0) + 22;
      var out = new Uint8Array(size), ov = new DataView(out.buffer), q = 0;
      keep.forEach(function (e) { out.set(u8.subarray(e.off, e.end), q); e.noff = q; q += e.end - e.off; });
      var cd0 = q;
      keep.forEach(function (e) { out.set(e.cd, q); ov.setUint32(q + 42, e.noff, true); q += e.cd.length; });
      out.set(u8.subarray(eocd, eocd + 22), q);
      ov.setUint16(q + 8, keep.length, true); ov.setUint16(q + 10, keep.length, true);
      ov.setUint32(q + 12, q - cd0, true); ov.setUint32(q + 16, cd0, true); ov.setUint16(q + 20, 0, true);
      return out;
    } catch (e) { return u8; }
  }
  function toBlob(dd) {
    X = g.docx;
    if (!X) return Promise.reject(new Error('Word 기능을 불러오지 못했습니다.'));
    return preload(dd).then(function () { return X.Packer.toBlob(build(dd)); })
      .then(function (b) { return b.arrayBuffer(); })
      .then(function (ab) { return new Blob([stripDirs(new Uint8Array(ab))], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); });
  }
  g.WORDDOC = { toBlob: toBlob };
})(window);
