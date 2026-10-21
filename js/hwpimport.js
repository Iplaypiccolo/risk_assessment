/* 한글 파일(.hwp / .hwpx)에서 「보고서 기본 내용」 가져오기
 * 1) 파일을 읽어 문단·표 목록으로 바꿈 (HWP: 복합문서+압축 레코드, HWPX: zip+XML)
 * 2) 표 제목·제목줄 글자로 어느 항목인지 찾아 내용을 뽑음 (표 모양은 원본과 같다고 가정)
 * 3) 지금 설정과 비교한 결과를 돌려줌 → 화면에서 확인 후 적용 */
(function (g) {
  'use strict';

  /* ---------- 공통: 압축 풀기 ---------- */
  function inflateRaw(u8) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('이 브라우저는 압축 풀기를 지원하지 않습니다. 최신 크롬·사파리를 써 주세요.'));
    /* 압축 끝 뒤에 남는 바이트가 있으면 브라우저가 오류를 내므로, 그때까지 푼 내용만 씀 */
    var ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(), rd = ds.readable.getReader(), parts = [], len = 0;
    w.write(u8).catch(function () {}); w.close().catch(function () {});
    function pump() {
      return rd.read().then(function (r) {
        if (r.done) return finish();
        parts.push(r.value); len += r.value.length; return pump();
      }, function (e) { if (len) return finish(); throw e; });
    }
    function finish() { var out = new Uint8Array(len), p = 0; parts.forEach(function (x) { out.set(x, p); p += x.length; }); return out; }
    return pump();
  }
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  /* 기호 글꼴(Wingdings 등) 문자 → 보통 문자 */
  var PUA = { 0xf09e: '·', 0xf0a7: '▪', 0xf0fe: '▪', 0xf06e: '■', 0xf0a8: '□', 0xf0fc: '✓', 0xf0b7: '·', 0xf09f: '•' };
  function fixPua(s) { return s.replace(/[\uf000-\uf0ff]/g, function (c) { return PUA[c.charCodeAt(0)] || ''; }); }
  function utf16(b, o, n) { var s = ''; for (var i = 0; i < n; i++) { var c = u16(b, o + i * 2); if (!c) break; s += String.fromCharCode(c); } return s; }

  /* ---------- HWPX (zip + XML) ---------- */
  function readZip(u8) {
    var eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (u32(u8, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('zip 아님');
    var n = u16(u8, eocd + 10), off = u32(u8, eocd + 16), files = {};
    for (var k = 0; k < n; k++) {
      if (u32(u8, off) !== 0x02014b50) break;
      var method = u16(u8, off + 10), csize = u32(u8, off + 20), nlen = u16(u8, off + 28), xlen = u16(u8, off + 30), clen = u16(u8, off + 32), lho = u32(u8, off + 42);
      var name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nlen));
      var dstart = lho + 30 + u16(u8, lho + 26) + u16(u8, lho + 28);
      files[name] = { method: method, data: u8.subarray(dstart, dstart + csize) };
      off += 46 + nlen + xlen + clen;
    }
    return files;
  }
  function zipText(f) { return (f.method === 8 ? inflateRaw(f.data) : Promise.resolve(f.data)).then(function (b) { return new TextDecoder('utf-8').decode(b); }); }
  function parseHwpx(u8) {
    var files = readZip(u8);
    var secs = Object.keys(files).filter(function (n) { return /^Contents\/section\d+\.xml$/i.test(n); })
      .sort(function (a, b) { return (+a.match(/(\d+)\.xml/)[1]) - (+b.match(/(\d+)\.xml/)[1]); });
    if (!secs.length) throw new Error('HWPX 본문을 찾지 못했습니다.');
    return Promise.all(secs.map(function (n) { return zipText(files[n]); })).then(function (xmls) {
      var out = [];
      xmls.forEach(function (x) {
        var dom = new DOMParser().parseFromString(x, 'application/xml');
        walkX(dom.documentElement, out, 0);
      });
      return out;
    });
  }
  function ln(e) { return e.localName || e.nodeName.replace(/^.*:/, ''); }
  function kids(e, name) { var r = []; for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (!name || ln(c) === name)) r.push(c); return r; }
  /* 문단 하나의 글자 (안쪽 표 글자는 빼고) */
  function pTextX(p) {
    var s = '';
    (function rec(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { if (n.nodeType === 1 && ln(n) === 't') s += fixPua(c.nodeValue); continue; }
        if (c.nodeType !== 1) continue;
        var nm = ln(c);
        if (nm === 'tbl' || nm === 'subList' || nm === 'pic' || nm === 'container' || nm === 'rect' || nm === 'drawText') continue;
        if (nm === 'tab') { s += ' '; continue; }
        if (nm === 'lineBreak') { s += '\n'; continue; }
        rec(c);
      }
    })(p);
    return s;
  }
  function walkX(node, out, depth) {
    kids(node).forEach(function (c) {
      var nm = ln(c);
      if (nm === 'p') {
        var t = pTextX(c);
        if (t.trim()) out.push({ type: 'p', text: t, depth: depth });
        walkX(c, out, depth);           // 문단 안의 표·글상자
      } else if (nm === 'tbl') {
        var cells = [];
        var tb = { type: 'table', cells: cells, depth: depth };
        out.push(tb);
        c.querySelectorAll ? null : null;
        kids(c, 'tr').forEach(function (tr) {
          kids(tr, 'tc').forEach(function (tc) {
            var addr = kids(tc, 'cellAddr')[0], span = kids(tc, 'cellSpan')[0], sub = kids(tc, 'subList')[0];
            var paras = sub ? kids(sub, 'p').map(pTextX) : [];
            cells.push({ c: addr ? +addr.getAttribute('colAddr') : 0, r: addr ? +addr.getAttribute('rowAddr') : 0,
              cs: span ? +span.getAttribute('colSpan') || 1 : 1, rs: span ? +span.getAttribute('rowSpan') || 1 : 1, text: paras.join('\n') });
            if (sub) walkX(sub, out, depth + 1);
          });
        });
      } else if (nm === 'subList' || nm === 'run' || nm === 'ctrl' || nm === 'drawText' || nm === 'rect' || nm === 'container' || nm === 'sec') {
        walkX(c, out, depth + (nm === 'subList' ? 1 : 0));
      }
    });
  }

  /* ---------- HWP 5.0 (복합문서 + 압축 레코드) ---------- */
  function readCfb(u8) {
    if (u32(u8, 0) !== 0xe011cfd0 || u32(u8, 4) !== 0xe11ab1a1) throw new Error('한글(.hwp) 파일이 아닙니다.');
    var ssz = 1 << u16(u8, 0x1e), mssz = 1 << u16(u8, 0x20);
    var nFat = u32(u8, 0x2c), dir0 = u32(u8, 0x30), cutoff = u32(u8, 0x38), mf0 = u32(u8, 0x3c), nMf = u32(u8, 0x40), dif0 = u32(u8, 0x44), nDif = u32(u8, 0x48);
    var sec = function (i) { return 512 + i * ssz; };
    var fatSecs = [];
    for (var i = 0; i < 109 && fatSecs.length < nFat; i++) fatSecs.push(u32(u8, 0x4c + i * 4));
    var d = dif0;
    for (var k = 0; k < nDif && fatSecs.length < nFat; k++) {
      for (var j = 0; j < ssz / 4 - 1 && fatSecs.length < nFat; j++) fatSecs.push(u32(u8, sec(d) + j * 4));
      d = u32(u8, sec(d) + ssz - 4);
    }
    var fat = [];
    fatSecs.forEach(function (s) { for (var j = 0; j < ssz / 4; j++) fat.push(u32(u8, sec(s) + j * 4)); });
    var chain = function (start, table) { var r = [], x = start, guard = 0; while (x < 0xfffffffa && guard++ < 1e6) { r.push(x); x = table[x]; } return r; };
    var readBig = function (start, size) {
      var out = new Uint8Array(size), p = 0;
      chain(start, fat).forEach(function (s) { var n = Math.min(ssz, size - p); if (n > 0) { out.set(u8.subarray(sec(s), sec(s) + n), p); p += n; } });
      return out;
    };
    var dirs = chain(dir0, fat), ents = [];
    dirs.forEach(function (s) {
      for (var j = 0; j < ssz / 128; j++) {
        var o = sec(s) + j * 128, nl = u16(u8, o + 0x40);
        ents.push({ name: utf16(u8, o, Math.max(0, nl / 2 - 1)), type: u8[o + 0x42], left: u32(u8, o + 0x44), right: u32(u8, o + 0x48), child: u32(u8, o + 0x4c), start: u32(u8, o + 0x74), size: u32(u8, o + 0x78) });
      }
    });
    var root = ents[0], mini = readBig(root.start, root.size), minifat = [];
    if (nMf) chain(mf0, fat).forEach(function (s) { for (var j = 0; j < ssz / 4; j++) minifat.push(u32(u8, sec(s) + j * 4)); });
    var readSmall = function (start, size) {
      var out = new Uint8Array(size), p = 0;
      chain(start, minifat).forEach(function (s) { var n = Math.min(mssz, size - p); if (n > 0) { out.set(mini.subarray(s * mssz, s * mssz + n), p); p += n; } });
      return out;
    };
    /* 경로 만들기 */
    var paths = {};
    (function walk(idx, prefix) {
      if (idx >= 0xfffffffa || !ents[idx]) return;
      var e = ents[idx];
      walk(e.left, prefix); walk(e.right, prefix);
      var full = prefix + e.name;
      if (e.type === 2) paths[full] = e;
      if (e.type === 1 || e.type === 5) walk(e.child, e.type === 5 ? '' : full + '/');
    })(0, '');
    return {
      list: Object.keys(paths),
      read: function (p) { var e = paths[p]; if (!e) return null; return e.size < cutoff ? readSmall(e.start, e.size) : readBig(e.start, e.size); }
    };
  }
  var T_PARA = 0x42, T_TEXT = 0x43, T_CTRL = 0x47, T_LIST = 0x48, T_TABLE = 0x4d;
  function records(b) {
    var out = [], o = 0;
    while (o + 4 <= b.length) {
      var h = u32(b, o); o += 4;
      var size = h >>> 20;
      if (size === 0xfff) { size = u32(b, o); o += 4; }
      out.push({ tag: h & 0x3ff, level: (h >>> 10) & 0x3ff, data: b.subarray(o, o + size) });
      o += size;
    }
    return out;
  }
  function paraText(d) {
    var s = '', n = d.length / 2;
    for (var i = 0; i < n; i++) {
      var c = u16(d, i * 2);
      if (c >= 32) { s += c >= 0xf000 && c <= 0xf0ff ? fixPua(String.fromCharCode(c)) : String.fromCharCode(c); continue; }
      if (c === 9) { s += ' '; i += 7; continue; }          // 탭(인라인 8칸)
      if (c === 10) { s += '\n'; continue; }
      if (c === 13) continue;
      if ([4, 5, 6, 7, 8, 19, 20, 1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23].indexOf(c) >= 0) { i += 7; continue; }   // 확장·인라인 조판부호
    }
    return s;
  }
  /* 레코드를 차례로 읽으며 문단·표 목록 만들기 */
  function hwpBlocks(recs) {
    var out = [];
    var i = 0;
    function readPara(level, depth, sink) {
      // recs[i] = PARA_HEADER at level
      i++;
      var text = '', tables = [];
      while (i < recs.length && recs[i].level > level) {
        var r = recs[i];
        if (r.tag === T_TEXT && r.level === level + 1) { text += paraText(r.data); i++; continue; }
        if (r.tag === T_CTRL && r.level === level + 1) {
          var id = u32(r.data, 0);
          if (id === 0x74626c20) { tables.push(readTable(level + 1, depth)); continue; }   // 'tbl '
          readOther(level + 1, depth); continue;
        }
        i++;
      }
      if (sink) sink.push(text);
      if (text.trim()) out.push({ type: 'p', text: text, depth: depth });
      return text;
    }
    function readTable(level, depth) {
      // recs[i] = CTRL_HEADER(tbl) at level
      i++;
      var tb = { type: 'table', cells: [], depth: depth };
      out.push(tb);
      while (i < recs.length && recs[i].level > level) {
        var r = recs[i];
        if (r.tag === T_LIST && r.level === level + 1 && r.data.length >= 16) {
          var nPara = u16(r.data, 0), c = u16(r.data, 8), rr = u16(r.data, 10), cs = u16(r.data, 12), rs = u16(r.data, 14);
          i++;
          var paras = [];
          for (var k = 0; k < nPara && i < recs.length && recs[i].tag === T_PARA && recs[i].level === level + 1; k++) readPara(level + 1, depth + 1, paras);
          tb.cells.push({ c: c, r: rr, cs: cs || 1, rs: rs || 1, text: paras.join('\n') });
          continue;
        }
        i++;
      }
      return tb;
    }
    function readOther(level, depth) {
      // 글상자 등: 안쪽 문단만 꺼냄
      i++;
      while (i < recs.length && recs[i].level > level) {
        var r = recs[i];
        if (r.tag === T_PARA) { readPara(r.level, depth + 1, null); continue; }
        i++;
      }
    }
    while (i < recs.length) {
      if (recs[i].tag === T_PARA && recs[i].level === 0) readPara(0, 0, null); else i++;
    }
    return out;
  }
  function parseHwp(u8) {
    var cfb = readCfb(u8);
    var fh = cfb.read('FileHeader');
    if (!fh) throw new Error('한글 파일 정보를 읽지 못했습니다.');
    var props = u32(fh, 36), compressed = !!(props & 1);
    if (props & 2) throw new Error('암호가 걸린 한글 파일은 읽을 수 없습니다.');
    if (props & 4) throw new Error('배포용 문서는 읽을 수 없습니다.');
    var secs = cfb.list.filter(function (p) { return /^BodyText\/Section\d+$/.test(p); }).sort(function (a, b) { return (+a.slice(16)) - (+b.slice(16)); });
    var chain = Promise.resolve(), all = [];
    secs.forEach(function (p) {
      chain = chain.then(function () {
        var raw = cfb.read(p);
        return (compressed ? inflateRaw(raw) : Promise.resolve(raw)).then(function (b) { all = all.concat(hwpBlocks(records(b))); });
      });
    });
    return chain.then(function () { return all; });
  }

  function parse(file) {
    return file.arrayBuffer().then(function (ab) {
      var u8 = new Uint8Array(ab);
      if (u32(u8, 0) === 0x04034b50) return parseHwpx(u8);
      if (u32(u8, 0) === 0xe011cfd0) return parseHwp(u8);
      throw new Error('한글 파일(.hwp, .hwpx)이 아닙니다.');
    });
  }

  /* ---------- 표 도우미 ---------- */
  function norm(s) { return String(s == null ? '' : s).replace(/[\s ]+/g, ''); }
  function clean(s) { return String(s == null ? '' : s).split('\n').map(function (l) { return l.replace(/[ \t ]+/g, ' ').trim(); }).filter(function (l, i, a) { return l || (i > 0 && i < a.length - 1); }).join('\n').trim(); }
  /* 칸 위치표: grid[r][c] = 칸 (합친 칸은 여러 자리를 차지) */
  function grid(tb) {
    var g2 = [];
    tb.cells.forEach(function (cell) {
      for (var r = cell.r; r < cell.r + cell.rs; r++) {
        g2[r] = g2[r] || [];
        for (var c = cell.c; c < cell.c + cell.cs; c++) g2[r][c] = cell;
      }
    });
    return g2;
  }
  function rowCells(g2, r) { var seen = [], out = []; (g2[r] || []).forEach(function (cell) { if (cell && seen.indexOf(cell) < 0) { seen.push(cell); out.push(cell); } }); return out; }
  function tableText(tb) { return tb.cells.map(function (c) { return c.text; }).join(' '); }
  function findTables(blocks, pred) { return blocks.filter(function (b) { return b.type === 'table' && pred(norm(tableText(b)), b); }); }
  /* 제목줄에서 글자로 칸 위치 찾기 */
  function headerRow(g2, labels) {
    for (var r = 0; r < g2.length; r++) {
      var row = rowCells(g2, r).map(function (c) { return norm(c.text); });
      if (labels.every(function (l) { return row.some(function (t) { return t.indexOf(norm(l)) >= 0; }); })) return r;
    }
    return -1;
  }
  function colOf(g2, r, label) {
    var cells = rowCells(g2, r);
    for (var k = 0; k < cells.length; k++) if (norm(cells[k].text).indexOf(norm(label)) >= 0) return cells[k].c;
    return -1;
  }
  function at(g2, r, c) { return c < 0 || !g2[r] || !g2[r][c] ? '' : clean(g2[r][c].text); }
  function isChecked(t) { return /[■▣☑✔✓√VvOo]/.test(String(t).trim()) && String(t).trim().length <= 2; }
  function lines(t) { return clean(t).split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }

  /* ---------- 항목별로 뽑기 (표 모양은 원본과 같다고 봄) ---------- */
  var Y = function (s) { return String(s).replace(/^(\D{0,3})\d{4}년/, '$1{Y}년'); };
  var EXTRACT = {
    process: function (B, E) {
      var t = findTables(B, function (x) { return x.indexOf('공정분석') >= 0 && x.indexOf('공정설명') >= 0; })[0]; if (!t) return null;
      var g2 = grid(t), h = headerRow(g2, ['No.', '공정명', '공정설명']); if (h < 0) return null;
      var cN = colOf(g2, h, '공정명'), cD = colOf(g2, h, '공정설명'), cE = colOf(g2, h, '설비'), cM = colOf(g2, h, '물질'), out = [];
      for (var r = h + 1; r < g2.length; r++) {
        var name = at(g2, r, cN); if (!name) continue;
        var old = (E.processes || [])[out.length];
        out.push({ id: old ? old.id : 'p' + Date.now().toString(36) + out.length, name: name, desc: at(g2, r, cD), equip: at(g2, r, cE), material: at(g2, r, cM) });
      }
      return out.length ? { 'processes': out } : null;
    },
    equip: function (B, E, NEW) {
      var ts = findTables(B, function (x) { return x.indexOf('안전ㆍ보건상위험정보') >= 0 || x.indexOf('안전·보건상위험정보') >= 0; }).filter(function (t) { return headerRow(grid(t), ['설 비 명']) >= 0 || headerRow(grid(t), ['설비명']) >= 0; });
      if (!ts.length) return null;
      var procs = NEW.processes || E.processes || [];
      var out = ts.map(function (t, ti) {
        var g2 = grid(t), h = headerRow(g2, ['설비명', '수량']), h0 = h - 1;
        var cP = colOf(g2, h0, '공정'), cN = colOf(g2, h, '설비명'), cQ = colOf(g2, h, '수량'), cC = colOf(g2, h, '화학물질명'), cA = colOf(g2, h, '취급량'), cT = colOf(g2, h, '취급시간'), cO = colOf(g2, h0, '기타');
        var r = h + 1, procName = at(g2, r, cP);
        var names = lines(at(g2, r, cN)), qtys = lines(at(g2, r, cQ));
        var cn = lines(at(g2, r, cC)), ca = lines(at(g2, r, cA)), ct = lines(at(g2, r, cT));
        var other = at(g2, r, cO).replace(/\n/g, ' ');
        var mark = function (re) { var m = re.exec(other); return m ? /[■▣☑✔]/.test(m[1]) : false; };
        var unitM = /단위\s*중량\s*\(([^)]*)\)/.exec(other);
        var envPart = other.split('작업환경측정')[1] || '';
        var envOf = function (re) { var m = re.exec(envPart); return m ? /[■▣☑✔]/.test(m[1]) : false; };
        var p = procs.filter(function (x) { return norm(x.name) === norm(procName); })[0] || procs[ti] || procs[0] || {};
        var old = (E.infoTables || [])[ti] || {};
        return {
          proc: p.id || old.proc || 'p1',
          equipment: names.map(function (n, k) { return { name: n, qty: qtys[k] || '' }; }),
          chemicals: (cn.length ? cn : ['-']).map(function (n, k) { return { name: n, amount: ca[k] || '-', time: ct[k] || '-' }; }),
          heavy: { unit: unitM ? unitM[1].trim() : ((old.heavy || {}).unit || ''), lift: mark(/들기\s*([■□▣☑✔])/), push: mark(/밀기\s*([■□▣☑✔])/), pull: mark(/끌기\s*([■□▣☑✔])/), none: mark(/\)?\s*해당무\s*([■□▣☑✔])\s*\)/) },
          envMeasure: envOf(/[(,]\s*측정\s*([■□▣☑✔])/) ? 'yes' : envOf(/미측정\s*([■□▣☑✔])/) ? 'no' : 'none'
        };
      });
      return { 'infoTables': out };
    },
    patrol: function (B) {
      var t = findTables(B, function (x) { return x.indexOf('사업장순회점검') >= 0; })[0]; if (!t) return null;
      var g2 = grid(t), h = headerRow(g2, ['유해·위험 작업', '사고·질병의 유형']); if (h < 0) return null;
      var c1 = colOf(g2, h, '유해·위험 작업'), c2 = colOf(g2, h, '사고·질병의 유형'), out = [];
      for (var r = h + 1; r < g2.length; r++) {
        var a = at(g2, r, c1), b = at(g2, r, c2);
        if (/KRAS|사고·질병의유형/.test(norm(a + b))) break;
        if (a) out.push({ text: a, type: b });
      }
      return out.length ? { patrol: out } : null;
    },
    cases: function (B) {
      var t = findTables(B, function (x, tb) { var g2 = grid(tb); return headerRow(g2, ['구분', '연도', '기관명', '사고내용']) >= 0; })[0]; if (!t) return null;
      var g2 = grid(t), h = headerRow(g2, ['구분', '연도', '기관명', '사고내용']), cols = ['구분', '연도', '기관명', '사고내용', '비고'].map(function (l) { return colOf(g2, h, l); }), out = [];
      for (var r = h + 1; r < g2.length; r++) {
        var v = cols.map(function (c) { return at(g2, r, c); });
        if (v.join('')) out.push({ kind: v[0], year: v[1], org: v[2].replace(/\n/g, ' '), text: v[3], note: v[4] });
      }
      return out.length ? { cases: out } : null;
    },
    msds: function (B) {
      var t = findTables(B, function (x, tb) { return x.indexOf('MSDS목록') >= 0 && headerRow(grid(tb), ['물질명', 'CAS']) >= 0; })[0]; if (!t) return null;
      var g2 = grid(t), h = headerRow(g2, ['물질명', 'CAS']), cols = ['물질명', 'CAS', '사용량', '저장량', '용도'].map(function (l) { return colOf(g2, h, l); }), out = [];
      for (var r = h + 1; r < g2.length; r++) {
        var v = cols.map(function (c) { return at(g2, r, c).replace(/\n/g, ' '); });
        if (v[0]) out.push({ name: v[0], cas: v[1], use: v[2], store: v[3], purpose: v[4] });
      }
      return out.length ? { msds: out } : null;
    },
    hazard: function (B, E, NEW) {
      var ts = findTables(B, function (x) { return x.indexOf('유해위험요인분류') >= 0 && /1\.1/.test(x); }); if (!ts.length) return null;
      var procs = NEW.processes || E.processes || [];
      return { hazardTables: ts.map(function (t, ti) {
        var g2 = grid(t), h = headerRow(g2, ['공', '세부']), checks = [];
        var hc = rowCells(g2, h), val = function (label) { for (var k = 0; k < hc.length - 1; k++) if (norm(hc[k].text).indexOf(norm(label)) >= 0) return clean(hc[k + 1].text); return ''; };
        t.cells.forEach(function (cell) {
          var nx = g2[cell.r] && g2[cell.r][cell.c + cell.cs];
          if (nx && /^\d\.\d$/.test(norm(nx.text)) && isChecked(cell.text)) checks.push(norm(nx.text));
        });
        var pn = val('공정'), p = procs.filter(function (x) { return norm(x.name) === norm(pn); })[0] || procs[ti] || procs[0] || {};
        return { proc: p.id || 'p1', sub: val('세부'), checks: checks, equip: val('설비') || '-', material: val('물질') || '-' };
      }) };
    },
    results: function (B, E, NEW) {
      var ts = findTables(B, function (x) { return x.indexOf('위험성평가결과서') >= 0 && x.indexOf('세부작업') >= 0; }); if (!ts.length) return null;
      var procs = NEW.processes || E.processes || [];
      return { resultTables: ts.map(function (t, ti) {
        var g2 = grid(t), h1 = headerRow(g2, ['세부작업', '현재 안전보건조치']), h2 = headerRow(g2, ['위험분류', '가능성']);
        var hv = function (label) { for (var r = 0; r < h1; r++) { var cs = rowCells(g2, r); for (var k = 0; k < cs.length - 1; k++) if (norm(cs[k].text) === norm(label)) return clean(cs[k + 1].text); } return ''; };
        var col = function (label, row) { return colOf(g2, row, label); };
        var C = { task: col('세부작업', h1), cls: col('위험분류', h2), situation: col('상황', h2), measure: col('현재 안전보건조치', h1), cases: col('재해사례', h1),
          p: col('가능성', h2), s: col('중대성', h2), redNo: col('NO', h2), redText: col('세부내용', h2), after: col('개선후', h1), plan: col('예정일', h1), done: col('완료일', h1) };
        var rows = [];
        for (var r = Math.max(h1, h2) + 1; r < g2.length; r++) {
          var o = {}; Object.keys(C).forEach(function (k) { o[k] = at(g2, r, C[k]); });
          if (!o.situation && !o.task) continue;
          o.p = parseInt(o.p, 10) || 1; o.s = parseInt(o.s, 10) || 1;
          rows.push(o);
        }
        var pn = hv('공정명'), p = procs.filter(function (x) { return norm(x.name) === norm(pn); })[0] || procs[ti] || procs[0] || {};
        return { proc: p.id || 'p1', sub: hv('세부공정명'), rows: rows };
      }) };
    },
    edu: function (B) {
      var ps = B.filter(function (b) { return b.type === 'p'; }).map(function (b) { return clean(b.text); });
      var lists = [];
      for (var i = 0; i < ps.length; i++) {
        if (norm(ps[i]).indexOf('(교육내용)') < 0) continue;
        var l = [];
        var inline = ps[i].split('\n').slice(1);
        for (var j = i + 1; j < ps.length && !/사진대지/.test(norm(ps[j])); j++) inline = inline.concat(ps[j].split('\n'));
        inline.forEach(function (x) { x = x.trim().replace(/^[o○ㅇ·•\-]\s*/, ''); if (x) l.push(Y(x)); });
        lists.push(l);
      }
      if (!lists.length) return null;
      var r = { 'preEdu.topics': lists[0] };
      if (lists[1]) r['postEdu.topics'] = lists[1];
      return r;
    },
    interviews: function (B) {
      var t = findTables(B, function (x) { return x.indexOf('근로자청취조사') >= 0; })[0]; if (!t) return null;
      var out = [];
      t.cells.forEach(function (cell) {
        var tx = clean(cell.text).replace(/\n/g, ' ');
        if (tx.indexOf('【대상공종】') < 0) return;
        var m = /【대상공종】(.*?)【근로자\s*의견】(.*?)【위험성평가\s*담당자\s*의견】(.*)$/.exec(tx);
        if (m) out.push({ work: m[1].trim(), opinion: m[2].trim(), reply: m[3].trim(), worker: 0 });
      });
      return out.length ? { interviews: out } : null;
    },
    budget: function (B) {
      var t = findTables(B, function (x, tb) { var g2 = grid(tb); return headerRow(g2, ['구 분']) >= 0 && /예산/.test(x) && rowCells(g2, 2).some(function (c) { return norm(c.text) === '계'; }); })[0];
      if (!t) return null;
      var g2 = grid(t), r0 = -1;
      for (var r = 0; r < g2.length; r++) if (rowCells(g2, r).some(function (c) { return norm(c.text) === '계'; })) { r0 = r; break; }
      var out = [];
      for (r = r0 + 1; r < g2.length; r++) { var it = at(g2, r, 0); if (it) out.push({ item: it.replace(/\n/g, ' '), amount: '' }); }
      return out.length ? { budget: out } : null;
    },
    danger: function (B) {
      var t = findTables(B, function (x, tb) { return headerRow(grid(tb), ['작업내용', '세부 공종']) >= 0; })[0]; if (!t) return null;
      var g2 = grid(t), h = headerRow(g2, ['작업내용', '세부 공종']), cols = ['작업내용', '위 치', '세부 공종', '해당'].map(function (l) { return colOf(g2, h, l); }), out = [];
      for (var r = h + 1; r < g2.length; r++) {
        var v = cols.map(function (c) { return at(g2, r, c); });
        if (v[0]) out.push({ work: v[0].replace(/\n/g, ' '), place: v[1].replace(/\n/g, ' '), detail: v[2], yes: isChecked(v[3]) });
      }
      return out.length ? { dangerWork: out } : null;
    },
    ppe: function (B) {
      var res = {};
      var t = findTables(B, function (x, tb) { return headerRow(grid(tb), ['대상자', '지급계획']) >= 0; })[0];
      if (t) {
        var g2 = grid(t), h = headerRow(g2, ['대상자', '지급계획']), c1 = colOf(g2, h, '지급계획'), c2 = colOf(g2, h, '비고'), rows = [];
        for (var r = h + 1; r < g2.length; r++) { var a = at(g2, r, c1); if (a) rows.push({ plan: a, note: at(g2, r, c2).replace(/\n/g, ' ') }); }
        if (rows.length) res['ppe.rows'] = rows;
      }
      var m = listAfter(B, '□개인보호구관리·운영방안', /^ㅇ/);
      if (m.length) res['ppe.mgmt'] = m;
      return Object.keys(res).length ? res : null;
    },
    insp: function (B) {
      var res = {};
      var t = findTables(B, function (x, tb) { return headerRow(grid(tb), ['공정', '위험요소', '안전점검사항']) >= 0; })[0];
      if (t) {
        var g2 = grid(t), h = headerRow(g2, ['공정', '위험요소', '안전점검사항']), cols = ['공정', '위험요소', '안전점검사항', '비고'].map(function (l) { return colOf(g2, h, l); }), rows = [];
        for (var r = h + 1; r < g2.length; r++) { var v = cols.map(function (c) { return at(g2, r, c); }); if (v[0] || v[1]) rows.push({ proc: v[0].replace(/\n/g, ' '), risk: v[1], check: v[2], note: v[3] }); }
        if (rows.length) res.inspection = rows;
      }
      var pl = listAfter(B, 'ㅇ점검계획', /^-/, true);
      if (pl.length) res.inspectionPlan = pl;
      return Object.keys(res).length ? res : null;
    },
    eduRec: function (B) {
      var res = {};
      var t = findTables(B, function (x, tb) { return headerRow(grid(tb), ['구분', '대상', '기준', '실시']) >= 0; })[0];
      if (t) {
        var g2 = grid(t), h = headerRow(g2, ['구분', '대상', '기준', '실시']), cols = ['구분', '대상', '기준', '실시', '비고'].map(function (l) { return colOf(g2, h, l); }), rows = [];
        for (var r = h + 1; r < g2.length; r++) {
          var v = cols.map(function (c) { return at(g2, r, c); });
          if (v[0]) rows.push({ kind: v[0], target: v[1], std: v[2], done: /O\s*\/\s*X/i.test(v[3]) || !v[3] ? 'auto' : v[3].trim(), note: v[4] });
        }
        if (rows.length) res.eduRecord = rows;
      }
      var p = findTables(B, function (x, tb) { return rowCells(grid(tb), 1).some(function (c) { return norm(c.text) === '내용'; }) && tb.cells.length <= 4; })[0];
      if (p) { var g3 = grid(p), cc = rowCells(g3, 1); if (cc[1]) res.eduPhotoLabel = clean(cc[1].text); }
      return Object.keys(res).length ? res : null;
    },
    emer: function (B) {
      var t = findTables(B, function (x) { return x.indexOf('사고발생') >= 0 && x.indexOf('작업재개') >= 0; })[0]; if (!t) return null;
      var g2 = grid(t), out = [];
      for (var r = 0; r < g2.length; r++) {
        var cs = rowCells(g2, r); if (!cs.length) continue;
        var a = clean(cs[0].text); if (!a || a === '↓') continue;
        var b = cs.slice(1).map(function (c) { return clean(c.text); }).filter(Boolean).join('\n');
        out.push({ step: a, text: b.split('\n').map(function (l) { l = l.trim(); return l && !/^▪/.test(l) ? '▪ ' + l : l; }).join('\n') });
      }
      return out.length ? { emergencyFlow: out } : null;
    }
  };
  /* 「제목」 문단 바로 아래의 목록 줄 */
  function listAfter(B, title, re, sameLine) {
    var ps = B.filter(function (b) { return b.type === 'p'; }).map(function (b) { return clean(b.text); });
    for (var i = 0; i < ps.length; i++) {
      if (norm(ps[i].split('\n')[0]).indexOf(norm(title)) !== 0) continue;
      var out = [], rest = ps[i].split('\n').slice(1);
      for (var j = i + 1; j < ps.length; j++) {
        var parts = ps[j].split('\n'), stop = false;
        for (var k = 0; k < parts.length; k++) { var l = parts[k].trim(); if (!l) continue; if (!re.test(l)) { stop = true; break; } out.push(sameLine ? l : l.replace(re, '').trim()); }
        if (stop) break;
      }
      rest.forEach(function (l) { if (re.test(l.trim())) out.unshift(sameLine ? l.trim() : l.trim().replace(re, '').trim()); });
      return out;
    }
    return [];
  }

  /* ---------- 비교 ---------- */
  var TITLES = {
    process: '사업장 개요 (공정분석)', equip: '안전·보건상 위험정보', patrol: '사업장 순회점검 조사표', cases: '재해 유사사례', msds: 'MSDS 목록',
    hazard: '유해위험요인 분류', results: '위험성평가 결과서', edu: '교육 내용 (사전·결과 교육)', interviews: '근로자 청취조사 (경험담)',
    budget: '안전 예산 항목', danger: '위험작업 관리계획', ppe: '개인보호구', insp: '안전점검 계획', eduRec: '교육실적', emer: '비상대책 흐름도'
  };
  function getP(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function sig(v) { return JSON.stringify(v, function (k, x) { if (k === 'id' || k === 'proc' || k === 'worker' || k === 'amount' || k === 'owner') return undefined; return typeof x === 'string' ? norm(x) : x; }); }
  function count(v) { return Array.isArray(v) ? v.length : v && typeof v === 'object' ? 1 : v ? 1 : 0; }
  function rowsOf(v) {
    if (!Array.isArray(v)) return [];
    if (v.length && v[0] && v[0].rows) return v.reduce(function (a, t) { return a.concat(t.rows); }, []);
    if (v.length && v[0] && v[0].equipment) return v.reduce(function (a, t) { return a.concat(t.equipment); }, []);
    return v;
  }
  function rowLabel(x) {
    if (typeof x === 'string') return x;
    if (!x) return '';
    return x.situation || x.text || x.name || x.work || x.item || x.plan || x.proc || x.kind || x.step || x.opinion || JSON.stringify(x);
  }
  function compare(E, found) {
    return Object.keys(TITLES).map(function (id) {
      var nv = found[id];
      if (!nv) return { id: id, title: TITLES[id], status: 'notfound' };
      var paths = Object.keys(nv), same = paths.every(function (p) { return sig(getP(E, p)) === sig(nv[p]); });
      var add = 0, del = 0, chg = 0, detail = [];
      paths.forEach(function (p) {
        var o = rowsOf(getP(E, p)), n = rowsOf(nv[p]);
        if (!Array.isArray(getP(E, p)) && !Array.isArray(nv[p])) { if (sig(getP(E, p)) !== sig(nv[p])) { chg++; detail.push({ k: '~', t: String(nv[p]) }); } return; }
        var os = o.map(sig), ns = n.map(sig), usedO = [], newOnly = [], oldOnly = [];
        ns.forEach(function (x, i) { var j = -1; for (var k = 0; k < os.length; k++) if (usedO.indexOf(k) < 0 && os[k] === x) { j = k; break; } if (j >= 0) usedO.push(j); else newOnly.push(i); });
        os.forEach(function (x, k) { if (usedO.indexOf(k) < 0) oldOnly.push(k); });
        /* 짝이 안 맞는 줄: 같은 자리끼리는 「변경」, 남는 새 줄은 「추가」, 남는 옛 줄은 「삭제」 */
        var pairs = Math.min(newOnly.length, oldOnly.length);
        newOnly.forEach(function (i, q) { if (q < pairs) { chg++; detail.push({ k: '~', t: rowLabel(n[i]), was: rowLabel(o[oldOnly[q]]) }); } else { add++; detail.push({ k: '+', t: rowLabel(n[i]) }); } });
        oldOnly.slice(pairs).forEach(function (k) { del++; detail.push({ k: '-', t: rowLabel(o[k]) }); });
        if (!add && !chg && !del && sig(getP(E, p)) !== sig(nv[p])) { chg++; detail.push({ k: '~', t: '체크·순서 등 바뀜' }); }
      });
      return { id: id, title: TITLES[id], status: same ? 'same' : 'changed', values: nv, add: add, del: del, chg: chg, detail: detail.slice(0, 40), rows: paths.reduce(function (a, p) { return a + count(rowsOf(nv[p])); }, 0) };
    });
  }
  function extractAll(blocks, E) {
    var found = {}, NEW = {};
    ['process', 'equip', 'patrol', 'cases', 'msds', 'hazard', 'results', 'edu', 'interviews', 'budget', 'danger', 'ppe', 'insp', 'eduRec', 'emer'].forEach(function (id) {
      try { var r = EXTRACT[id](blocks, E, NEW); if (r) { found[id] = r; if (r.processes) NEW.processes = r.processes; } } catch (e) { if (g.console) console.warn('import', id, e); }
    });
    return found;
  }
  function analyze(file, E) {
    return parse(file).then(function (blocks) {
      var found = extractAll(blocks, E);
      return { blocks: blocks, found: found, items: compare(E, found) };
    });
  }
  g.HwpImport = { parse: parse, analyze: analyze, extractAll: extractAll, compare: compare, TITLES: TITLES };
})(typeof window !== 'undefined' ? window : globalThis);
