/* 위험성평가 보고서 만들기 - 화면 */
(function () {
  'use strict';
  var L = LOGIC, D = L.D, T = TPL;
  var $app = document.getElementById('app');
  var cur = null;          // 작성 중인 업체 (설정 화면에서는 설정 문서)
  var SET = null;          // 보고서 기본 내용 설정 (모든 업체 공통)
  var view = 'home';       // home | step | settings
  var stepIdx = 0;
  var openSec = {};
  var multi = Settings.get('multi', Settings.get('admin', false));
  var nearCache = {};      // 구호기관 검색 결과 (업체 id별, 저장 안 함)

  var STEPS = [
    { key: 'info', title: '기본 정보', short: '기본정보', icon: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.5 1.6-2 2.5-2s1.9.5 2.5 2M14 10h4M14 14h3"/>' },
    { key: 'workers', title: '근로자', short: '근로자', icon: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.3"/><path d="M16 14.6c2.2.1 3.9 1.5 4.5 4.4"/>' },
    { key: 'survey', title: '질문에 답하기', short: '질문', icon: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"/>' },
    { key: 'contacts', title: '비상연락처', short: '연락처', icon: '<path d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>' },
    { key: 'photos', title: '사진 넣기', short: '사진', icon: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>' },
    { key: 'done', title: 'PDF 받기', short: 'PDF', icon: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M12 11v6M9.5 14.5L12 17l2.5-2.5"/>' }
  ];
  function svg(paths) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'; }
  function stepStrip() {
    return '<nav class="steps" aria-label="단계">' + STEPS.map(function (s, i) {
      return '<button class="step' + (i === stepIdx ? ' on' : i < stepIdx ? ' done' : '') + '" data-act="goto" data-i="' + i + '"' + (i === stepIdx ? ' aria-current="step"' : '') + '><span class="dot">' + svg(s.icon) + '</span>' + s.short + '</button>';
    }).join('') + '</nav>';
  }
  var PHOTO_SLOTS = [
    { k: 'pre1', label: '사전 교육 사진 ①', aspect: 4 / 3 },
    { k: 'pre2', label: '사전 교육 사진 ②', aspect: 4 / 3 },
    { k: 'post1', label: '결과 교육 사진 ①', aspect: 4 / 3 },
    { k: 'post2', label: '결과 교육 사진 ②', aspect: 4 / 3 },
    { k: 'edu', label: '채용교육 등 교육사진', aspect: 1.6 }
  ];
  var RELS = [['母', '어머니'], ['父', '아버지'], ['妻', '아내'], ['夫', '남편'], ['子', '아들'], ['女', '딸'], ['兄', '형·오빠'], ['弟', '동생']];
  var AGENCIES = [['fire', '119 안전센터', '예) 강릉 119안전센터'], ['hospital', '병원', '예) 강릉○○병원'], ['police', '경찰서', '예) 강릉경찰서'], ['patrol', '고속도로 순찰대', '예) 고속도로순찰대 제○지구대']];

  /* ---------- 공통 도우미 ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getP(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setP(o, p, v) {
    var ks = p.split('.'), last = ks.pop(), t = o;
    ks.forEach(function (k, i) { if (t[k] == null) t[k] = /^\d+$/.test(ks[i + 1] || last) ? [] : {}; t = t[k]; });
    t[last] = v;
  }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2400); }
  function fmtPhone(v) {
    var n = String(v || '').replace(/\D/g, '');
    if (/^02/.test(n)) { if (n.length === 9) return n.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3'); if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3'); }
    if (n.length === 11) return n.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (n.length === 10) return n.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (n.length === 8) return n.replace(/(\d{4})(\d{4})/, '$1-$2');
    return v;
  }
  function mdKor(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? (+m[2]) + '월 ' + (+m[3]) + '일' : '작성일'; }

  function newCompany() {
    return migrate({
      id: uid(), createdAt: Date.now(),
      info: { writeDate: D.today() },
      workers: [{ name: '', phone: '', role: '운전원' }],
      emergency: [{ name: '', phone: '', rel: '母' }, { name: '', phone: '', rel: '妻' }, { name: '', phone: '', rel: '子' }],
      agencies: { fire: {}, hospital: {}, police: {}, patrol: {} },
      schedule: {}, answers: {}, traits: { senior: true }, accident: { cases: 1, injured: 1, dead: 0 },
      photos: {}, photosOrig: {}
    });
  }
  function migrate(c) {
    c.info = c.info || {}; c.workers = c.workers || []; c.emergency = c.emergency || [];
    c.agencies = c.agencies || {}; ['fire', 'hospital', 'police', 'patrol'].forEach(function (k) { c.agencies[k] = c.agencies[k] || {}; });
    c.schedule = c.schedule || {}; c.answers = c.answers || {}; c.traits = c.traits || {}; c.accident = c.accident || { cases: 1, injured: 1, dead: 0 };
    c.photos = c.photos || {}; c.photosOrig = c.photosOrig || {};
    if (c.answers.q2b2 === 'O') c.answers.q2b2 = 'B'; else if (c.answers.q2b2 === 'X') c.answers.q2b2 = 'N';
    delete c.answers.q10c;
    return c;
  }
  function migrateSet(s) {
    s = s || { id: '__settings__' };
    s.id = '__settings__'; s.edit = s.edit || {};
    Object.keys(T.DEFAULT_EDIT).forEach(function (k) { if (s.edit[k] === undefined) s.edit[k] = clone(T.DEFAULT_EDIT[k]); });
    return s;
  }
  function E() { return (SET && SET.edit) || T.DEFAULT_EDIT; }
  var saveT = null;
  function save(now) {
    if (!cur) return;
    clearTimeout(saveT);
    var obj = cur;
    var doIt = function () { Store.put(obj).catch(function () { toast('저장 공간이 부족해요. 사진을 줄여 주세요.'); }); };
    if (now) doIt(); else saveT = setTimeout(doIt, 400);
  }

  /* ---------- 입력칸 만들기 ---------- */
  function field(label, path, o) {
    o = o || {};
    var v = getP(cur, path); if (v == null) v = '';
    var attrs = ' data-bind="' + path + '"';
    var ph = o.ph ? ' placeholder="' + esc(o.ph) + '"' : '';
    var input;
    if (o.type === 'area') input = '<textarea rows="' + (o.rows || 3) + '"' + attrs + ph + '>' + esc(v) + '</textarea>';
    else if (o.type === 'date') input = '<input type="date"' + attrs + ' value="' + esc(v) + '">';
    else if (o.type === 'tel') input = '<input type="tel" inputmode="tel" autocomplete="off"' + attrs + ph + ' value="' + esc(v) + '" data-kind="tel">';
    else if (o.type === 'num') input = '<input type="text" inputmode="numeric" autocomplete="off"' + attrs + ph + ' value="' + esc(v) + '">';
    else input = '<input type="text" autocomplete="off"' + attrs + ph + ' value="' + esc(v) + '">';
    var chips = '';
    if (o.chips) chips = '<div class="chips">' + o.chips.map(function (c) {
      var val = Array.isArray(c) ? c[0] : c, lab = Array.isArray(c) ? c[1] : c;
      return '<button type="button" class="chip' + (v === val ? ' on' : '') + '" data-act="chip" data-path="' + path + '" data-val="' + esc(val) + '">' + esc(lab) + '</button>';
    }).join('') + '</div>';
    return '<label class="field' + (o.cls ? ' ' + o.cls : '') + '"><span class="lab">' + label + (o.req ? ' <em class="req">필수</em>' : '') + '</span>' +
      (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + chips + (o.noInput ? '' : input) + (o.after || '') + '</label>';
  }

  /* ---------- 화면 그리기 ---------- */
  function render() {
    var nav = document.getElementById('bottomNav'), prog = document.getElementById('progress'), menu = document.getElementById('topMenu');
    var sub = document.getElementById('topSub');
    if (sub) sub.textContent = view === 'step' && cur ? (cur.info.company || '업체명 미입력') : view === 'settings' ? '모든 업체에 똑같이 적용' : '제설작업 위험성평가 결과보고서';
    if (view === 'home') {
      document.getElementById('topTitle').textContent = '위험성평가 보고서 만들기';
      nav.hidden = true; prog.hidden = true; menu.hidden = true;
      renderHome(); return;
    }
    if (view === 'settings') {
      document.getElementById('topTitle').textContent = '보고서 기본 내용 바꾸기';
      nav.hidden = true; prog.hidden = true; menu.hidden = true;
      $app.innerHTML = viewSettings(); return;
    }
    var st = STEPS[stepIdx];
    document.getElementById('topTitle').textContent = (stepIdx + 1) + '. ' + st.title;
    menu.hidden = false; prog.hidden = false; nav.hidden = false;
    document.getElementById('progressBar').style.width = ((stepIdx + 1) / STEPS.length * 100) + '%';
    document.getElementById('btnPrev').textContent = stepIdx === 0 ? '◀ 처음으로' : '◀ 이전';
    document.getElementById('btnNext').hidden = stepIdx === STEPS.length - 1;
    var html = '';
    switch (st.key) {
      case 'info': html = viewInfo(); break;
      case 'workers': html = viewWorkers(); break;
      case 'survey': html = viewSurvey(); break;
      case 'contacts': html = viewContacts(); break;
      case 'photos': html = viewPhotos(); break;
      case 'done': html = viewDone(); break;
    }
    $app.innerHTML = stepStrip() + '<div class="company-tag">' + esc(cur.info.company || '업체명 미입력') + '</div>' + html;
  }
  function goStep(i, keepScroll) {
    stepIdx = Math.max(0, Math.min(STEPS.length - 1, i)); view = 'step';
    cur.lastStep = stepIdx; save();
    render(); if (!keepScroll) window.scrollTo(0, 0);
  }

  /* 처음 화면 */
  function renderHome() {
    Store.all().then(function (list) {
      var h = '<section class="hero"><h1>위험성평가<br>결과보고서 만들기</h1><p>질문에 답하고 사진만 넣으면<br>PDF 보고서가 완성됩니다.</p><span class="hero-tag">제설작업 · 약 15분</span></section>';
      h += '<div class="seg" role="group" aria-label="작성 방식"><button data-act="setMulti" data-v="0" aria-pressed="' + !multi + '">한 업체 작성</button><button data-act="setMulti" data-v="1" aria-pressed="' + multi + '">여러 업체 작성</button></div>';
      if (!multi) {
        var last = list.filter(function (c) { return c.id === Settings.get('currentId'); })[0] || list[0];
        if (last) {
          h += '<div class="card"><div class="card-sub">작성 중인 보고서</div><div class="card-title">' + esc(last.info.company || '업체명 미입력') + '</div>' +
            '<div class="card-sub">' + esc(last.info.contract || '') + '</div>' +
            '<button class="btn btn-primary btn-big" data-act="open" data-id="' + last.id + '">이어서 작성하기 ▶</button>' +
            '<button class="btn btn-ghost" data-act="restart" data-id="' + last.id + '">처음부터 새로 작성</button></div>';
        } else {
          h += '<button class="btn btn-primary btn-big" data-act="new">작성 시작하기 ▶</button>';
        }
        h += '<p class="note">입력한 내용은 <b>이 휴대폰 안에만</b> 저장되고 어디로도 보내지지 않습니다.</p>';
      } else {
        h += '<div class="list-head"><h2>업체 목록 <small>(' + list.length + '곳)</small></h2><button class="btn btn-primary" data-act="new">＋ 새 업체</button></div>';
        if (!list.length) h += '<p class="note">아직 업체가 없습니다. 「＋ 새 업체」를 누르세요.</p>';
        list.forEach(function (c) {
          var ws = (c.workers || []).filter(function (w) { return w.name; }).map(function (w) { return esc(w.name); });
          var ev = L.evalSummary(c);
          h += '<div class="card co">' +
            '<div class="card-title">' + esc(c.info.company || '업체명 미입력') + '</div>' +
            '<div class="card-sub">' + esc(c.info.contract || '계약명 미입력') + '</div>' +
            '<div class="card-sub">근로자 ' + ws.length + '명' + (ws.length ? ' : ' + ws.join(', ') : '') + '</div>' +
            '<div class="card-sub">질문 ' + (ev.done ? '완료 (' + ev.grade + ')' : '진행 중') + ' · ' + new Date(c.updatedAt || Date.now()).toLocaleDateString('ko-KR') + '</div>' +
            '<div class="row4"><button class="btn btn-primary" data-act="open" data-id="' + c.id + '">열기</button>' +
            '<button class="btn btn-ghost" data-act="openWorkers" data-id="' + c.id + '">근로자</button>' +
            '<button class="btn btn-ghost" data-act="copy" data-id="' + c.id + '">복사</button>' +
            '<button class="btn btn-danger" data-act="delete" data-id="' + c.id + '">삭제</button></div></div>';
        });
      }
      h += '<div class="home-tools">' +
        '<button class="btn btn-ghost btn-big" data-act="settings">⚙ 보고서 기본 내용 바꾸기</button>' +
        '<p class="note">위험요인, 점검 항목, 보호구 등 보고서에 미리 들어 있는 내용을 고칩니다. 모든 업체에 똑같이 적용됩니다. 고칠 것이 없으면 누르지 않아도 됩니다.</p>' +
        '<details class="more"><summary>파일로 저장 · 다른 기기로 옮기기</summary><p class="note">입력한 내용을 파일 하나로 저장한 뒤, 다른 기기에서 「불러오기」 하면 그대로 이어서 쓸 수 있습니다.</p><div class="row2"><button class="btn btn-ghost" data-act="export">파일로 저장</button><button class="btn btn-ghost" data-act="import">불러오기</button></div></details></div>';
      $app.innerHTML = h;
    });
  }

  /* 1. 기본 정보 */
  function viewInfo() {
    return '<p class="lead">보고서 곳곳에 자동으로 들어갈 정보입니다.</p>' +
      field('계약명 (용역명)', 'info.contract', { req: 1, ph: '예) 2026년 ○○지사 제설작업 용역' }) +
      field('업체명', 'info.company', { req: 1, ph: '예) ○○건설기계' }) +
      field('대표자 성명', 'info.ceo', { req: 1, ph: '예) 홍길동' }) +
      field('대표자 휴대폰', 'info.ceoPhone', { type: 'tel', ph: '010-0000-0000' }) +
      field('일하는 도로공사 지사', 'info.branch', { ph: '예) 영동', hint: '「○○지사」의 ○○만 적으세요. 가까운 병원·119를 찾을 때 씁니다.' }) +
      field('업종', 'info.bizType', { chips: ['건설기계 대여업', '제설 용역', '화물 운송업'], ph: '직접 입력도 됩니다' }) +
      '<label class="field"><span class="lab">사업장 주소</span><button type="button" class="btn btn-ghost" data-act="addr">🔍 주소 찾기</button>' +
      '<input type="text" data-bind="info.address" value="' + esc(cur.info.address || '') + '" placeholder="주소 찾기를 누르거나 직접 입력">' +
      '<input type="text" data-bind="info.addressDetail" value="' + esc(cur.info.addressDetail || '') + '" placeholder="나머지 주소 (동·호수 등)"></label>' +
      field('계약 시작일', 'info.contractStart', { type: 'date' }) + field('계약 종료일', 'info.contractEnd', { type: 'date' }) +
      field('보고서 작성일', 'info.writeDate', { type: 'date', hint: '표지와 문서 안의 연도·날짜가 이 날짜로 들어갑니다.' });
  }

  /* 2. 근로자 */
  function viewWorkers() {
    var h = '<p class="lead">함께 일하는 근로자를 적어 주세요.</p>';
    cur.workers.forEach(function (w, i) {
      h += '<div class="card"><div class="card-head"><b>근로자 ' + (i + 1) + '</b>' + (cur.workers.length > 1 ? '<button class="btn btn-danger btn-sm" data-act="delWorker" data-i="' + i + '">삭제</button>' : '') + '</div>' +
        field('이름', 'workers.' + i + '.name', { ph: '예) 김영수' }) +
        field('휴대폰', 'workers.' + i + '.phone', { type: 'tel', ph: '010-0000-0000' }) +
        field('하는 일', 'workers.' + i + '.role', { chips: ['운전원', '작업자', '신호수'], ph: '직접 입력도 됩니다' }) + '</div>';
    });
    h += '<button class="btn btn-ghost btn-big" data-act="addWorker">＋ 근로자 추가</button>';
    h += '<div class="card"><div class="card-head"><b>근로자 중에 해당하는 분이 있나요?</b></div><p class="hint">해당하면 눌러서 ■ 표시하세요.</p><div class="chips big">' +
      T.FIXED.traits.map(function (t) { var on = !!cur.traits[t[0]]; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="trait" data-k="' + t[0] + '">' + (on ? '■ ' : '□ ') + t[1] + (t[0] === 'senior' ? ' (55세 이상)' : '') + '</button>'; }).join('') + '</div></div>';
    return h;
  }

  /* 3. 질문 */
  function viewSurvey() {
    var w = L.walk(cur.answers, cur.accident), Q = L.Q;
    var idx = w.pending ? L.ROOTS.indexOf(rootOf(w.pending)) : L.ROOTS.length;
    var bar = '<div class="sv-prog"><span>' + Math.min(idx + 1, L.ROOTS.length) + ' / ' + L.ROOTS.length + '</span><div class="sv-bar"><i style="width:' + (idx / L.ROOTS.length * 100) + '%"></i></div></div>';
    if (w.pending) {
      var q = Q[w.pending], qt = q.text.replace('{WD}', mdKor(cur.info.writeDate));
      var h = bar + '<div class="sv-card"><div class="sv-topic">' + esc(L.ITEM_TITLE[q.item] || '') + '</div><div class="sv-q">' + esc(qt) + '</div>' + (q.help ? '<div class="sv-help">' + esc(q.help) + '</div>' : '');
      if (q.type === 'count') {
        var a = cur.accident;
        h += counter('사고가 난 횟수', 'cases', a.cases, '번') + counter('다친 사람', 'injured', a.injured, '명') + counter('돌아가신 분', 'dead', a.dead, '명') +
          '<button class="btn btn-primary btn-big" data-act="ans" data-q="' + w.pending + '" data-v="done">다 적었어요 ▶</button>';
      } else if (q.type === 'budget') {
        h += budgetInputs() + '<button class="btn btn-primary btn-big" data-act="budgetDone">다 적었어요 ▶</button>' +
          '<button class="btn btn-ghost btn-big" data-act="ans" data-q="' + w.pending + '" data-v="N">아직 정하지 못했어요</button>';
      } else if (q.type === 'dates') {
        if (!cur.schedule.preEduDate) fillSchedule();
        h += field('사전 교육 (평가 시작 전)', 'schedule.preEduDate', { type: 'date' }) +
          field('현장 순회점검', 'schedule.patrolDate', { type: 'date' }) +
          field('근로자 의견 듣기', 'schedule.interviewDate', { type: 'date' }) +
          field('결과 교육 (평가 끝난 뒤)', 'schedule.postEduDate', { type: 'date' }) +
          '<button class="btn btn-primary btn-big" data-act="ans" data-q="' + w.pending + '" data-v="done">다 골랐어요 ▶</button>';
      } else {
        h += '<div class="ox"><button class="ox-btn o" data-act="ans" data-q="' + w.pending + '" data-v="O"><span>⭕</span>예</button>' +
          '<button class="ox-btn x" data-act="ans" data-q="' + w.pending + '" data-v="X"><span>❌</span>아니요</button></div>';
        if (q.U) h += '<button class="btn btn-ghost btn-big" data-act="ans" data-q="' + w.pending + '" data-v="U">모르겠어요</button>';
      }
      h += '</div>';
      var answered = w.path.filter(function (id) { return cur.answers[id]; });
      if (answered.length) h += '<button class="btn btn-ghost" data-act="ansBack">↩ 앞 질문 다시 답하기</button>';
      return h;
    }
    var ev = L.evalSummary(cur);
    var h2 = '<div class="sv-done"><div class="sv-done-t">질문에 모두 답하셨습니다 👍</div>' + statbar(ev) +
      (ev.note ? '<div class="hint">' + esc(ev.note) + '</div>' : '') +
      (ev.grade && 'CD'.indexOf(ev.grade[0]) >= 0 ? '<div class="warn">70점(B등급)보다 낮습니다. 부족한 부분을 보완한 뒤 다시 평가받아야 할 수 있습니다.</div>' : '') +
      '<div class="hint">「다음」을 누르세요.</div></div>';
    h2 += '<h3 class="sec">내 답 (누르면 다시 답할 수 있어요)</h3><div class="ans-list">';
    L.ROOTS.forEach(function (r) {
      var it = Q[r].item, ids = w.path.filter(function (id) { return it === 'info' ? id === r : Q[id].item === it; });
      var txt = ids.map(function (id) { var a = cur.answers[id]; return a === 'O' ? '⭕' : a === 'X' ? '❌' : a === 'U' ? '모름' : a === 'B' ? '금액 적음' : a === 'N' ? '미정' : a ? '입력' : ''; }).join(' → ');
      var sc = ev.scores[it];
      h2 += '<button class="ans-row" data-act="redo" data-item="' + it + '" data-root="' + r + '"><span class="ans-t">' + esc(Q[r].text.replace('{WD}', mdKor(cur.info.writeDate))) + '</span><span class="ans-a">' + txt + (typeof sc === 'number' ? ' <small>(' + sc + '점)</small>' : sc === 'exclude' ? ' <small>(제외)</small>' : '') + '</span></button>';
    });
    return h2 + '</div>';
  }
  function statbar(ev) {
    return '<div class="statbar"><div class="stat"><div class="num">' + (ev.total != null ? ev.total : '-') + '</div><div class="lbl">점수</div></div><div class="stat"><div class="num txt">' + esc(ev.grade || '-') + '</div><div class="lbl">등급</div></div></div>';
  }
  function rootOf(id) {
    var it = L.Q[id].item;
    if (it === 'info') return id;
    for (var i = 0; i < L.ROOTS.length; i++) if (L.Q[L.ROOTS[i]].item === it) return L.ROOTS[i];
    return id;
  }
  function counter(label, k, v, unit) {
    return '<div class="counter"><span>' + label + '</span><button class="cbtn" data-act="cnt" data-k="' + k + '" data-d="-1" aria-label="줄이기">－</button><b>' + (v || 0) + '<small>' + unit + '</small></b><button class="cbtn" data-act="cnt" data-k="' + k + '" data-d="1" aria-label="늘리기">＋</button></div>';
  }
  /* 안전 예산: 질문 안에서 바로 금액 입력 (만원 단위 → 보고서에는 천원 단위로) */
  function ensureBudget() {
    if (!cur.budget || !cur.budget.length) cur.budget = clone(E().budget).map(function (b) { return { item: b.item, amount: b.amount || '' }; });
  }
  function budgetTotal() { return (cur.budget || []).reduce(function (s, b) { return s + (/^\s*-/.test(b.item) ? (+String(b.amount || '').replace(/[^\d]/g, '') || 0) : 0); }, 0); }
  function budgetInputs() {
    ensureBudget();
    var h = '<div class="budget">';
    cur.budget.forEach(function (b, i) {
      if (!/^\s*-/.test(b.item)) { h += '<div class="bud-head">' + esc(b.item.replace(/^\d+\.\s*/, '')) + '</div>'; return; }
      var n = +String(b.amount || '').replace(/[^\d]/g, ''), man = n ? String(Math.round(n / 10)) : '';
      h += '<div class="bud-row"><span class="bud-name">' + esc(b.item.replace(/^\s*-\s*/, '')) + '</span>' +
        '<input type="text" inputmode="numeric" data-budget="' + i + '" value="' + esc(man) + '" placeholder="0"><span class="bud-unit">만원</span>' +
        (b.custom ? '<button class="btn btn-sm btn-danger" data-act="budDel" data-i="' + i + '">삭제</button>' : '') + '</div>';
    });
    h += '<div class="bud-add"><input type="text" id="budNew" placeholder="다른 항목 (예: 안전모 구입)"><button class="btn btn-ghost" data-act="budAdd">＋ 추가</button></div>';
    h += '<div class="bud-total">합계 <b id="budTotal">' + (budgetTotal() / 10).toLocaleString('ko-KR') + '</b> 만원</div></div>';
    return h;
  }
  function fillSchedule() {
    var s = cur.schedule, wd = cur.info.writeDate || D.today();
    ['patrolDate', 'preEduDate', 'interviewDate', 'postEduDate'].forEach(function (k) { if (!s[k]) s[k] = wd; });
  }

  /* 4. 비상연락처 */
  function viewContacts() {
    var h = '<p class="lead">사고가 났을 때 연락할 곳입니다.</p><h3 class="sec">가족 비상연락처</h3>';
    cur.emergency.forEach(function (e, i) {
      h += '<div class="card"><div class="card-head"><b>비상연락처 ' + (i + 1) + '</b></div>' +
        field('관계', 'emergency.' + i + '.rel', { chips: RELS.map(function (r) { return [r[0], r[1]]; }), noInput: 1 }) +
        field('이름', 'emergency.' + i + '.name') + field('휴대폰', 'emergency.' + i + '.phone', { type: 'tel', ph: '010-0000-0000' }) + '</div>';
    });
    h += '<h3 class="sec">가까운 긴급 구호기관</h3>';
    var nr = nearCache[cur.id];
    if (Near.hasKey()) {
      h += '<p class="hint">' + (cur.info.branch ? '「' + esc(String(cur.info.branch).replace(/지사$/, '')) + '지사」' : '사업장 주소') + ' 근처에서 찾습니다.</p>' +
        '<button class="btn btn-primary btn-big" data-act="nearFind">📍 가까운 곳 자동으로 찾기</button>';
      if (nr && nr.base) h += '<p class="hint">기준 위치: ' + esc(nr.base.name) + '</p>';
    } else {
      h += '<p class="hint">「카카오맵에서 찾기」를 누르면 가까운 곳과 전화번호가 나옵니다. 보고 아래 칸에 적어 주세요.</p>';
    }
    AGENCIES.forEach(function (a) {
      var k = a[0], list = nr && nr[k];
      h += '<div class="card"><div class="card-head"><b>' + a[1] + '</b>' + (!Near.hasKey() ? '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + esc(Near.mapLink(k, cur.info.branch, cur.info.address)) + '">카카오맵에서 찾기</a>' : '') + '</div>';
      if (list) {
        if (!list.length) h += '<p class="hint">근처에서 찾지 못했어요. 직접 적어 주세요.</p>';
        else h += '<div class="pick-list">' + list.map(function (p, i) {
          var on = cur.agencies[k].name === p.name;
          return '<button class="pick' + (on ? ' on' : '') + '" data-act="nearPick" data-k="' + k + '" data-i="' + i + '"><b>' + (on ? '✔ ' : '') + esc(p.name) + '</b><span>' + esc(p.phone || '전화번호 없음') + ' · ' + esc(p.dist) + '</span></button>';
        }).join('') + '</div>';
      }
      h += field('이름', 'agencies.' + k + '.name', { ph: a[2] }) + field('전화번호', 'agencies.' + k + '.phone', { type: 'tel', ph: '000-000-0000' }) + '</div>';
    });
    return h;
  }
  function nearFind() {
    if (!cur.info.branch && !cur.info.address) { alert('「기본 정보」에서 일하는 지사 이름이나 사업장 주소를 먼저 적어 주세요.'); return; }
    busy(true, '가까운 곳을 찾는 중…');
    Near.find(cur.info.branch, cur.info.address).then(function (r) {
      busy(false); nearCache[cur.id] = r;
      AGENCIES.forEach(function (a) {
        var k = a[0], first = r[k] && r[k][0];
        if (first) cur.agencies[k] = { name: first.name, phone: first.phone };
      });
      save(); rerender(); toast('가장 가까운 곳을 넣었습니다. 다른 곳을 누르면 바뀝니다.');
    }).catch(function (e) {
      busy(false);
      alert(e && e.message === 'NO_BASE' ? '지사나 주소 위치를 찾지 못했어요. 「기본 정보」의 지사 이름이나 주소를 확인해 주세요.' : '검색하지 못했어요. 인터넷 연결을 확인하거나 직접 적어 주세요.');
    });
  }

  /* 5. 사진 */
  function viewPhotos() {
    var h = '<p class="lead">사진을 찍거나 앨범에서 고르세요. <b>크기는 자동으로 맞춰집니다.</b></p>';
    PHOTO_SLOTS.forEach(function (s) {
      var p = cur.photos[s.k];
      h += '<div class="card photo"><div class="card-head"><b>' + s.label + '</b>' + (p ? '<span class="ok">✔ 넣음</span>' : '') + '</div>' +
        '<div class="ph-box" style="aspect-ratio:' + s.aspect + '">' + (p ? '<img src="' + p + '" alt="">' : '<span>사진 없음</span>') + '</div>' +
        '<div class="row2"><label class="btn btn-primary file-btn">📷 사진 찍기<input type="file" accept="image/*" capture="environment" data-photo="' + s.k + '"></label>' +
        '<label class="btn btn-ghost file-btn">🖼 앨범에서<input type="file" accept="image/*" data-photo="' + s.k + '"></label></div>' +
        (p ? '<div class="row2"><button class="btn btn-ghost" data-act="recrop" data-k="' + s.k + '">✂ 다시 자르기</button><button class="btn btn-danger" data-act="delPhoto" data-k="' + s.k + '">사진 빼기</button></div>' : '') + '</div>';
    });
    return h;
  }

  /* 6. 완성 */
  function viewDone() {
    var i = cur.info, w = L.walk(cur.answers, cur.accident), ev = L.evalSummary(cur);
    var nW = cur.workers.filter(function (x) { return x.name; }).length;
    var nP = PHOTO_SLOTS.filter(function (s) { return cur.photos[s.k]; }).length;
    var checks = [
      [!!i.contract, '계약명', 0], [!!i.company, '업체명', 0], [!!i.ceo, '대표자 성명', 0], [!!i.contractStart && !!i.contractEnd, '계약기간', 0],
      [nW > 0, '근로자 이름', 1], [!w.pending, '질문 답하기', 2], [nP === PHOTO_SLOTS.length, '사진 (' + nP + '/' + PHOTO_SLOTS.length + ')', 4]
    ];
    var h = '<div class="statbar"><div class="stat"><div class="num">' + (ev.done ? ev.total : '-') + '</div><div class="lbl">점수</div></div><div class="stat"><div class="num txt">' + (ev.done ? esc(ev.grade) : '-') + '</div><div class="lbl">등급</div></div><div class="stat"><div class="num">' + nW + '</div><div class="lbl">근로자</div></div><div class="stat"><div class="num">' + nP + '/' + PHOTO_SLOTS.length + '</div><div class="lbl">사진</div></div>';
    h += '</div><div class="checks">' + checks.map(function (c) {
      return '<div class="chk ' + (c[0] ? 'ok' : 'no') + '"><span>' + (c[0] ? '✔' : '!') + ' ' + c[1] + '</span>' + (c[0] ? '' : '<button class="btn btn-sm btn-ghost" data-act="goto" data-i="' + c[2] + '">채우러 가기</button>') + '</div>';
    }).join('') + '</div>';
    if (checks.some(function (c) { return !c[0]; })) h += '<p class="note">빠진 것이 있어도 PDF는 만들 수 있습니다. 빈칸은 비워진 채로 나옵니다.</p>';
    h += '<button class="btn btn-primary btn-huge" data-act="pdf">📄 PDF 받기</button>' +
      '<button class="btn btn-ghost btn-big" data-act="pdfView">👀 PDF 미리 보기</button>' +
      '<p class="note">PDF를 받은 뒤 <b>출력해서 서명칸에 서명</b>하세요.<br>처음 만들 때는 글꼴을 받느라 10~20초 걸릴 수 있어요.</p>';
    return h;
  }

  /* ---------- 보고서 기본 내용 설정 (모든 업체 공통) ---------- */
  var KRAS_TYPES = ['충돌위험 부분', '기계(설비)의 낙하, 비래, 전복, 붕괴, 전도 위험 부분', '중량물 취급작업', '추락위험 부분(개구부 등)', '화재·폭발위험', '아크, 전기화재, 감전', '기후(한랭)', '넘어짐(미끄러짐, 걸림, 헛디딤)', '끼임(감김)'];
  var CLS_TYPES = ['1. 기계설비적요인', '2. 전기적 요인', '3. 화학적 요인', '4. 생물학적 요인', '5. 작업특성 요인', '6. 작업환경 요인'];
  var EDIT_SECS = [
    { id: 'process', title: '사업장 개요 · 공정', paths: ['process', 'work', 'resultSubName'], render: function () {
      return field('공정명', 'edit.process.name') + field('작업 이름', 'edit.work') + field('세부공정명', 'edit.resultSubName') +
        field('공정설명', 'edit.process.desc', { type: 'area', rows: 4 }) + field('설비', 'edit.process.equip', { type: 'area', rows: 2 }) + field('물질', 'edit.process.material');
    } },
    { id: 'equip', title: '기계·기구 및 설비, 위험정보', paths: ['equipment', 'chemicals', 'info'], render: function () {
      var h = listEditor('edit.equipment', [{ k: 'name', l: '설비명' }, { k: 'qty', l: '수량' }], { name: '', qty: '1대' }, '설비');
      h += '<h4>유해화학물질</h4>' + listEditor('edit.chemicals', [{ k: 'name', l: '화학물질명' }, { k: 'amount', l: '취급량(일)' }, { k: 'time', l: '취급시간' }], { name: '', amount: '', time: '' }, '화학물질');
      var hv = cur.edit.info.heavy;
      h += '<h4>중량물 인력 취급</h4>' + field('단위 중량', 'edit.info.heavy.unit') + '<div class="chips">' +
        [['lift', '들기'], ['push', '밀기'], ['pull', '끌기'], ['none', '해당무']].map(function (o) { return '<button class="chip' + (hv[o[0]] ? ' on' : '') + '" data-act="toggle" data-path="edit.info.heavy.' + o[0] + '">' + (hv[o[0]] ? '■ ' : '□ ') + o[1] + '</button>'; }).join('') + '</div>';
      h += field('작업환경측정', 'edit.info.envMeasure', { chips: [['yes', '측정'], ['no', '미측정'], ['none', '해당무']], noInput: 1 });
      return h;
    } },
    { id: 'patrol', title: '순회점검 조사표', paths: ['patrol'], render: function () {
      return listEditor('edit.patrol', [{ k: 'text', l: '유해·위험 작업', t: 'area' }, { k: 'type', l: '사고·질병의 유형', list: KRAS_TYPES }], { text: '', type: '' }, '항목');
    } },
    { id: 'cases', title: '재해 유사사례', paths: ['cases'], render: function () {
      return listEditor('edit.cases', [{ k: 'kind', l: '구분' }, { k: 'year', l: '연도', num: 1 }, { k: 'org', l: '기관명' }, { k: 'text', l: '사고내용', t: 'area' }, { k: 'note', l: '비고' }], { kind: '부상', year: '', org: '', text: '', note: '' }, '사례');
    } },
    { id: 'msds', title: 'MSDS 목록', paths: ['msds'], render: function () {
      return listEditor('edit.msds', [{ k: 'name', l: '물질명' }, { k: 'cas', l: 'CAS No.' }, { k: 'use', l: '사용량(ℓ·㎏/일)' }, { k: 'store', l: '저장량(ℓ·㎏/일)' }, { k: 'purpose', l: '용도' }], { name: '', cas: '-', use: '', store: '', purpose: '' }, '물질');
    } },
    { id: 'hazard', title: '유해위험요인 분류', paths: ['hazardChecks', 'hazardEquip', 'hazardMaterial'], render: function () {
      var set = {}; cur.edit.hazardChecks.forEach(function (k) { set[k] = 1; });
      var h = '<p class="hint">해당하는 것을 눌러 ■ 표시하세요.</p>';
      T.FIXED.hazardGroups.forEach(function (g) {
        h += '<h4>' + g.no + ' ' + g.name + '</h4><div class="chips">' + g.items.map(function (it) { return '<button class="chip' + (set[it[0]] ? ' on' : '') + '" data-act="hz" data-k="' + it[0] + '">' + (set[it[0]] ? '■ ' : '□ ') + it[0] + ' ' + esc(it[1]) + '</button>'; }).join('') + '</div>';
      });
      return h + field('설비', 'edit.hazardEquip') + field('물질', 'edit.hazardMaterial');
    } },
    { id: 'results', title: '위험성평가 결과서', paths: ['results'], render: renderResults },
    { id: 'edu', title: '교육 내용 (사전·결과 교육)', paths: ['preEdu', 'postEdu'], render: function () {
      return '<h4>사전 교육 내용</h4>' + strList('edit.preEdu.topics', '교육 내용') + '<h4>결과 교육 내용</h4>' + strList('edit.postEdu.topics', '교육 내용') +
        '<p class="hint">{Y}는 작성연도로 바뀝니다.</p>';
    } },
    { id: 'interviews', title: '근로자 청취조사 (경험담)', paths: ['interviews'], render: function () {
      return '<p class="hint">경험담마다 근로자 이름이 차례대로 자동으로 들어갑니다.</p>' + listEditor('edit.interviews', [{ k: 'work', l: '대상공종' }, { k: 'opinion', l: '근로자 의견', t: 'area' }, { k: 'reply', l: '위험성평가 담당자 의견', t: 'area' }], { work: '', opinion: '', reply: '', worker: 0 }, '경험담');
    } },
    { id: 'budget', title: '안전예산 항목', paths: ['budget'], render: function () {
      return '<p class="hint">항목 이름만 정합니다. 금액은 각 업체가 질문에 답할 때 적습니다. 「-」로 시작하면 금액을 적는 항목, 아니면 제목줄입니다.</p>' + listEditor('edit.budget', [{ k: 'item', l: '항목' }], { item: '- ', amount: '' }, '항목');
    } },
    { id: 'danger', title: '위험작업 관리계획', paths: ['dangerWork'], render: function () {
      return listEditor('edit.dangerWork', [{ k: 'work', l: '작업내용' }, { k: 'place', l: '위치' }, { k: 'detail', l: '세부 공종 예시', t: 'area' }, { k: 'yes', l: '해당 여부', bool: 1 }], { work: '', place: '', detail: '', yes: true }, '작업');
    } },
    { id: 'ppe', title: '개인보호구', paths: ['ppe'], render: function () {
      return '<p class="hint">대상자 칸에는 근로자 명단과 업체 이름이 자동으로 들어갑니다.</p>' +
        listEditor('edit.ppe.rows', [{ k: 'plan', l: '지급계획', t: 'area' }, { k: 'note', l: '비고' }], { plan: '', note: '' }, '지급계획') +
        '<h4>관리·운영방안</h4>' + strList('edit.ppe.mgmt', '방안');
    } },
    { id: 'insp', title: '안전점검 계획', paths: ['inspection', 'inspectionPlan'], render: function () {
      return listEditor('edit.inspection', [{ k: 'proc', l: '공정' }, { k: 'risk', l: '위험요소', t: 'area' }, { k: 'check', l: '안전점검사항', t: 'area' }, { k: 'note', l: '비고' }], { proc: '', risk: '· ', check: '· ', note: '' }, '공정') +
        '<h4>점검계획</h4>' + strList('edit.inspectionPlan', '점검계획');
    } },
    { id: 'eduRec', title: '교육실적', paths: ['eduRecord', 'eduPhotoLabel'], render: function () {
      return '<p class="hint">「신규 근로자 채용 시」의 실시(O/X)는 질문 답에 따라 자동으로 들어갑니다(자동).</p>' +
        listEditor('edit.eduRecord', [{ k: 'kind', l: '구분' }, { k: 'target', l: '대상' }, { k: 'std', l: '기준' }, { k: 'done', l: '실시', pick: [['auto', '자동'], ['O', 'O'], ['X', 'X']] }, { k: 'note', l: '비고' }], { kind: '', target: '근로자', std: '-', done: 'O', note: '' }, '교육') +
        field('사진 내용', 'edit.eduPhotoLabel');
    } },
    { id: 'emer', title: '비상대책 흐름도', paths: ['emergencyFlow'], render: function () {
      return listEditor('edit.emergencyFlow', [{ k: 'step', l: '단계' }, { k: 'text', l: '내용', t: 'area' }], { step: '', text: '▪ ' }, '단계');
    } }
  ];
  function listEditor(path, fields, tmpl, noun) {
    var arr = getP(cur, path) || [], h = '';
    arr.forEach(function (it, i) {
      h += '<div class="li"><div class="li-head"><b>' + noun + ' ' + (i + 1) + '</b><span>' +
        (i > 0 ? '<button class="btn btn-sm btn-ghost" data-act="mv" data-path="' + path + '" data-i="' + i + '" data-d="-1">▲</button>' : '') +
        '<button class="btn btn-sm btn-danger" data-act="rm" data-path="' + path + '" data-i="' + i + '">삭제</button></span></div>';
      fields.forEach(function (f) {
        var p = path + '.' + i + '.' + f.k;
        if (f.bool) {
          var on = !!it[f.k];
          h += '<div class="field"><span class="lab">' + f.l + '</span><div class="chips"><button class="chip' + (on ? ' on' : '') + '" data-act="setv" data-path="' + p + '" data-json="true">√ 해당</button><button class="chip' + (!on ? ' on' : '') + '" data-act="setv" data-path="' + p + '" data-json="false">해당 없음</button></div></div>';
        } else if (f.pick) {
          h += '<div class="field"><span class="lab">' + f.l + '</span><div class="chips">' + f.pick.map(function (o) { return '<button class="chip' + (String(it[f.k]) === o[0] ? ' on' : '') + '" data-act="setv" data-path="' + p + '" data-val="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
        } else if (f.list) {
          h += field(f.l, p, { type: f.t, chips: f.list, hint: '아래에서 고르거나 직접 적으세요' });
        } else {
          h += field(f.l, p, { type: f.t === 'area' ? 'area' : f.num ? 'num' : 'text', rows: 3 });
        }
      });
      h += '</div>';
    });
    h += '<button class="btn btn-ghost" data-act="add" data-path="' + path + '" data-tmpl="' + esc(JSON.stringify(tmpl)) + '">＋ ' + noun + ' 추가</button>';
    return h;
  }
  function strList(path, noun) {
    var arr = getP(cur, path) || [], h = '';
    arr.forEach(function (s, i) {
      h += '<div class="sl"><textarea rows="2" data-bind="' + path + '.' + i + '">' + esc(s) + '</textarea><button class="btn btn-sm btn-danger" data-act="rm" data-path="' + path + '" data-i="' + i + '">삭제</button></div>';
    });
    return h + '<button class="btn btn-ghost" data-act="add" data-path="' + path + '" data-tmpl="&quot;&quot;">＋ ' + noun + ' 추가</button>';
  }
  function renderResults() {
    var arr = cur.edit.results, h = '<p class="hint">가능성 × 중대성 = 위험성이 자동으로 계산됩니다. 위험성이 <b>보통(4) 이상</b>이면 감소대책을 적어 주세요.</p>';
    arr.forEach(function (r, i) {
      var p = 'edit.results.' + i, rv = (+r.p || 0) * (+r.s || 0), lv = rv >= 6 ? '높음' : rv === 4 ? '보통' : rv ? '낮음' : '';
      h += '<div class="li"><div class="li-head"><b>' + (i + 1) + '. ' + esc(r.task || '') + '</b><span>' + (i > 0 ? '<button class="btn btn-sm btn-ghost" data-act="mv" data-path="edit.results" data-i="' + i + '" data-d="-1">▲</button>' : '') + '<button class="btn btn-sm btn-danger" data-act="rm" data-path="edit.results" data-i="' + i + '">삭제</button></span></div>' +
        field('세부작업', p + '.task') + field('위험분류', p + '.cls', { chips: CLS_TYPES }) +
        field('유해·위험 상황 및 결과', p + '.situation', { type: 'area' }) + field('현재 안전보건조치', p + '.measure', { type: 'area', rows: 4 }) +
        field('재해사례', p + '.cases') +
        pick123('가능성(빈도)', p + '.p', r.p, ['하', '중', '상']) + pick123('중대성(강도)', p + '.s', r.s, ['소', '중', '대']) +
        '<div class="risk r' + (rv >= 6 ? 'h' : rv === 4 ? 'm' : 'l') + '">위험성 = ' + (rv || '-') + (lv ? ' (' + lv + ')' : '') + '</div>';
      var needRed = rv >= 4;
      if (needRed) h += '<div class="warn">위험성이 ' + lv + '입니다. 감소대책을 적어 주세요.</div>';
      h += '<details class="sub"' + (needRed || r.redText ? ' open' : '') + '><summary>감소대책 · 개선 (선택)</summary>' +
        field('NO', p + '.redNo') + field('감소대책 세부내용', p + '.redText', { type: 'area' }) + field('개선후 위험성', p + '.after') +
        field('개선 예정일', p + '.plan') + field('완료일', p + '.done') + field('담당자', p + '.owner') + '</details></div>';
    });
    h += '<button class="btn btn-ghost" data-act="add" data-path="edit.results" data-tmpl="' + esc(JSON.stringify({ task: '', cls: '1. 기계설비적요인', situation: '', measure: '', cases: '', p: 1, s: 2, redNo: '', redText: '', after: '', plan: '', done: '', owner: '' })) + '">＋ 위험요인 추가</button>';
    return h;
  }
  function pick123(label, path, v, names) {
    return '<div class="field"><span class="lab">' + label + '</span><div class="chips">' + [1, 2, 3].map(function (n) {
      return '<button class="chip num' + (+v === n ? ' on' : '') + '" data-act="setv" data-path="' + path + '" data-json="' + n + '">' + n + ' (' + names[n - 1] + ')</button>';
    }).join('') + '</div></div>';
  }
  function viewSettings() {
    var h = '<p class="lead">원본 보고서 내용이 이미 들어 있습니다. 바꾼 내용은 <b>모든 업체의 보고서에 똑같이</b> 들어갑니다.</p>';
    EDIT_SECS.forEach(function (s) {
      h += '<details class="sec-box" data-sec="' + s.id + '"' + (openSec[s.id] ? ' open' : '') + '><summary>' + s.title + '</summary><div class="sec-body">' +
        (openSec[s.id] ? s.render() + '<button class="btn btn-ghost btn-reset" data-act="resetSec" data-sec="' + s.id + '">↺ 이 부분을 원본 내용으로 되돌리기</button>' : '') + '</div></details>';
    });
    return h + '<button class="btn btn-primary btn-big" data-act="home">✔ 다 고쳤어요 (처음 화면으로)</button>';
  }

  /* ---------- PDF ---------- */
  var fontCache = null, pdfLibP = null, flowCache = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function blobToDataURL(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); }); }
  function fetchDataURL(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.blob(); }).then(blobToDataURL); }
  function prepPdf() {
    pdfLibP = pdfLibP || loadScript('lib/pdfmake.min.js');
    var fp = fontCache ? Promise.resolve(fontCache) : Promise.all([fetchDataURL('fonts/NotoSansKR-Regular.otf'), fetchDataURL('fonts/NotoSansKR-Bold.otf')]).then(function (a) {
      fontCache = { r: a[0].split(',')[1], b: a[1].split(',')[1] }; return fontCache;
    });
    var ip = flowCache ? Promise.resolve(flowCache) : fetchDataURL('img/flow.jpg').then(function (d) { flowCache = d; return d; });
    return Promise.all([pdfLibP, fp, ip]).then(function (r) {
      var f = r[1];
      window.pdfMake.vfs = { 'NotoKR-R.otf': f.r, 'NotoKR-B.otf': f.b };
      window.pdfMake.fonts = { NotoKR: { normal: 'NotoKR-R.otf', bold: 'NotoKR-B.otf', italics: 'NotoKR-R.otf', bolditalics: 'NotoKR-B.otf' } };
      return r[2];
    });
  }
  function fileName() {
    var n = (cur.info.company || '업체').replace(/[\\/:*?"<>|\s]+/g, '_');
    return '위험성평가_' + n + '_' + (cur.info.writeDate || D.today()).replace(/-/g, '') + '.pdf';
  }
  function makePdf(preview) {
    var win = null;
    if (preview) { try { win = window.open('', '_blank'); if (win) win.document.write('<p style="font:20px sans-serif;padding:20px">PDF를 만드는 중입니다…</p>'); } catch (e) { win = null; } }
    busy(true, 'PDF를 만드는 중입니다…<br><small>처음에는 10~20초 걸릴 수 있어요</small>');
    prepPdf().then(function (flow) {
      var dd = PDFDOC.build(cur, { flow: flow, edit: E() });
      return new Promise(function (res, rej) { try { window.pdfMake.createPdf(dd).getBlob(res); } catch (e) { rej(e); } });
    }).then(function (blob) {
      busy(false);
      var url = URL.createObjectURL(blob);
      if (preview && win) { win.location.href = url; return; }
      var a = document.createElement('a'); a.href = url; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
      toast('PDF를 저장했습니다. 휴대폰의 「다운로드」 폴더를 확인하세요.');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function (e) {
      busy(false); if (win) win.close();
      console.error(e); alert('PDF를 만들지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.\n(' + (e && e.message ? e.message : e) + ')');
    });
  }
  function busy(on, msg) {
    var m = document.getElementById('modal');
    if (on) { m.innerHTML = '<div class="busy"><div class="spin"></div><div>' + msg + '</div></div>'; m.hidden = false; }
    else { m.hidden = true; m.innerHTML = ''; }
  }

  /* ---------- 주소 검색 (카카오 우편번호 서비스, 무료) ---------- */
  var postLoaded = null;
  function addrSearch() {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="addr"><div class="addr-head"><b>주소 찾기</b><button class="btn btn-sm btn-ghost" data-act="closeModal">닫기</button></div><div id="addrWrap" class="addr-wrap"><p class="note">불러오는 중…</p></div></div>';
    m.hidden = false; document.body.classList.add('noscroll');
    postLoaded = postLoaded || loadScript('https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js');
    postLoaded.then(function () {
      var wrap = document.getElementById('addrWrap'); wrap.innerHTML = '';
      new window.daum.Postcode({
        oncomplete: function (data) {
          cur.info.address = data.roadAddress || data.jibunAddress || data.address; save();
          closeModal(); render(); toast('주소를 넣었습니다. 나머지 주소를 적어 주세요.');
        }, width: '100%', height: '100%'
      }).embed(wrap);
    }).catch(function () { postLoaded = null; document.getElementById('addrWrap').innerHTML = '<p class="note">주소 검색을 불러오지 못했습니다. 직접 입력해 주세요.</p>'; });
  }
  function closeModal() { var m = document.getElementById('modal'); m.hidden = true; m.innerHTML = ''; document.body.classList.remove('noscroll'); }
  function stepMenu() {
    var m = document.getElementById('modal');
    m.innerHTML = '<div class="menu"><div class="addr-head"><b>단계 목록</b><button class="btn btn-sm btn-ghost" data-act="closeModal">닫기</button></div>' +
      STEPS.map(function (s, i) { return '<button class="menu-item' + (i === stepIdx ? ' on' : '') + '" data-act="goto" data-i="' + i + '"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + s.icon + '</svg>' + (i + 1) + '. ' + s.title + '</button>'; }).join('') +
      '<button class="menu-item home" data-act="home">⌂ 처음 화면</button></div>';
    m.hidden = false; document.body.classList.add('noscroll');
  }

  /* ---------- 파일로 저장 / 불러오기 ---------- */
  /* 백업 파일은 HTML: 휴대폰에서 열면 저장된 내용을 바로 볼 수 있고, 같은 파일로 「불러오기」도 됩니다.
   * (실제 데이터는 파일 안의 <script type="application/json" id="ra-backup"> 에 들어 있음) */
  function backupHtml(payload) {
    var site = location.origin + location.pathname.replace(/[^/]*$/, '');
    var json = JSON.stringify(payload).replace(/</g, '\\u003c');
    var cards = payload.companies.map(function (c) {
      var i = c.info || {}, ws = (c.workers || []).filter(function (w) { return w.name; });
      var ev = L.evalSummary(c);
      var ph = Object.keys(c.photos || {}).map(function (k) { return '<img src="' + c.photos[k] + '" alt="">'; }).join('');
      return '<section class="c"><h2>' + esc(i.company || '업체명 미입력') + '</h2>' +
        '<table>' +
        '<tr><th>계약명</th><td>' + esc(i.contract || '') + '</td></tr>' +
        '<tr><th>대표자</th><td>' + esc(i.ceo || '') + (i.ceoPhone ? ' (' + esc(i.ceoPhone) + ')' : '') + '</td></tr>' +
        '<tr><th>계약기간</th><td>' + esc(D.dot(i.contractStart)) + ' ~ ' + esc(D.dot(i.contractEnd)) + '</td></tr>' +
        '<tr><th>작성일</th><td>' + esc(D.dot(i.writeDate)) + '</td></tr>' +
        '<tr><th>근로자</th><td>' + (ws.length ? ws.map(function (w) { return esc(w.name) + (w.phone ? ' ' + esc(w.phone) : ''); }).join('<br>') : '-') + '</td></tr>' +
        '<tr><th>평가표</th><td>' + (ev.done ? ev.total + '점 · ' + esc(ev.grade) : '질문 답하는 중') + '</td></tr>' +
        '</table>' + (ph ? '<div class="ph">' + ph + '</div>' : '') + '</section>';
    }).join('');
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>위험성평가 저장 파일 (' + esc(D.dot(D.today())) + ')</title><style>' +
      'body{margin:0;background:#eef3f7;color:#10243a;font:18px/1.55 -apple-system,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;word-break:keep-all}' +
      'main{max-width:720px;margin:0 auto;padding:16px}' +
      '.head{background:#1f5f8f;color:#fff;border-radius:18px;padding:20px}.head h1{margin:0 0 6px;font-size:24px}.head p{margin:0;opacity:.92}' +
      '.how{background:#fff4d6;color:#5c3d00;border-radius:14px;padding:14px 16px;margin:14px 0}' +
      '.how button{display:block;width:100%;margin:12px 0 4px;background:#1f5f8f;color:#fff;border:0;font:inherit;font-size:20px;font-weight:700;border-radius:14px;padding:16px;cursor:pointer}.how button:hover{background:#164a70}.how small{display:block;margin-top:8px;font-size:15px}#msg{margin:6px 0 0;font-weight:700}' +
      '.c{background:#fff;border:1px solid #d6e1e9;border-radius:18px;padding:18px;margin:0 0 14px}.c h2{margin:0 0 10px;font-size:22px}' +
      'table{width:100%;border-collapse:collapse}th{text-align:left;color:#4e6274;font-weight:600;width:90px;vertical-align:top;padding:6px 8px 6px 0}td{padding:6px 0;border-bottom:1px solid #eef3f7}' +
      '.ph{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ph img{width:100%;border-radius:10px;display:block}' +
      '</style></head><body><main>' +
      '<div class="head"><h1>위험성평가 저장 파일</h1><p>' + esc(D.dot(D.today())) + ' 저장 · 업체 ' + payload.companies.length + '곳</p></div>' +
      '<div class="how"><b>이어서 작성하려면</b> 아래 파란 버튼을 누르세요. 사이트가 열리면서 이 내용이 그대로 들어갑니다.' +
      '<button id="go" type="button">이 내용으로 이어서 작성하기 ▶</button><p id="msg"></p>' +
      '<small>버튼이 안 되면(아이폰 파일 미리보기 등): 사이트 첫 화면 맨 아래 「파일로 저장 · 다른 기기로 옮기기」 → 「불러오기」에서 이 파일을 고르세요.</small></div>' + cards +
      '</main><script type="application/json" id="ra-backup">' + json + '<\/script>' +
      '<script>(function(){var SITE=' + JSON.stringify(site) + ',btn=document.getElementById("go"),msg=document.getElementById("msg"),w=null,sent=false;' +
      'window.addEventListener("message",function(e){if(e.data==="ra-ready"&&w&&!sent){sent=true;w.postMessage({type:"ra-backup",payload:document.getElementById("ra-backup").textContent},"*");}' +
      'if(e.data==="ra-done"){msg.textContent="사이트로 옮겼습니다. 열린 화면에서 이어서 작성하세요.";}});' +
      'btn.onclick=function(){sent=false;msg.textContent="사이트를 여는 중…";w=window.open(SITE+"#from-file","_blank");if(!w){location.href=SITE;}};})();<\/script></body></html>';
  }
  function exportAll() {
    Store.all().then(function (list) {
      var data = multi ? list : list.filter(function (c) { return c.id === Settings.get('currentId'); });
      if (!data.length) data = list.slice(0, 1);
      if (!data.length) { alert('저장할 내용이 아직 없습니다.'); return; }
      var payload = { app: 'risk_assessment', v: 2, companies: data, settings: SET };
      var blob = new Blob([backupHtml(payload)], { type: 'text/html' });
      var who = data.length === 1 ? (data[0].info.company || '업체') : '업체' + data.length + '곳';
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = '위험성평가_저장_' + who.replace(/[\\/:*?"<>|\s]+/g, '_') + '_' + D.today().replace(/-/g, '') + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      toast('파일로 저장했습니다. 휴대폰의 「다운로드」 폴더를 확인하세요.');
    });
  }
  function readBackup(text) {
    var t = String(text || '').trim();
    if (t.charAt(0) === '{') return JSON.parse(t);
    var doc = new DOMParser().parseFromString(t, 'text/html');
    var el = doc.getElementById('ra-backup');
    if (!el) throw new Error('형식 오류');
    return JSON.parse(el.textContent);
  }
  function importData(d, quiet) {
    if (!d || !d.companies) return Promise.reject(new Error('형식 오류'));
    var jobs = d.companies.map(function (c) { return Store.put(migrate(c)); });
    var untouched = JSON.stringify(SET && SET.edit) === JSON.stringify(migrateSet(null).edit);
    if (d.settings && quiet) { if (untouched) { SET = migrateSet(d.settings); jobs.push(Store.put(SET)); } }
    else if (d.settings && confirm('보고서 기본 내용 설정도 함께 불러올까요?\n(위험요인·점검 항목 등. 잘 모르시면 「확인」)')) { SET = migrateSet(d.settings); jobs.push(Store.put(SET)); }
    return Promise.all(jobs).then(function () { return d.companies.length; });
  }
  /* 저장 파일(HTML)의 「이어서 작성하기」 버튼으로 열렸을 때: 파일이 보내 주는 내용을 받아 바로 엽니다 */
  function receiveFromFile() {
    if (location.hash !== '#from-file' || !window.opener) return false;
    var got = false;
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (got || !m || m.type !== 'ra-backup' || typeof m.payload !== 'string') return;
      got = true;
      var d; try { d = JSON.parse(m.payload); } catch (err) { alert('저장 파일을 읽지 못했습니다.'); return; }
      if (!d || d.app !== 'risk_assessment' || !d.companies || !d.companies.length) { alert('저장 파일을 읽지 못했습니다.'); return; }
      var names = d.companies.map(function (c) { return (c.info && c.info.company) || '업체명 미입력'; }).join(', ');
      if (!confirm('저장 파일의 내용을 불러올까요?\n\n' + names)) return;
      importData(d, true).then(function () {
        try { e.source.postMessage('ra-done', '*'); } catch (err) { /* 무시 */ }
        history.replaceState(null, '', location.pathname + location.search);
        if (d.companies.length === 1) { openCompany(d.companies[0].id); toast('저장했던 내용을 불러왔습니다.'); }
        else { multi = true; Settings.set('multi', true); view = 'home'; render(); toast(d.companies.length + '개 업체를 불러왔습니다.'); }
      });
    });
    try { window.opener.postMessage('ra-ready', '*'); } catch (err) { return false; }
    return true;
  }
  function importFile() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.html,.htm,.json,text/html,application/json';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      f.text().then(function (t) { return importData(readBackup(t)); })
        .then(function (n) { toast(n + '개 업체를 불러왔습니다.'); renderHome(); }).catch(function () { alert('불러올 수 없는 파일입니다.'); });
    };
    inp.click();
  }

  /* ---------- 이벤트 ---------- */
  function openCompany(id, step) {
    return Store.get(id).then(function (c) {
      if (!c) return;
      cur = migrate(c); Settings.set('currentId', cur.id);
      goStep(step != null ? step : Math.min(cur.lastStep || 0, STEPS.length - 1));
    });
  }
  function goHome() { closeModal(); if (cur) save(true); cur = null; view = 'home'; render(); window.scrollTo(0, 0); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    switch (act) {
      case 'setMulti': multi = b.dataset.v === '1'; Settings.set('multi', multi); renderHome(); break;
      case 'home': goHome(); break;
      case 'menu': stepMenu(); break;
      case 'closeModal': closeModal(); break;
      case 'goto': closeModal(); goStep(+b.dataset.i); break;
      case 'settings': cur = SET; view = 'settings'; render(); window.scrollTo(0, 0); break;
      case 'new': cur = newCompany(); Settings.set('currentId', cur.id); save(true); goStep(0); break;
      case 'open': openCompany(b.dataset.id); break;
      case 'openWorkers': openCompany(b.dataset.id, 1); break;
      case 'restart':
        if (confirm('지금까지 입력한 내용을 지우고 처음부터 새로 작성할까요?')) { Store.del(b.dataset.id).then(function () { cur = newCompany(); Settings.set('currentId', cur.id); save(true); goStep(0); }); }
        break;
      case 'copy':
        Store.get(b.dataset.id).then(function (c) { var n = clone(c); n.id = uid(); n.info.company = (n.info.company || '') + ' (복사)'; n.createdAt = Date.now(); return Store.put(n); }).then(function () { toast('복사했습니다.'); renderHome(); });
        break;
      case 'delete':
        if (confirm('이 업체를 삭제할까요? 되돌릴 수 없습니다.')) Store.del(b.dataset.id).then(renderHome);
        break;
      case 'export': exportAll(); break;
      case 'import': importFile(); break;
      case 'prev': if (stepIdx === 0) goHome(); else goStep(stepIdx - 1); break;
      case 'next': goStep(stepIdx + 1); break;
      case 'chip': {
        var p = b.dataset.path, v = b.dataset.val;
        setP(cur, p, getP(cur, p) === v && /bizType|role/.test(p) ? '' : v); save(); rerender(); break;
      }
      case 'setv': setP(cur, b.dataset.path, b.dataset.json != null ? JSON.parse(b.dataset.json) : b.dataset.val); save(); rerender(); break;
      case 'toggle': setP(cur, b.dataset.path, !getP(cur, b.dataset.path)); save(); rerender(); break;
      case 'trait': cur.traits[b.dataset.k] = !cur.traits[b.dataset.k]; save(); rerender(); break;
      case 'addWorker': cur.workers.push({ name: '', phone: '', role: '운전원' }); save(); rerender(); setTimeout(function () { var ins = $app.querySelectorAll('[data-bind$=".name"]'); if (ins.length) ins[ins.length - 1].focus(); }, 50); break;
      case 'delWorker': if (confirm('근로자 ' + (+b.dataset.i + 1) + '을(를) 삭제할까요?')) { cur.workers.splice(+b.dataset.i, 1); save(); rerender(); } break;
      case 'addr': addrSearch(); break;
      case 'ans': {
        var q = b.dataset.q; cur.answers[q] = b.dataset.v;
        if (q === 'q_dates' && b.dataset.v === 'O') { var wd = cur.info.writeDate || D.today(); ['patrolDate', 'preEduDate', 'interviewDate', 'postEduDate'].forEach(function (k) { cur.schedule[k] = wd; }); }
        save(); render(); window.scrollTo(0, 0); break;
      }
      case 'budgetDone': cur.answers.q2b2 = budgetTotal() > 0 ? 'B' : 'N'; save(); render(); window.scrollTo(0, 0); break;
      case 'budAdd': {
        var nm = (document.getElementById('budNew').value || '').trim();
        if (!nm) { toast('항목 이름을 적어 주세요.'); break; }
        ensureBudget(); cur.budget.push({ item: '- ' + nm, amount: '', custom: true }); save(); rerender(); break;
      }
      case 'budDel': cur.budget.splice(+b.dataset.i, 1); save(); rerender(); break;
      case 'ansBack': {
        var w = L.walk(cur.answers, cur.accident), ans = w.path.filter(function (id) { return cur.answers[id]; });
        if (ans.length) delete cur.answers[ans[ans.length - 1]]; save(); render(); break;
      }
      case 'redo': {
        var it = b.dataset.item;
        Object.keys(L.Q).forEach(function (id) { if (L.Q[id].item === it && (it !== 'info' || id === b.dataset.root)) delete cur.answers[id]; });
        save(); render(); window.scrollTo(0, 0); break;
      }
      case 'cnt': { var k = b.dataset.k; cur.accident[k] = Math.max(0, (cur.accident[k] || 0) + (+b.dataset.d)); save(); rerender(); break; }
      case 'nearFind': nearFind(); break;
      case 'nearPick': {
        var nk = b.dataset.k, pl = nearCache[cur.id][nk][+b.dataset.i];
        cur.agencies[nk] = { name: pl.name, phone: pl.phone }; save(); rerender(); break;
      }
      case 'recrop': {
        var sk = b.dataset.k, slot = PHOTO_SLOTS.filter(function (s) { return s.k === sk; })[0], o = cur.photosOrig[sk];
        if (!o) { toast('원본이 없어 다시 자를 수 없어요. 사진을 다시 골라 주세요.'); break; }
        Photo.recrop(o, slot.aspect).then(function (crop) { if (crop) { cur.photos[sk] = crop; save(true); rerender(); } });
        break;
      }
      case 'delPhoto': if (confirm('이 사진을 뺄까요?')) { delete cur.photos[b.dataset.k]; delete cur.photosOrig[b.dataset.k]; save(true); rerender(); } break;
      case 'add': { var arr = getP(cur, b.dataset.path); arr.push(JSON.parse(b.dataset.tmpl)); save(); rerender(); break; }
      case 'rm': {
        if (!confirm('삭제할까요?')) break;
        getP(cur, b.dataset.path).splice(+b.dataset.i, 1); save(); rerender(); break;
      }
      case 'mv': { var a2 = getP(cur, b.dataset.path), i2 = +b.dataset.i, j = i2 + (+b.dataset.d); var t = a2[i2]; a2[i2] = a2[j]; a2[j] = t; save(); rerender(); break; }
      case 'hz': { var hc = cur.edit.hazardChecks, ix = hc.indexOf(b.dataset.k); if (ix >= 0) hc.splice(ix, 1); else hc.push(b.dataset.k); save(); rerender(); break; }
      case 'resetSec': {
        var sec = EDIT_SECS.filter(function (s) { return s.id === b.dataset.sec; })[0];
        if (confirm('「' + sec.title + '」을(를) 원본 내용으로 되돌릴까요?')) { sec.paths.forEach(function (p) { cur.edit[p] = clone(T.DEFAULT_EDIT[p]); }); save(); rerender(); }
        break;
      }
      case 'pdf': save(true); makePdf(false); break;
      case 'pdfView': save(true); makePdf(true); break;
    }
  });
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  document.addEventListener('toggle', function (e) {
    var d = e.target; if (!d.matches || !d.matches('details.sec-box')) return;
    var id = d.dataset.sec;
    if (d.open && !openSec[id]) { openSec[id] = true; rerender(); }
    else if (!d.open && openSec[id]) { delete openSec[id]; }
  }, true);

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.budget != null && cur) {
      var man = String(t.value).replace(/[^\d]/g, '');
      cur.budget[+t.dataset.budget].amount = man ? String(+man * 10) : '';
      var el = document.getElementById('budTotal'); if (el) el.textContent = (budgetTotal() / 10).toLocaleString('ko-KR');
      save(); return;
    }
    if (!t.dataset || !t.dataset.bind || !cur) return;
    setP(cur, t.dataset.bind, t.value); save();
    if (t.dataset.bind === 'info.company') { var ts = document.getElementById('topSub'); if (ts) ts.textContent = t.value || '업체명 미입력'; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.kind === 'tel') { var f = fmtPhone(t.value); if (f !== t.value) { t.value = f; setP(cur, t.dataset.bind, f); save(); } }
    if (t.dataset && t.dataset.bind && t.type === 'date') { setP(cur, t.dataset.bind, t.value); save(); }
    if (t.dataset && t.dataset.photo) {
      var file = t.files && t.files[0], k = t.dataset.photo; t.value = '';
      if (!file) return;
      var slot = PHOTO_SLOTS.filter(function (s) { return s.k === k; })[0];
      busy(true, '사진을 맞추는 중…');
      Photo.fromFile(file, slot.aspect).then(function (r) {
        busy(false);
        if (!r) return;
        cur.photos[k] = r.crop; cur.photosOrig[k] = r.orig; save(true); rerender(); toast('사진을 넣었습니다.');
      }).catch(function (err) { busy(false); console.error(err); alert('사진을 읽지 못했습니다. 다른 사진을 골라 주세요.'); });
    }
  });
  window.addEventListener('pagehide', function () { save(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(true); });

  /* ---------- 카카오톡 등 앱 안의 브라우저 → 일반 브라우저로 ---------- */
  (function inApp() {
    var ua = navigator.userAgent || '', url = location.href;
    if (/KAKAOTALK/i.test(ua)) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
    if (/ Line\//i.test(ua) && url.indexOf('openExternalBrowser') < 0) { location.href = url + (url.indexOf('?') < 0 ? '?' : '&') + 'openExternalBrowser=1'; return; }
    var inapp = /NAVER\(inapp|Instagram|FBAN|FBAV|BAND\/|DaumApps|everytimeApp|; wv\)/i.test(ua);
    if (!inapp) return;
    var box = document.getElementById('inapp');
    if (/Android/i.test(ua)) {
      location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
      box.innerHTML = '파일 받기가 안 될 수 있어요. <a href="intent://' + esc(url.replace(/^https?:\/\//, '')) + '#Intent;scheme=https;package=com.android.chrome;end">크롬으로 열기</a>';
    } else {
      box.innerHTML = '이 화면은 앱 안의 브라우저라 PDF 받기가 안 될 수 있어요.<br>오른쪽 아래(또는 위) <b>⋯ 버튼 → 「Safari로 열기」</b>를 눌러 주세요.';
    }
    box.hidden = false;
  })();

  /* 시작: 보고서 기본 내용 설정 불러오기 */
  Store.get('__settings__').then(function (s) { SET = migrateSet(s); if (!s) Store.put(SET); render(); receiveFromFile(); }).catch(function () { SET = migrateSet(null); render(); receiveFromFile(); });
})();
