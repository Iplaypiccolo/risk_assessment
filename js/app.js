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
  var nearMode = 'gps';
  var customOpen = {};     // '추가하기'로 직접 입력칸을 연 항목
  var setSec = null;       // 기본 내용 바꾸기: 지금 보는 항목

  var STEPS = [
    { key: 'info', title: '기본 정보', short: '기본정보', icon: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.5 1.6-2 2.5-2s1.9.5 2.5 2M14 10h4M14 14h3"/>' },
    { key: 'workers', title: '근로자', short: '근로자', icon: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.3"/><path d="M16 14.6c2.2.1 3.9 1.5 4.5 4.4"/>' },
    { key: 'survey', title: '질문에 답하기', short: '질문', icon: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"/>' },
    { key: 'contacts', title: '비상연락처', short: '연락처', icon: '<path d="M5 4h3l2 5-2.5 1.5a11 11 0 005 5L14 13l5 2v3a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>' },
    { key: 'photos', title: '사진 넣기', short: '사진', icon: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>' },
    { key: 'done', title: 'PDF 받기', short: 'PDF', icon: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M12 11v6M9.5 14.5L12 17l2.5-2.5"/>' }
  ];
  /* 세 가지 서류: 위험성평가 · 작업계획서 · 특별교육. 업체 정보와 근로자는 함께 씀 */
  var STEPS_RA = STEPS;
  var IC = {
    info: STEPS_RA[0].icon, workers: STEPS_RA[1].icon, survey: STEPS_RA[2].icon, photos: STEPS_RA[4].icon, done: STEPS_RA[5].icon,
    equip: '<rect x="2.5" y="10" width="13" height="7" rx="1.5"/><path d="M15.5 12h3l3 3v2h-6z"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17" cy="18.5" r="1.8"/><path d="M5 10V6h6l2 4"/>',
    clip: '<path d="M20 11.5l-8.2 8.2a5 5 0 01-7-7L13 4.4a3.3 3.3 0 014.7 4.7l-8.3 8.3a1.7 1.7 0 01-2.4-2.4l7.6-7.6"/>'
  };
  var DOCS = {
    ra: { name: '위험성평가', steps: STEPS_RA, hero: ['위험성평가<br>결과보고서 만들기', '질문에 답하고 사진만 넣으면<br>PDF 보고서가 완성됩니다.', '제설작업 · 약 15분'] },
    plan: { name: '작업계획서', steps: [
      { key: 'p_info', title: '기본 정보', short: '기본정보', icon: IC.info },
      { key: 'workers', title: '근로자', short: '근로자', icon: IC.workers },
      { key: 'p_units', title: '장비', short: '장비', icon: IC.equip },
      { key: 'p_check', title: '장비 점검하기', short: '점검', icon: IC.survey },
      { key: 'p_survey', title: '사전조사', short: '사전조사', icon: IC.clip },
      { key: 'done', title: 'PDF 받기', short: 'PDF', icon: IC.done }
    ], hero: ['장비별<br>작업계획서 만들기', '장비와 운전원을 고르고 서류만 붙이면<br>작업계획서가 완성됩니다.', '굴착기 · 덤프 · 화물차 · 로더'] },
    sedu: { name: '특별교육', steps: [
      { key: 'e_info', title: '기본 정보', short: '기본정보', icon: IC.info },
      { key: 'workers', title: '근로자', short: '근로자', icon: IC.workers },
      { key: 'e_survey', title: '교육 확인', short: '교육', icon: IC.survey },
      { key: 'e_photos', title: '사진 넣기', short: '사진', icon: IC.photos },
      { key: 'done', title: 'PDF 받기', short: 'PDF', icon: IC.done }
    ], hero: ['특별교육<br>안전교육일지 만들기', '교육한 날과 참석 여부만 답하면<br>교육일지와 참석자 명단이 완성됩니다.', '교육일지 · 참석자 명단 · 사진대지'] }
  };
  var doc = DOCS[Settings.get('doc', 'ra')] ? Settings.get('doc', 'ra') : 'ra';
  STEPS = DOCS[doc].steps;
  function setDoc(d) { doc = d; Settings.set('doc', d); STEPS = DOCS[d].steps; }
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
  var SEDU_SLOTS = [{ k: 'sedu1', label: '교육 사진 ①', aspect: 1.42 }, { k: 'sedu2', label: '교육 사진 ②', aspect: 1.42 }];
  var ALL_SLOTS = PHOTO_SLOTS.concat(SEDU_SLOTS);
  var RELS = [['母', '어머니'], ['父', '아버지'], ['妻', '아내'], ['夫', '남편'], ['子', '아들'], ['女', '딸'], ['兄', '형·오빠'], ['姉', '누나·언니'], ['弟', '동생'], ['妹', '여동생'], ['孫', '손주']];
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
    c.docs = c.docs || {};
    c.docs.ra = c.docs.ra || { lastStep: c.lastStep || 0 };
    c.docs.plan = c.docs.plan || {}; c.docs.plan.units = c.docs.plan.units || []; c.docs.plan.survey = c.docs.plan.survey || [];
    c.docs.sedu = c.docs.sedu || {};
    if (c.docs.sedu.time === '09:00∼17:00 중 5H') c.docs.sedu.time = '09:00∼14:00 중 2H';
    if (c.answers.q2b2 === 'O') c.answers.q2b2 = 'B'; else if (c.answers.q2b2 === 'X') c.answers.q2b2 = 'N';
    delete c.answers.q10c;
    return c;
  }
  function migrateSet(s) {
    s = s || { id: '__settings__' };
    s.id = '__settings__'; s.edit = s.edit || {}; s.reviewed = s.reviewed || {};
    T.upgradeEdit(s.edit);
    Object.keys(T.DEFAULT_EDIT).forEach(function (k) { if (s.edit[k] === undefined) s.edit[k] = clone(T.DEFAULT_EDIT[k]); });
    T.upgradeEdit(s.edit);
    s.plan = DOCTPL.fillPlan(s.plan); s.sedu = DOCTPL.fillSedu(s.sedu);
    return s;
  }
  function PS() { return (SET && SET.plan) || DOCTPL.fillPlan(null); }
  function SS() { return (SET && SET.sedu) || DOCTPL.fillSedu(null); }
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
    var chips = '', hideInput = false;
    if (o.chips) {
      var known = o.chips.some(function (c) { return (Array.isArray(c) ? c[0] : c) === v; });
      var custom = o.add && (customOpen[path] || (v !== '' && !known));
      chips = '<div class="chips">' + o.chips.map(function (c) {
        var val = Array.isArray(c) ? c[0] : c, lab = Array.isArray(c) ? c[1] : c;
        return '<button type="button" class="chip' + (v === val ? ' on' : '') + '" data-act="chip" data-path="' + path + '" data-val="' + esc(val) + '">' + esc(lab) + '</button>';
      }).join('') + (o.add ? '<button type="button" class="chip add' + (custom ? ' on' : '') + '" data-act="chipAdd" data-path="' + path + '">＋ 추가하기</button>' : '') + '</div>';
      if (o.add && !custom) hideInput = true;
    }
    return '<label class="field' + (o.cls ? ' ' + o.cls : '') + '"><span class="lab">' + label + (o.req ? ' <em class="req">필수</em>' : '') + '</span>' +
      (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + chips + (o.noInput || hideInput ? '' : input) + (o.after || '') + '</label>';
  }

  /* ---------- 화면 그리기 ---------- */
  function render() {
    var nav = document.getElementById('bottomNav'), prog = document.getElementById('progress'), menu = document.getElementById('topMenu');
    var sub = document.getElementById('topSub');
    if (sub) sub.textContent = view === 'step' && cur ? (cur.info.company || '업체명 미입력') + ' · ' + DOCS[doc].name : view === 'settings' ? DOCS[doc].name + ' · 모든 업체에 똑같이 적용' : '위험성평가 · 작업계획서 · 특별교육';
    nav.classList.toggle('compact', view === 'settings');
    document.body.classList.toggle('wide', view === 'settings' && !!setSec);
    if (view === 'home') {
      document.getElementById('topTitle').textContent = '제설작업 안전 서류 만들기';
      nav.hidden = true; prog.hidden = true; menu.hidden = true;
      renderHome(); return;
    }
    var bp = document.getElementById('btnPrev'), bn = document.getElementById('btnNext');
    if (view === 'settings') {
      document.getElementById('topTitle').textContent = setSec ? secNo(setSec) + '. ' + secTitle(setSec) : DOCS[doc].name + ' 기본 내용 바꾸기';
      prog.hidden = true; menu.hidden = true;
      if (!setSec) nav.hidden = true;
      else {
        nav.hidden = false; bn.hidden = false;
        bp.textContent = showEd ? '✎ 표시 끄기' : '✎ 수정할 곳 보기'; bp.dataset.act = 'edShow';
        bn.textContent = '확인 ✔'; bn.dataset.act = 'setOk';
      }
      $app.innerHTML = viewSettings(); fitTables(); return;
    }
    bp.dataset.act = 'prev'; bn.dataset.act = 'next';
    var st = STEPS[stepIdx];
    document.getElementById('topTitle').textContent = (stepIdx + 1) + '. ' + st.title;
    menu.hidden = false; prog.hidden = false; nav.hidden = false;
    document.getElementById('progressBar').style.width = ((stepIdx + 1) / STEPS.length * 100) + '%';
    bp.textContent = stepIdx === 0 ? '◀ 처음으로' : '◀ 이전';
    bn.textContent = '다음 ▶';
    bn.hidden = stepIdx === STEPS.length - 1;
    var html = '';
    switch (st.key) {
      case 'info': html = viewInfo(); break;
      case 'workers': html = viewWorkers(); break;
      case 'survey': html = viewSurvey(); break;
      case 'contacts': html = viewContacts(); break;
      case 'photos': html = viewPhotos(PHOTO_SLOTS); break;
      case 'done': html = viewDone(); break;
      case 'p_info': html = viewPlanInfo(); break;
      case 'p_units': html = viewPlanUnits(); break;
      case 'p_survey': html = viewPlanSurvey(); break;
      case 'p_check': html = viewPlanCheck(); break;
      case 'e_info': html = viewEduInfo(); break;
      case 'e_survey': html = viewEduSurvey(); break;
      case 'e_photos': html = viewPhotos(SEDU_SLOTS); break;
    }
    $app.innerHTML = stepStrip() + '<div class="company-tag">' + esc(cur.info.company || '업체명 미입력') + '</div>' + html;
  }
  function goStep(i, keepScroll) {
    stepIdx = Math.max(0, Math.min(STEPS.length - 1, i)); view = 'step';
    cur.docs[doc].lastStep = stepIdx; if (doc === 'ra') cur.lastStep = stepIdx; save();
    render(); if (!keepScroll) window.scrollTo(0, 0);
  }

  /* 처음 화면 */
  function renderHome() {
    Store.all().then(function (list) {
      var hd = DOCS[doc].hero;
      var h = '<div class="doc-tabs" role="tablist" aria-label="만들 서류">' + Object.keys(DOCS).map(function (k) {
        return '<button role="tab" data-act="docSel" data-v="' + k + '" aria-selected="' + (k === doc) + '">' + DOCS[k].name + '</button>';
      }).join('') + '</div>';
      h += '<section class="hero"><h1>' + hd[0] + '</h1><p>' + hd[1] + '</p><span class="hero-tag">' + hd[2] + '</span></section>';
      h += '<div class="seg" role="group" aria-label="작성 방식"><button data-act="setMulti" data-v="0" aria-pressed="' + !multi + '">한 업체 작성</button><button data-act="setMulti" data-v="1" aria-pressed="' + multi + '">여러 업체 작성</button></div>';
      if (!multi) {
        var last = list.filter(function (c) { return c.id === Settings.get('currentId'); })[0] || list[0];
        if (last) {
          h += '<div class="card"><div class="card-sub">작성 중인 업체 · ' + DOCS[doc].name + '</div><div class="card-title">' + esc(last.info.company || '업체명 미입력') + '</div>' +
            '<div class="card-sub">' + esc(docStatus(migrate(last))) + '</div>' +
            '<div class="row2 home-btns"><button class="btn btn-primary" data-act="open" data-id="' + last.id + '">이어서 작성 ▶</button>' +
            '<button class="btn btn-ghost" data-act="restart" data-id="' + last.id + '">새로 작성</button></div></div>';
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
            '<div class="card-sub">' + esc(docStatus(migrate(c), ev)) + ' · ' + new Date(c.updatedAt || Date.now()).toLocaleDateString('ko-KR') + '</div>' +
            '<div class="row4"><button class="btn btn-primary" data-act="open" data-id="' + c.id + '">열기</button>' +
            '<button class="btn btn-ghost" data-act="openWorkers" data-id="' + c.id + '">근로자</button>' +
            '<button class="btn btn-ghost" data-act="copy" data-id="' + c.id + '">복사</button>' +
            '<button class="btn btn-danger" data-act="delete" data-id="' + c.id + '">삭제</button></div></div>';
        });
      }
      h += '<div class="home-tools">' +
        '<button class="btn btn-ghost btn-big" data-act="settings">⚙ ' + DOCS[doc].name + ' 기본 내용 바꾸기</button>' +
        '<p class="note">' + ({ ra: '위험요인, 점검 항목, 보호구 등', plan: '결재칸, 장비별 점검표, 운행경로 그림 등', sedu: '결재칸, 교육구분, 교육내용 등' })[doc] + ' 서류에 미리 들어 있는 내용을 고칩니다. 모든 업체에 똑같이 적용됩니다. 고칠 것이 없으면 누르지 않아도 됩니다.</p>' +
        '<details class="more"><summary>기본 내용 설정 저장 · 불러오기</summary><p class="note">세 서류(위험성평가·작업계획서·특별교육)의 「기본 내용 바꾸기」에서 고친 설정만 파일(.json)로 저장하고 불러옵니다. 업체가 작성한 내용은 들어가지 않습니다. 이 파일을 다른 분께 보내 「불러오기」 하면 같은 설정으로 보고서를 만들 수 있습니다.</p><div class="row2"><button class="btn btn-ghost" data-act="export">설정 저장</button><button class="btn btn-ghost" data-act="import">설정 불러오기</button></div></details></div>';
      $app.innerHTML = h;
    });
  }

  function docStatus(c, ev) {
    if (doc === 'plan') { var n = (c.docs.plan.units || []).length; return n ? '장비 ' + n + '대' : '장비 아직 없음'; }
    if (doc === 'sedu') { var e = c.docs.sedu; return e.date ? '교육일 ' + e.date.replace(/-/g, '.') : '교육일 미입력'; }
    ev = ev || L.evalSummary(c);
    return (c.info.contract || '') + (ev.done ? ' · 질문 완료 (' + ev.grade + ')' : ' · 질문 진행 중');
  }

  /* 1. 기본 정보 */
  function viewInfo() {
    return '<p class="lead">보고서 곳곳에 자동으로 들어갈 정보입니다.</p>' +
      field('계약명 (용역명)', 'info.contract', { req: 1, ph: '예) 2026년 ○○지사 제설작업 용역' }) +
      field('업체명', 'info.company', { req: 1, ph: '예) ○○건설기계' }) +
      field('대표자 성명', 'info.ceo', { req: 1, ph: '예) 홍길동' }) +
      field('대표자 휴대폰', 'info.ceoPhone', { type: 'tel', ph: '010-0000-0000' }) +
      field('일하는 도로공사 지사', 'info.branch', { ph: '예) 영동', hint: '「○○지사」의 ○○만 적으세요. 가까운 병원·119를 찾을 때 씁니다.' }) +
      field('업종', 'info.bizType', { chips: ['건설기계 대여업', '화물 운송업'], add: 1, ph: '업종을 적어 주세요' }) +
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
        field('하는 일', 'workers.' + i + '.role', { chips: ['운전원'], add: 1, ph: '하는 일을 적어 주세요 (예: 신호수)' }) + '</div>';
    });
    h += '<button class="btn btn-ghost btn-big" data-act="addWorker">＋ 근로자 추가</button>';
    if (doc !== 'ra') return h;
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
        relSelect(i) +
        field('이름', 'emergency.' + i + '.name') + field('휴대폰', 'emergency.' + i + '.phone', { type: 'tel', ph: '010-0000-0000' }) + '</div>';
    });
    h += '<h3 class="sec">가까운 긴급 구호기관</h3>';
    var nr = nearCache[cur.id];
    if (Near.hasKey()) {
      h += '<p class="hint">어디를 기준으로 찾을까요?</p>' +
        '<div class="seg" role="group" aria-label="기준 위치"><button data-act="nearMode" data-v="gps" aria-pressed="' + (nearMode === 'gps') + '">📍 내 위치 근처</button><button data-act="nearMode" data-v="base" aria-pressed="' + (nearMode === 'base') + '">🏢 지사 근처</button></div>' +
        '<button class="btn btn-primary btn-big" data-act="nearFind">가장 가까운 곳으로 한 번에 채우기</button>' +
        '<p class="hint">하나씩 직접 고르려면 아래 칸마다 있는 「🗺 지도에서 고르기」를 누르세요.</p>';
      if (nr && nr.base) h += '<p class="hint">기준 위치: ' + esc(nr.base.name) + '</p>';
    } else {
      h += '<p class="hint">「카카오맵에서 찾기」를 누르면 가까운 곳과 전화번호가 나옵니다. 보고 아래 칸에 적어 주세요.</p>';
    }
    AGENCIES.forEach(function (a) {
      var k = a[0], list = nr && nr[k];
      h += '<div class="card"><div class="card-head"><b>' + a[1] + '</b>' + (Near.hasKey() ? '<button class="btn btn-sm btn-ghost" data-act="nearMap" data-k="' + k + '">🗺 지도에서 고르기</button>' : '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + esc(Near.mapLink(k, cur.info.branch, cur.info.address)) + '">카카오맵에서 찾기</a>') + '</div>';
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
  function relSelect(i) {
    var v = cur.emergency[i].rel || '';
    var known = RELS.some(function (r) { return r[0] === v; });
    return '<label class="field"><span class="lab">관계</span><select class="sel" data-bind="emergency.' + i + '.rel">' +
      '<option value=""' + (v ? '' : ' selected') + '>골라 주세요</option>' +
      RELS.map(function (r) { return '<option value="' + r[0] + '"' + (v === r[0] ? ' selected' : '') + '>' + r[1] + ' (' + r[0] + ')</option>'; }).join('') +
      (v && !known ? '<option value="' + esc(v) + '" selected>' + esc(v) + '</option>' : '') +
      '</select></label>';
  }
  function nearFind(mode) {
    mode = mode || nearMode;
    if (mode === 'base' && !cur.info.branch && !cur.info.address) { alert('「기본 정보」에서 일하는 지사 이름이나 사업장 주소를 먼저 적어 주세요.'); return; }
    busy(true, mode === 'gps' ? '내 위치를 확인하는 중…<br><small>위치 사용을 허락해 주세요</small>' : '가까운 곳을 찾는 중…');
    Near.find(mode, cur.info.branch, cur.info.address).then(function (r) {
      busy(false); nearCache[cur.id] = r;
      AGENCIES.forEach(function (a) {
        var k = a[0], first = r[k] && r[k][0];
        if (first) cur.agencies[k] = { name: first.name, phone: first.phone };
      });
      save(); rerender(); toast('가장 가까운 곳을 넣었습니다. 다른 곳을 누르면 바뀝니다.');
    }).catch(function (e) {
      busy(false);
      var m = e && e.message;
      if ((m === 'GPS_DENIED' || m === 'NO_GPS') && (cur.info.branch || cur.info.address)) {
        if (confirm((m === 'GPS_DENIED' ? '위치 사용이 허락되지 않았어요.' : '내 위치를 알 수 없어요.') + '\n대신 「지사 근처」로 찾을까요?')) { nearMode = 'base'; nearFind('base'); }
        return;
      }
      alert(m === 'GPS_DENIED' ? '위치 사용이 허락되지 않았어요. 휴대폰 설정에서 위치를 켜거나, 「지사 근처」를 골라 주세요.'
        : m === 'NO_BASE' ? '지사나 주소 위치를 찾지 못했어요. 「기본 정보」의 지사 이름이나 주소를 확인해 주세요.'
        : m === 'NO_GPS' ? '내 위치를 알 수 없어요. 「지사 근처」를 골라 주세요.'
        : '검색하지 못했어요. 인터넷 연결을 확인하거나 직접 적어 주세요.');
    });
  }

  /* 5. 사진 */
  function viewPhotos(slots) {
    var h = '<p class="lead">사진을 찍거나 앨범에서 고르세요. <b>크기는 자동으로 맞춰집니다.</b></p>';
    (slots || PHOTO_SLOTS).forEach(function (s) {
      var p = cur.photos[s.k];
      h += '<div class="card photo"><div class="card-head"><b>' + s.label + '</b>' + (p ? '<span class="ok">✔ 넣음</span>' : '') + '</div>' +
        '<div class="ph-box" style="aspect-ratio:' + s.aspect + '">' + (p ? '<img src="' + p + '" alt="">' : '<span>사진 없음</span>') + '</div>' +
        '<div class="row2"><label class="btn btn-primary file-btn">📷 사진 찍기<input type="file" accept="image/*" capture="environment" data-photo="' + s.k + '"></label>' +
        '<label class="btn btn-ghost file-btn">🖼 앨범에서<input type="file" accept="image/*" data-photo="' + s.k + '"></label></div>' +
        (p ? '<div class="row2"><button class="btn btn-ghost" data-act="recrop" data-k="' + s.k + '">✂ 다시 자르기</button><button class="btn btn-danger" data-act="delPhoto" data-k="' + s.k + '">사진 빼기</button></div>' : '') + '</div>';
    });
    return h;
  }

  /* ===== 작업계획서 (업체가 하는 일) ===== */
  function viewPlanInfo() {
    var pd = cur.docs.plan, i = cur.info;
    if (pd.workName == null) pd.workName = i.contract || (i.branch ? String(i.branch).replace(/지사$/, '') + '지사 제설작업' : '');
    if (!pd.start && i.contractStart) pd.start = i.contractStart;
    if (!pd.end && i.contractEnd) pd.end = i.contractEnd;
    return '<p class="lead">작업계획서 맨 위 표에 들어갈 정보입니다. 다른 서류에 적은 내용은 함께 씁니다.</p>' +
      field('업체명', 'info.company', { req: 1, ph: '예) ○○건설기계' }) +
      field('대표자 성명', 'info.ceo', { req: 1, ph: '예) 홍길동', hint: '결재칸 「사업주」 옆에 들어갑니다.' }) +
      field('일하는 도로공사 지사', 'info.branch', { ph: '예) 영동' }) +
      field('작업명(장소)', 'docs.plan.workName', { req: 1, ph: '예) 영동지사 제설작업' }) +
      field('작업 시작일', 'docs.plan.start', { type: 'date' }) + field('작업 종료일', 'docs.plan.end', { type: 'date' });
  }
  function driverSelect(base, u) {
    return '<label class="field"><span class="lab">운전원</span><select class="sel" data-bind="' + base + '.driver">' +
      '<option value=""' + (u.driver === '' || u.driver == null ? ' selected' : '') + '>골라 주세요</option>' +
      cur.workers.map(function (w, i) { return '<option value="' + i + '"' + (u.driver !== '' && u.driver != null && +u.driver === i ? ' selected' : '') + '>' + esc(w.name || ('근로자 ' + (i + 1))) + (w.phone ? ' (' + esc(w.phone) + ')' : '') + '</option>'; }).join('') +
      '</select><span class="hint">「근로자」에 적은 사람 중에서 고릅니다. 연락처도 함께 들어갑니다.</span></label>';
  }
  var KIND_ICON = { image: '🖼', pdf: '📕', hwp: '📘', doc: '📄', other: '📎' };
  function attachBox(path, title, hint) {
    var arr = getP(cur, path) || [];
    var h = '<div class="att"><div class="att-h"><b>' + esc(title) + '</b>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
    if (arr.length) h += '<ul class="att-list">' + arr.map(function (f, i) {
      return '<li>' + (f.kind === 'image' ? '<img src="' + f.data + '" alt="">' : '<span class="att-ic">' + (KIND_ICON[f.kind] || '📎') + '</span>') +
        '<span class="att-n">' + esc(f.name) + (f.kind === 'hwp' || f.kind === 'doc' || f.kind === 'other' ? '<small>PDF 안에 첨부파일로 들어가요. 인쇄는 따로 해 주세요.</small>' : f.kind === 'pdf' ? '<small>PDF 뒤쪽에 이어 붙여요</small>' : '') + '</span>' +
        '<span class="att-b">' + (f.kind === 'image' ? '<button class="btn btn-sm btn-ghost" data-act="attEdit" data-path="' + path + '" data-i="' + i + '">✂ 편집</button>' : '') +
        '<button class="btn btn-sm btn-danger" data-act="attDel" data-path="' + path + '" data-i="' + i + '">빼기</button></span></li>';
    }).join('') + '</ul>';
    else h += '<p class="note att-none">붙인 것 없음</p>';
    h += '<div class="row2"><label class="btn btn-ghost file-btn">📷 사진 찍기<input type="file" accept="image/*" capture="environment" data-attach="' + path + '"></label>' +
      '<label class="btn btn-ghost file-btn">📎 파일 고르기<input type="file" multiple accept="image/*,.pdf,.hwp,.hwpx,.doc,.docx,application/pdf" data-attach="' + path + '"></label></div></div>';
    return h;
  }
  function routeSrc(path) {
    var v = getP(cur, path); if (v) return v;
    var m = /^docs\.plan\.units\.(\d+)\.route$/.exec(path);
    if (m) return unitRoute(cur.docs.plan.units[+m[1]]);
    m = /^plan\.types\.(\d+)\.route$/.exec(path);
    if (m) return (cur.plan.types[+m[1]] || {}).routeDefault || '';
    return '';
  }
  function routeBox(path, title) {
    var src = routeSrc(path), custom = !!getP(cur, path);
    return '<div class="att"><div class="att-h"><b>' + esc(title) + '</b>' + (custom ? '<span class="ok">바꾼 그림</span>' : '<span class="hint">기본 그림</span>') + '</div>' +
      '<div class="route-img">' + (src ? '<img src="' + esc(src) + '" alt="운행경로 그림">' : '<span>그림 없음</span>') + '</div>' +
      '<div class="row3"><label class="btn btn-ghost file-btn">🖼 다른 그림으로<input type="file" accept="image/*" data-routefile="' + path + '"></label>' +
      (src ? '<button class="btn btn-ghost" data-act="routeEdit" data-path="' + path + '">✂ 그림 편집</button>' : '') +
      (custom ? '<button class="btn btn-ghost" data-act="routeReset" data-path="' + path + '">↺ 기본 그림</button>' : '') + '</div></div>';
  }
  function viewPlanUnits() {
    var P = PS(), pd = cur.docs.plan;
    var h = '<p class="lead">작업계획서를 만들 장비를 누르세요. <b>장비마다 작업계획서가 한 부씩</b> 만들어집니다.</p>';
    h += '<div class="chips big unit-add">' + P.types.map(function (t) { return '<button class="chip add" data-act="unitAdd" data-type="' + esc(t.id) + '">＋ ' + esc(t.name) + '</button>'; }).join('') + '</div>';
    var shown = 0;
    pd.units.forEach(function (u, ui) {
      var Ty = PLANDOC.typeOf(P, u.type); if (!Ty) return;
      shown++;
      var base = 'docs.plan.units.' + ui;
      h += '<div class="card unit"><div class="card-head"><b>' + esc(Ty.name) + ' 작업계획서</b><button class="btn btn-danger btn-sm" data-act="unitDel" data-i="' + ui + '">빼기</button></div>' +
        driverSelect(base, u) +
        attachBox(base + '.reg', '기계·장비 제원 서류', Ty.equipNote) +
        attachBox(base + '.lic', '운전원 자격·면허 (있으면)', '운전면허증, 건설기계조종사면허증 등') +
        routeBox(base + '.route', '운행경로 및 작업방법 그림') + '</div>';
    });
    if (!shown) h += '<p class="note">아직 장비가 없습니다. 위에서 장비를 눌러 추가하세요.</p>';
    return h;
  }
  function viewPlanSurvey() {
    return '<p class="lead">작업장소의 지형·지반 상태를 조사한 서류가 있으면 붙여 주세요. <b>없으면 그냥 「다음」</b>을 누르세요.</p>' +
      attachBox('docs.plan.survey', '사전조사 내용', PS().surveyNote) +
      '<p class="note">한글(.hwp)·워드(.docx) 파일은 PDF 화면에 그대로 보이게 넣을 수 없어 PDF 안에 「첨부파일」로 들어갑니다(인쇄 안 됨). 가능하면 PDF나 사진으로 넣어 주세요.</p>';
  }

  /* 장비 점검 설문: 추가한 장비의 점검 항목만, 한 문제씩 */
  var ckAct = null;   // 부적정이라 답한 뒤 안전조치를 적는 중인 항목 {u, i}
  function planUnits() { var P = PS(); return cur.docs.plan.units.map(function (u, ui) { return { u: u, ui: ui, T: PLANDOC.typeOf(P, u.type) }; }).filter(function (x) { return x.T; }); }
  function ckPending() {
    var us = planUnits();
    for (var k = 0; k < us.length; k++) {
      var x = us[k], ans = x.u.ans || {};
      for (var i = 0; i < (x.T.checks || []).length; i++) if (!ans[i]) return { x: x, i: i, k: k };
    }
    return null;
  }
  function ckCount() {
    var tot = 0, done = 0;
    planUnits().forEach(function (x) { (x.T.checks || []).forEach(function (c, i) { tot++; if ((x.u.ans || {})[i]) done++; }); });
    return { tot: tot, done: done };
  }
  function viewPlanCheck() {
    var us = planUnits();
    if (!us.length) return '<p class="lead">먼저 「장비」 단계에서 장비를 추가해 주세요.</p><button class="btn btn-ghost btn-big" data-act="goto" data-i="2">◀ 장비 추가하러 가기</button>';
    var cnt = ckCount();
    var bar = '<div class="sv-prog"><span>' + cnt.done + ' / ' + cnt.tot + '</span><div class="sv-bar"><i style="width:' + (cnt.tot ? cnt.done / cnt.tot * 100 : 0) + '%"></i></div></div>';
    if (ckAct) {
      var ux = cur.docs.plan.units[ckAct.u], T = ux && PLANDOC.typeOf(PS(), ux.type), it = T && T.checks[ckAct.i];
      if (it) {
        return bar + '<div class="sv-card"><div class="sv-topic">' + esc(T.name) + ' · ' + esc(it.group) + '</div><div class="sv-q">' + esc(it.text) + '</div>' +
          '<div class="warn">❌ 부적정으로 답했어요. 어떻게 고칠지 적어 주세요. (모르면 비워 두세요)</div>' +
          field('안전조치', 'docs.plan.units.' + ckAct.u + '.act.' + ckAct.i, { type: 'area', rows: 2, ph: '예) 후방카메라 교체 예정' }) +
          '<button class="btn btn-primary btn-big" data-act="ckActDone">다 적었어요 ▶</button></div>';
      }
      ckAct = null;
    }
    var pd = ckPending();
    if (pd) {
      var c = pd.x.T.checks[pd.i], n = pd.x.T.checks.length;
      var h = bar + '<div class="ck-unit">' + esc(pd.x.T.name) + ' 작업계획서 <small>(' + (pd.i + 1) + ' / ' + n + ')</small></div>' +
        '<div class="sv-card"><div class="sv-topic">' + esc(c.group) + '</div><div class="sv-q">' + esc(c.text) + '</div>' + (c.note ? '<div class="sv-help">' + esc(c.note) + '</div>' : '') +
        '<div class="ox"><button class="ox-btn o" data-act="ckAns" data-u="' + pd.x.ui + '" data-i="' + pd.i + '" data-v="O"><span>⭕</span>적정<small>잘 되어 있어요</small></button>' +
        '<button class="ox-btn x" data-act="ckAns" data-u="' + pd.x.ui + '" data-i="' + pd.i + '" data-v="X"><span>❌</span>부적정<small>고쳐야 해요</small></button></div></div>';
      if (cnt.done) h += '<button class="btn btn-ghost" data-act="ckBack">↩ 앞 질문 다시 답하기</button>';
      return h;
    }
    var h2 = '<div class="sv-done"><div class="sv-done-t">장비 점검을 모두 마쳤습니다 👍</div><div class="hint">「다음」을 누르세요. 아래에서 답을 눌러 다시 고칠 수 있어요.</div></div>';
    us.forEach(function (x) {
      var ans = x.u.ans || {}, act = x.u.act || {}, bad = (x.T.checks || []).filter(function (c, i) { return ans[i] === 'X'; }).length;
      h2 += '<h3 class="sec">' + esc(x.T.name) + ' <small>(부적정 ' + bad + '개)</small></h3><div class="ans-list">' + (x.T.checks || []).map(function (c, i) {
        return '<button class="ans-row" data-act="ckRedo" data-u="' + x.ui + '" data-i="' + i + '"><span class="ans-t">' + (i + 1) + '. ' + esc(c.text) + (ans[i] === 'X' && act[i] ? '<small class="ck-act">안전조치: ' + esc(act[i]) + '</small>' : '') + '</span><span class="ans-a">' + (ans[i] === 'O' ? '⭕ 적정' : ans[i] === 'X' ? '❌ 부적정' : '') + '</span></button>';
      }).join('') + '</div><button class="btn btn-ghost" data-act="ckReset" data-u="' + x.ui + '">↺ ' + esc(x.T.name) + ' 처음부터 다시 점검</button>';
    });
    return h2;
  }

  /* ===== 특별교육 (업체가 하는 일) ===== */
  function viewEduInfo() {
    var ed = cur.docs.sedu;
    if (!ed.date) ed.date = cur.info.writeDate || D.today();
    if (ed.time == null) ed.time = SS().timeText || '';
    return '<p class="lead">안전교육일지에 들어갈 정보입니다. 다른 서류에 적은 내용은 함께 씁니다.</p>' +
      field('업체명', 'info.company', { req: 1, ph: '예) ○○건설기계' }) +
      field('대표자 성명', 'info.ceo', { req: 1, ph: '예) 홍길동' }) +
      field('교육한 날', 'docs.sedu.date', { type: 'date' }) +
      field('교육 시간', 'docs.sedu.time', { ph: '예) 09:00∼17:00 중 5H' });
  }
  function viewEduSurvey() {
    var ed = cur.docs.sedu, n = cur.workers.filter(function (w) { return w.name; }).length;
    if (!ed.instructors) { ed.instructors = clone(SS().instructors || []); save(); }
    var h = '<div class="sv-card"><div class="sv-topic">교육 인원</div><div class="sv-q">근로자 ' + n + '명 모두 교육을 받았나요?</div>' +
      '<div class="ox"><button class="ox-btn o' + (ed.allDone === 'O' ? ' on' : '') + '" data-act="eduAll" data-v="O"><span>⭕</span>예</button>' +
      '<button class="ox-btn x' + (ed.allDone === 'X' ? ' on' : '') + '" data-act="eduAll" data-v="X"><span>❌</span>아니요</button></div>';
    if (ed.allDone === 'X') {
      h += '<div class="counter"><span>교육 못 받은 사람</span><button class="cbtn" data-act="absCnt" data-d="-1" aria-label="줄이기">－</button><b>' + (+ed.absent || 0) + '<small>명</small></b><button class="cbtn" data-act="absCnt" data-d="1" aria-label="늘리기">＋</button></div>' +
        field('못 받은 이유', 'docs.sedu.reason', { ph: '예) 개인 사정' });
    }
    h += '</div><h3 class="sec">교육 실시자 및 장소</h3><p class="hint">교육을 한 사람과 장소를 적어 주세요.</p>';
    ed.instructors.forEach(function (r, i) {
      h += '<div class="card"><div class="card-head"><b>교육 실시자 ' + (i + 1) + '</b>' + (ed.instructors.length > 1 ? '<button class="btn btn-danger btn-sm" data-act="insDel" data-i="' + i + '">삭제</button>' : '') + '</div>' +
        field('성명', 'docs.sedu.instructors.' + i + '.name', { ph: '예) 홍길동' }) + field('직명', 'docs.sedu.instructors.' + i + '.title', { ph: '예) 안전담당자' }) +
        field('교육실시 장소', 'docs.sedu.instructors.' + i + '.place', { ph: '예) 2층 대회의실' }) + '</div>';
    });
    return h + '<button class="btn btn-ghost btn-big" data-act="insAdd">＋ 교육 실시자 추가</button>';
  }

  /* 6. 완성 */
  function viewDone() { return doc === 'plan' ? viewDonePlan() : doc === 'sedu' ? viewDoneEdu() : viewDoneRA(); }
  function checksHtml(checks) {
    var h = '<div class="checks">' + checks.map(function (c) {
      return '<div class="chk ' + (c[0] ? 'ok' : 'no') + '"><span>' + (c[0] ? '✔' : '!') + ' ' + c[1] + '</span>' + (c[0] ? '' : '<button class="btn btn-sm btn-ghost" data-act="goto" data-i="' + c[2] + '">채우러 가기</button>') + '</div>';
    }).join('') + '</div>';
    if (checks.some(function (c) { return !c[0]; })) h += '<p class="note">빠진 것이 있어도 PDF는 만들 수 있습니다. 빈칸은 비워진 채로 나옵니다.</p>';
    return h;
  }
  function pdfButtons() {
    return '<button class="btn btn-primary btn-huge" data-act="pdf">📄 PDF 받기</button>' +
      '<button class="btn btn-ghost btn-big" data-act="pdfView">👀 PDF 미리 보기</button>' +
      '<p class="note">처음 만들 때는 글꼴을 받느라 10~20초 걸릴 수 있어요.</p>' + signGuide();
  }
  function stat(n, l) { return '<div class="stat"><div class="num">' + n + '</div><div class="lbl">' + l + '</div></div>'; }
  function viewDonePlan() {
    var i = cur.info, pd = cur.docs.plan, P = PS();
    var units = pd.units.filter(function (u) { return PLANDOC.typeOf(P, u.type); });
    var nW = cur.workers.filter(function (x) { return x.name; }).length;
    var nA = (pd.survey || []).length + units.reduce(function (a, u) { return a + (u.reg || []).length + (u.lic || []).length; }, 0);
    var hasDrv = function (u) { return u.driver !== '' && u.driver != null && cur.workers[+u.driver]; };
    return '<div class="statbar">' + stat(units.length, '장비') + stat(nW, '근로자') + stat(nA, '첨부') + '</div>' + checksHtml([
      [!!i.company, '업체명', 0], [!!i.ceo, '대표자 성명', 0], [!!pd.workName, '작업명(장소)', 0], [!!pd.start && !!pd.end, '작업기간', 0],
      [nW > 0, '근로자 이름', 1], [units.length > 0, '장비 추가', 2],
      [units.length > 0 && units.every(hasDrv), '장비마다 운전원 고르기', 2],
      [units.length > 0 && units.every(function (u) { return (u.reg || []).length; }), '장비 서류(등록증 등) 붙이기', 2],
      (function () { var c = ckCount(); return [c.tot > 0 && c.done === c.tot, '장비 점검하기 (' + c.done + '/' + c.tot + ')', 3]; })()
    ]) + pdfButtons();
  }
  function viewDoneEdu() {
    var i = cur.info, ed = cur.docs.sedu;
    var nW = cur.workers.filter(function (x) { return x.name; }).length;
    var nP = SEDU_SLOTS.filter(function (s) { return cur.photos[s.k]; }).length;
    return '<div class="statbar">' + stat(nW, '참석자') + stat(ed.allDone === 'X' ? nW - (+ed.absent || 0) : nW, '이수자') + stat(nP + '/' + SEDU_SLOTS.length, '사진') + '</div>' + checksHtml([
      [!!i.company, '업체명', 0], [!!ed.date, '교육한 날', 0], [nW > 0, '근로자(참석자) 이름', 1], [!!ed.allDone, '교육 인원 답하기', 2],
      [(ed.instructors || []).some(function (r) { return r.name; }), '교육 실시자 이름', 2], [nP === SEDU_SLOTS.length, '사진 (' + nP + '/' + SEDU_SLOTS.length + ')', 3]
    ]) + pdfButtons();
  }
  function viewDoneRA() {
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
      '<p class="note">처음 만들 때는 글꼴을 받느라 10~20초 걸릴 수 있어요.</p>' + signGuide();
    return h;
  }

  /* ---------- 서명할 곳 안내 (PDF를 만들 때 쪽 번호를 알아냄) ---------- */
  var SIGN_SPOTS = [
    { id: 'sig_policy', doc: '안전보건방침', where: '맨 아래 가운데 「대표 ○○○ (서 명)」 자리', who: '사장' },
    { id: 'sig_rules', doc: '위험성평가 실시규정 (첫 장)', where: '오른쪽 위 결재칸 「근로자」·「사 장」 두 칸', who: '근로자 1명 + 사장' },
    { id: 'sig_info_', doc: '안전ㆍ보건상 위험정보 표', where: '오른쪽 위 「평가자 ○○○ (인)」 자리', who: '사장' },
    { id: 'sig_res_', doc: '위험성평가 결과서 (초록색 표)', where: '오른쪽 위 「평가자 ○○○ (인)」 자리와, 맨 오른쪽 「사 장」 칸 (줄마다)', who: '사장' },
    { id: 'sig_iv_', doc: '근로자 청취조사표', where: '경험담마다 「성 명 : ○○○ (인)」 자리', who: '이름이 적힌 근로자' }
  ];
  function pageText(list) {
    if (!list || !list.length) return '';
    list = list.slice().sort(function (a, b) { return a - b; });
    var out = [], st = list[0], pv = list[0];
    for (var i = 1; i <= list.length; i++) {
      var n = list[i];
      if (n === pv + 1) { pv = n; continue; }
      out.push(st === pv ? st + '쪽' : st + '~' + pv + '쪽'); st = pv = n;
    }
    return out.join(', ');
  }
  function signSpots() {
    if (doc === 'plan') {
      var ap = PS().approvals || [];
      return [{ id: 'sig_plan_', doc: '작업계획서 (장비마다 첫 장)', where: '맨 위 오른쪽 결재칸 「' + ap.map(function (a) { return a.label; }).join('」·「') + '」의 (인) 자리', who: ap.length > 1 ? '결재칸마다 해당하는 분 (사업주 칸은 사장)' : '사장' }];
    }
    if (doc === 'sedu') {
      var ae = SS().approvals || [];
      return [{ id: 'sig_edu', doc: '안전교육일지 (첫 장)', where: '맨 위 오른쪽 결재칸 「' + ae.map(function (a) { return a.label; }).join('」·「') + '」 아래 빈칸', who: '사장' },
        { id: 'sig_roster', doc: '교육 참석자 명단', where: '이름 옆 「서 명」 칸', who: '교육받은 근로자 각자' }];
    }
    return SIGN_SPOTS;
  }
  function signGuide() {
    var sp = (cur.docs[doc] && cur.docs[doc].sigPages) || null;
    var rows = signSpots().map(function (s) {
      var pg = [];
      if (sp) Object.keys(sp).forEach(function (k) { if (k === s.id || (s.id.slice(-1) === '_' && k.indexOf(s.id) === 0)) pg = pg.concat(sp[k]); });
      pg = pg.filter(function (v, i, a) { return a.indexOf(v) === i; });
      return '<li><div class="sg-pg">' + (sp ? (pg.length ? pageText(pg) : '-') : '?쪽') + '</div><div class="sg-t"><b>' + esc(s.doc) + '</b><span>' + esc(s.where) + '</span><em>✍ ' + esc(s.who) + '</em></div></li>';
    }).join('');
    return '<div class="sign-guide"><h3>✍ 출력한 뒤 서명할 곳</h3>' +
      (sp ? '' : '<p class="note">PDF를 받거나 미리 보면 몇 쪽인지 표시됩니다. 쪽 번호는 각 쪽 맨 아래에 있어요.</p>') +
      '<ol>' + rows + '</ol></div>';
  }

  /* ---------- 보고서 기본 내용 설정 (모든 업체 공통) ---------- */
  var KRAS_TYPES = ['충돌위험 부분', '기계(설비)의 낙하, 비래, 전복, 붕괴, 전도 위험 부분', '중량물 취급작업', '추락위험 부분(개구부 등)', '화재·폭발위험', '아크, 전기화재, 감전', '기후(한랭)', '넘어짐(미끄러짐, 걸림, 헛디딤)', '끼임(감김)'];
  var CLS_TYPES = ['1. 기계설비적요인', '2. 전기적 요인', '3. 화학적 요인', '4. 생물학적 요인', '5. 작업특성 요인', '6. 작업환경 요인'];
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
  function pick123(label, path, v, names) {
    return '<div class="field"><span class="lab">' + label + '</span><div class="chips">' + [1, 2, 3].map(function (n) {
      return '<button class="chip num' + (+v === n ? ' on' : '') + '" data-act="setv" data-path="' + path + '" data-json="' + n + '">' + n + ' (' + names[n - 1] + ')</button>';
    }).join('') + '</div></div>';
  }
  function nl(s) { return esc(s == null ? '' : s).replace(/\n/g, '<br>'); }
  /* =========================================================
   * 보고서 기본 내용 바꾸기 — 보고서 목차(1~4장) 아래 항목, 보고서 표 모양 그대로,
   * 수정 가능한 칸을 누르면 수정 창(메모)이 뜸
   * ========================================================= */
  var CHAPTERS = [
    { no: '1', title: '위험성평가 실시규정', fixed: '법령·지침에 따른 고정 내용이라 바꾸지 않습니다. 업체명·대표자 이름 등은 자동으로 들어갑니다.' },
    { no: '2', title: '위험성평가 실시', items: ['process', 'equip', 'patrol', 'cases', 'msds', 'hazard', 'results'] },
    { no: '3', title: '위험성평가 교육', items: ['edu', 'interviews'] },
    { no: '4', title: '기타 제출서류', items: ['@eval', 'budget', 'danger', 'ppe', 'insp', 'eduRec', 'emer'] }
  ];
  var SEC_TITLE = {
    process: '사업장 개요', equip: '안전·보건상 위험정보', patrol: '사업장 순회점검 조사표', cases: '재해사례·재해통계 정보 조사',
    msds: '물질안전보건자료 (MSDS)', hazard: '유해위험요인 분류', results: '위험성평가 결과서',
    edu: '교육 결과 (사전 교육 · 결과 교육)', interviews: '근로자 청취조사표',
    '@eval': '수급업체 산업재해예방 조치능력 평가표', budget: '안전 예산 현황', danger: '위험작업 관리계획', ppe: '개인보호구',
    insp: '안전점검 계획', eduRec: '교육실적', emer: '비상대책'
  };
  function docChapters() {
    if (doc === 'plan') return [
      { no: '1', title: '작업계획서 공통', items: ['p_common'] },
      { no: '2', title: '장비별 작업계획서', items: PS().types.map(function (t) { return 'pt_' + t.id; }), addType: true }
    ];
    if (doc === 'sedu') return [
      { no: '1', title: '안전교육일지', items: ['e_log'] },
      { no: '2', title: '교육 참석자 명단 · 사진대지', fixed: '업체의 근로자 명단과 사진으로 자동으로 채워집니다. 고칠 내용이 없습니다.' }
    ];
    return CHAPTERS;
  }
  function typeIdx(tid) { var ts = (cur && cur.plan ? cur.plan : PS()).types; for (var i = 0; i < ts.length; i++) if (ts[i].id === tid) return i; return -1; }
  function secTitle(id) {
    if (id === 'p_common') return '결재칸 · 유도자 · 첨부 문구';
    if (/^pt_/.test(id)) { var ti = typeIdx(id.slice(3)); return ti >= 0 ? cur.plan.types[ti].name + ' 작업계획서' : '(지운 장비)'; }
    if (id === 'e_log') return '안전교육일지';
    return SEC_TITLE[id];
  }
  function secNo(id) {
    var ch = docChapters();
    for (var c = 0; c < ch.length; c++) { var it = ch[c].items || []; var i = it.indexOf(id); if (i >= 0) return ch[c].no + '-' + (i + 1); }
    return '';
  }
  var ROWF = {
    'edit.patrol': [{ k: 'text', l: '유해·위험 작업', t: 'area' }, { k: 'type', l: '사고·질병의 유형', list: null }],
    'edit.cases': [{ k: 'kind', l: '구분' }, { k: 'year', l: '연도', num: 1 }, { k: 'org', l: '기관명' }, { k: 'text', l: '사고내용', t: 'area' }, { k: 'note', l: '비고' }],
    'edit.msds': [{ k: 'name', l: '물질명' }, { k: 'cas', l: 'CAS No.' }, { k: 'use', l: '사용량(ℓ·㎏/일)' }, { k: 'store', l: '저장량(ℓ·㎏/일)' }, { k: 'purpose', l: '용도' }],
    'edit.infoTables.equipment': [{ k: 'name', l: '설비명' }, { k: 'qty', l: '수량' }],
    'edit.infoTables.chemicals': [{ k: 'name', l: '화학물질명' }, { k: 'amount', l: '취급량(일)' }, { k: 'time', l: '취급시간' }],
    'edit.processes': [{ k: 'name', l: '공정명' }, { k: 'desc', l: '공정설명', t: 'area' }, { k: 'equip', l: '설비', t: 'area' }, { k: 'material', l: '물질' }],
    'edit.interviews': [{ k: 'work', l: '대상공종' }, { k: 'opinion', l: '근로자 의견', t: 'area' }, { k: 'reply', l: '위험성평가 담당자 의견', t: 'area' }],
    'edit.budget': [{ k: 'item', l: '항목 (「-」로 시작하면 금액을 적는 줄, 아니면 제목줄)' }],
    'edit.dangerWork': [{ k: 'work', l: '작업내용' }, { k: 'place', l: '위치' }, { k: 'detail', l: '세부 공종 예시', t: 'area' }, { k: 'yes', l: '해당 여부', bool: 1 }],
    'edit.ppe.rows': [{ k: 'plan', l: '지급계획', t: 'area' }, { k: 'note', l: '비고' }],
    'edit.inspection': [{ k: 'proc', l: '공정' }, { k: 'risk', l: '위험요소', t: 'area' }, { k: 'check', l: '안전점검사항', t: 'area' }, { k: 'note', l: '비고' }],
    'edit.eduRecord': [{ k: 'kind', l: '구분' }, { k: 'target', l: '대상' }, { k: 'std', l: '기준' }, { k: 'done', l: '실시', pick: [['auto', '자동(질문 답)'], ['O', 'O'], ['X', 'X']] }, { k: 'note', l: '비고' }],
    'edit.emergencyFlow': [{ k: 'step', l: '단계' }, { k: 'text', l: '내용', t: 'area' }],
    'plan.approvals': [{ k: 'label', l: '칸 이름 (예: 검토자, 담당자)' }, { k: 'who', l: '칸 안의 글 (뒤에 「(인)」이 붙음. 「사업주」라고 적으면 대표자 이름도 들어감)' }],
    'plan.types.checks': [{ k: 'group', l: '구분 (위아래 같은 구분끼리 칸이 합쳐짐)' }, { k: 'text', l: '점검 항목', t: 'area' }, { k: 'note', l: '작은 글씨 설명 (예: * 관련 법)', t: 'area' }, { k: 'hi', l: '파란 굵은 글씨로 강조', bool: 1 }, { k: 'action', l: '안전조치 (미리 적어 둘 내용 · 보통 비워 둠)' }],
    'plan.types.steps': [{ k: 'work', l: '작업내용 (위아래 같은 작업끼리 칸이 합쳐짐)' }, { k: 'risk', l: '위험요인', t: 'area' }, { k: 'fix', l: '제거대책', t: 'area' }],
    'sedu.approvals': [{ k: 'label', l: '결재칸 이름 (예: 담당자, 관리감독자)' }],
    'sedu.kinds': [{ k: 'label', l: '교육구분 이름' }, { k: 'on', l: '■ 표시', bool: 1 }],
    'sedu.materials': [{ k: 'label', l: '교육자료 이름' }, { k: 'on', l: '■ 표시', bool: 1 }],
    'sedu.instructors': [{ k: 'name', l: '성명' }, { k: 'title', l: '직명' }, { k: 'place', l: '교육실시 장소' }]
  };
  var ROWT = {
    'edit.patrol': { text: '', type: '' }, 'edit.cases': { kind: '부상', year: '', org: '', text: '', note: '' },
    'edit.msds': { name: '', cas: '-', use: '', store: '', purpose: '' }, 'edit.infoTables.equipment': { name: '', qty: '1대' }, 'edit.infoTables.chemicals': { name: '', amount: '', time: '' },
    'edit.processes': { id: '', name: '', desc: '', equip: '', material: '-' },
    'edit.interviews': { work: '', opinion: '', reply: '', worker: 0 }, 'edit.budget': { item: '- ', amount: '' },
    'edit.dangerWork': { work: '', place: '', detail: '', yes: true }, 'edit.ppe.rows': { plan: '', note: '' },
    'edit.inspection': { proc: '', risk: '· ', check: '· ', note: '' }, 'edit.eduRecord': { kind: '', target: '근로자', std: '-', done: 'O', note: '' },
    'edit.emergencyFlow': { step: '', text: '▪ ' },
    'plan.approvals': { label: '담당자', who: '' },
    'plan.types.checks': { group: '작업 중 조치', text: '', note: '', hi: false, action: '' },
    'plan.types.steps': { work: '', risk: '', fix: '' },
    'sedu.approvals': { label: '관리감독자' }, 'sedu.kinds': { label: '', on: false }, 'sedu.materials': { label: '', on: false },
    'sedu.instructors': { name: '', title: '', place: '' },
    'sedu.blocks': { head: '[작업 이름 : 제설장비 대체운전원 {N}명] (00:00～00:00, 1시간)', items: ['그 밖에 안전·보건관리에 필요한 사항'] },
    'edit.resultTables.rows': { task: '', cls: '1. 기계설비적요인', situation: '', measure: '', cases: '', p: 1, s: 2, redNo: '', redText: '', after: '', plan: '', done: '', owner: '' }
  };
  function norm(path) { return path.replace(/\.\d+\./g, '.'); }   // edit.resultTables.0.rows → edit.resultTables.rows
  function fieldFor(p, f, it) {
    if (f.bool) {
      var on = !!it[f.k];
      return '<div class="field"><span class="lab">' + f.l + '</span><div class="chips"><button class="chip' + (on ? ' on' : '') + '" data-act="setv" data-path="' + p + '" data-json="true">√ 해당</button><button class="chip' + (!on ? ' on' : '') + '" data-act="setv" data-path="' + p + '" data-json="false">해당 없음</button></div></div>';
    }
    if (f.pick) return '<div class="field"><span class="lab">' + f.l + '</span><div class="chips">' + f.pick.map(function (o) { return '<button class="chip' + (String(it[f.k]) === o[0] ? ' on' : '') + '" data-act="setv" data-path="' + p + '" data-val="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
    if (f.k === 'type' && p.indexOf('edit.patrol') === 0) return field(f.l, p, { chips: KRAS_TYPES, hint: '아래에서 고르거나 직접 적으세요' });
    return field(f.l, p, { type: f.t === 'area' ? 'area' : f.num ? 'num' : 'text', rows: 3 });
  }

  /* --- 수정 창 등록부: 화면을 그릴 때마다 새로 만듦 --- */
  var EDREG = {}, memoKey = null, memoSnap = null;
  function reg(key, label, render, del) { EDREG[key] = { label: label, render: render, del: del }; return key; }
  function edAttr(key) { return ' class="ed" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정"'; }
  function cell(tag, key, label, html, extra, renderFn, del) {
    reg(key, label, renderFn, del);
    return '<' + tag + edAttr(key) + (extra || '') + '>' + html + '</' + tag + '>';
  }
  function fld(key, label, path, o) { return cell('td', key, label, nl(getP(cur, path)) || '<span class="ph">(비어 있음)</span>', o && o.attrs, function () { return field(label, path, { type: (o && o.type) || 'area', rows: 5 }); }); }
  function rowReg(listPath, i, label) {
    var key = listPath + '.' + i;
    return reg(key, label + ' ' + (i + 1), function () {
      var it = getP(cur, listPath)[i] || {};
      if (/^edit\.resultTables\.\d+\.rows$/.test(listPath)) return resultRowFields(listPath, i);
      return (ROWF[norm(listPath)] || []).map(function (f) { return fieldFor(key + '.' + f.k, f, it); }).join('');
    }, canDel(listPath) ? function () { return delRow(listPath, i, true); } : null);
  }
  function lineReg(listPath, i, label) {
    var key = listPath + '.' + i;
    return reg(key, label + ' ' + (i + 1), function () { return field(label, key, { type: 'area', rows: 3 }); }, canDel(listPath) ? function () { return delRow(listPath, i, true); } : null);
  }
  /* 마지막 1줄은 지우지 못함 (보고서에 빈 표가 나오지 않게) */
  function canDel(listPath) { return (getP(cur, listPath) || []).length > 1; }
  function rowX(listPath, i) { return canDel(listPath) ? '<button type="button" class="row-x" data-act="rowDel" data-path="' + listPath + '" data-i="' + i + '" title="이 줄 지우기" aria-label="이 줄 지우기">✕</button>' : ''; }
  /* 줄 지우기. asked=true면 이미 물어봤음 */
  function delRow(listPath, i, asked) {
    var arr = getP(cur, listPath);
    if (!arr || arr.length <= 1) return false;
    if (listPath === 'edit.processes') {
      var id = arr[i].id, n = 0;
      Object.keys(TBL).forEach(function (k) { (cur.edit[TBL[k].path] || []).forEach(function (t) { if (t.proc === id) n++; }); });
      if (!confirm('「' + (arr[i].name || '공정 ' + (i + 1)) + '」 공정을 지울까요?' + (n ? '\n이 공정으로 만든 표 ' + n + '개(위험정보·유해위험요인 분류·결과서)도 함께 지워집니다.' : ''))) return false;
      arr.splice(i, 1);
      Object.keys(TBL).forEach(function (k) {
        var list = cur.edit[TBL[k].path] || [], left = list.filter(function (t) { return t.proc !== id; });
        if (left.length) cur.edit[TBL[k].path] = left;   // 표가 하나도 안 남으면 지우지 않고 남은 공정으로 옮김
      });
      T.upgradeEdit(cur.edit);
      return true;
    }
    if (!asked && !confirm('이 줄을 지울까요?')) return false;
    arr.splice(i, 1);
    return true;
  }
  /* 공정마다 하나씩 있는 표 (2-2, 2-6, 2-7) */
  var TBL = {
    info: { path: 'infoTables', name: '안전·보건상 위험정보', tmpl: function () { return { proc: '', equipment: [{ name: '', qty: '' }], chemicals: [{ name: '-', amount: '-', time: '-' }], heavy: { unit: '', lift: false, push: false, pull: false, none: true }, envMeasure: 'none' }; } },
    hazard: { path: 'hazardTables', name: '유해위험요인 분류', tmpl: function () { return { proc: '', sub: '', checks: [], equip: '-', material: '-' }; } },
    result: { path: 'resultTables', name: '위험성평가 결과서', tmpl: function () { return { proc: '', sub: '', rows: [clone(ROWT['edit.resultTables.rows'])] }; } }
  };
  function procName(id) { var ps = cur.edit.processes || []; for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i].name; return ps[0] ? ps[0].name : ''; }
  function tblBar(kind, t) {
    var n = (cur.edit[TBL[kind].path] || []).length;
    return '<div class="tbl-bar"><span>' + esc(TBL[kind].name) + ' <b>' + (t + 1) + '</b> · ' + esc(procName(cur.edit[TBL[kind].path][t].proc) || '공정 미선택') + '</span>' +
      (n > 1 ? '<button type="button" class="tbl-x" data-act="tblDel" data-kind="' + kind + '" data-t="' + t + '" title="이 표 지우기" aria-label="이 표 지우기">✕</button>' : '') + '</div>';
  }
  function procCell(kind, t, attrs) {
    var p = 'edit.' + TBL[kind].path + '.' + t + '.proc', it = cur.edit[TBL[kind].path][t];
    return cell('td', kind + '.' + t + '.proc', '공정 고르기', nl(procName(it.proc)) || '<span class="ph">(공정 고르기)</span>', attrs, function () {
      return fieldFor(p, { k: 'proc', l: '이 표의 공정 (2-1 사업장 개요에 적은 공정 중에서)', pick: (cur.edit.processes || []).map(function (x, i) { return [x.id, (i + 1) + '. ' + (x.name || '(이름 없음)')]; }) }, cur.edit[TBL[kind].path][t]);
    });
  }
  function tblAddBtn(kind) { return '<button class="btn btn-ghost rp-addtbl" data-act="tblAdd" data-kind="' + kind + '">＋ 표 추가</button>'; }
  function addBtn(listPath, noun) { return '<button class="btn btn-sm btn-ghost rp-add" data-act="edAdd" data-path="' + listPath + '">＋ ' + noun + ' 추가</button>'; }
  function ph(t) { return '<span class="ph">' + esc(t || '업체 입력') + '</span>'; }
  function au(t) { return '<span class="au">' + esc(t) + '</span>'; }
  function resultRowFields(listPath, i) {
    var r = getP(cur, listPath)[i] || {}, p = listPath + '.' + i, rv = (+r.p || 0) * (+r.s || 0), lv = rv >= 6 ? '높음' : rv === 4 ? '보통' : rv ? '낮음' : '';
    return field('세부작업', p + '.task') + field('위험분류', p + '.cls', { chips: CLS_TYPES }) +
      field('유해·위험 상황 및 결과', p + '.situation', { type: 'area' }) + field('현재 안전보건조치', p + '.measure', { type: 'area', rows: 4 }) +
      field('재해사례', p + '.cases') +
      pick123('가능성(빈도)', p + '.p', r.p, ['하', '중', '상']) + pick123('중대성(강도)', p + '.s', r.s, ['소', '중', '대']) +
      '<div class="risk r' + (rv >= 6 ? 'h' : rv === 4 ? 'm' : 'l') + '">위험성 = ' + (rv || '-') + (lv ? ' (' + lv + ')' : '') + '</div>' +
      (rv >= 4 ? '<div class="warn">위험성이 ' + lv + '입니다. 감소대책을 적어 주세요.</div>' : '') +
      '<details class="sub"' + (rv >= 4 || r.redText ? ' open' : '') + '><summary>감소대책 · 개선 (선택)</summary>' +
      field('NO', p + '.redNo') + field('감소대책 세부내용', p + '.redText', { type: 'area' }) + field('개선후 위험성', p + '.after') +
      field('개선 예정일', p + '.plan') + field('완료일', p + '.done') + '</details>';
  }
  function rows(listPath, label, cellsFn) {
    return (getP(cur, listPath) || []).map(function (it, i) {
      var key = rowReg(listPath, i, label);
      var cells = cellsFn(it, i), at = cells.lastIndexOf('</td>');
      if (at >= 0) cells = cells.slice(0, at) + rowX(listPath, i) + cells.slice(at);
      return '<tr class="ed-row" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + cells + '</tr>';
    }).join('');
  }
  function lines(listPath, label, prefix) {
    return (getP(cur, listPath) || []).map(function (t, i) {
      var key = lineReg(listPath, i, label);
      return '<div' + edAttr(key) + '>' + (prefix || '') + nl(String(t).replace(/\{Y\}/g, String(new Date().getFullYear()))) + rowX(listPath, i) + '</div>';
    }).join('');
  }
  function orgHtml() {
    return '<div class="rp-org"><div class="rp-ob"><div class="h1">사 장</div><div class="r"><span>대표</span>' + ph('대표자 이름') + '</div></div><i></i><div class="rp-ob"><div class="h2">참여근로자</div><div class="r1">' + ph('근로자 이름') + '</div></div></div>';
  }

  /* --- 항목별 보고서 모양 --- */
  var PAGES = {
    process: function () {
      return '<h3 class="rp-h">1. 사업장 개요</h3><div class="rp-wrap"><table class="rt">' +
        '<colgroup><col style="width:9%"><col style="width:14%"><col style="width:13%"><col style="width:10%"><col style="width:14%"><col style="width:13%"><col style="width:9%"><col style="width:9%"><col style="width:9%"></colgroup>' +
        '<tr><th colspan="2">사업장명</th><td colspan="3">' + ph() + '</td><th colspan="2">사업주명</th><td colspan="2">' + ph() + '</td></tr>' +
        '<tr><th colspan="2">업종</th><td colspan="3">' + ph() + '</td><th colspan="2">근로자수</th><td colspan="2">' + au('근로자 명단 수') + '</td></tr>' +
        '<tr><th colspan="2">주소</th><td colspan="7">' + ph() + '</td></tr>' +
        '<tr><th colspan="2" class="top">조직도</th><td colspan="7">' + orgHtml() + '</td></tr>' +
        '<tr><th colspan="9">공정분석</th></tr>' +
        '<tr><th>No.</th><th colspan="2">공정명</th><th>대상</th><th colspan="2">공정설명</th><th colspan="2">설비</th><th>물질</th></tr>' +
        rows('edit.processes', '공정', function (P, i) {
          return '<td>' + (i + 1) + '</td><td colspan="2">' + nl(P.name) + '</td><td>' + au('근로자 이름') + '</td><td colspan="2">' + nl(P.desc) + '</td><td colspan="2">' + nl(P.equip) + '</td><td>' + nl(P.material) + '</td>';
        }) + '</table></div>' + addBtn('edit.processes', '공정');
    },
    equip: function () {
      return (cur.edit.infoTables || []).map(function (IT, t) {
        var base = 'edit.infoTables.' + t, ck = function (b) { return b ? '■' : '□'; }, hv = IT.heavy || {}, env = IT.envMeasure || 'none';
        var eqKey = reg('info.' + t + '.eq', '기계·기구 및 설비 목록', function () { return listEditor(base + '.equipment', ROWF['edit.infoTables.equipment'], ROWT['edit.infoTables.equipment'], '설비'); });
        var chKey = reg('info.' + t + '.ch', '유해화학물질 목록', function () { return listEditor(base + '.chemicals', ROWF['edit.infoTables.chemicals'], ROWT['edit.infoTables.chemicals'], '화학물질'); });
        var hvKey = reg('info.' + t + '.heavy', '중량물 인력 취급', function () {
          var h2 = cur.edit.infoTables[t].heavy || (cur.edit.infoTables[t].heavy = {});
          return field('단위 중량', base + '.heavy.unit', { type: 'text' }) + '<div class="field"><span class="lab">취급형태</span><div class="chips">' +
            [['lift', '들기'], ['push', '밀기'], ['pull', '끌기'], ['none', '해당무']].map(function (o) { return '<button class="chip' + (h2[o[0]] ? ' on' : '') + '" data-act="toggle" data-path="' + base + '.heavy.' + o[0] + '">' + (h2[o[0]] ? '■ ' : '□ ') + o[1] + '</button>'; }).join('') + '</div></div>';
        });
        var envKey = reg('info.' + t + '.env', '작업환경측정', function () { return field('작업환경측정', base + '.envMeasure', { chips: [['yes', '측정'], ['no', '미측정'], ['none', '해당무']], noInput: 1 }); });
        var eq = IT.equipment || [], ch = IT.chemicals || [];
        var other = [
          '○ 작업표준, 작업절차에 관한 정보', '- 안전보건경영시스템(KOSHA-MS) 메뉴얼', '○ 기계·기구 및 설비의 사양서, 물질안전보건자료 등의 유해·위험요인에 관한 정보', '- MSDS자료 참조[별도첨부]',
          '○ 기계·기구 및 설비의 공정흐름과 작업주변의 환경에 관한 정보', '- 안전보건경영시스템(KOSHA-MS) 메뉴얼'
        ].map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('') +
          '<div>○ 도급(일부, 전부 또는 혼재작업) ' + au('질문 답') + '</div><div>○ 재해사례, 재해통계 등에 관한 정보</div><div>- 재해사례 및 재해통계 정보조사 참조</div>' +
          '<div>○ 안전작업허가증 필요작업 ' + au('질문 답') + '</div>' +
          '<div' + edAttr(hvKey) + '>○ 중량물 인력 취급 시 단위 중량(' + esc(hv.unit || '') + ') 및 취급형태<br>(들기' + ck(hv.lift) + ', 밀기' + ck(hv.push) + ', 끌기' + ck(hv.pull) + ', 해당무' + ck(hv.none) + ')</div>' +
          '<div' + edAttr(envKey) + '>○ 작업환경측정 유무(측정' + ck(env === 'yes') + ', 미측정' + ck(env === 'no') + ', 해당무' + ck(env === 'none') + ')</div>' +
          '<div>○ 근로자 건강진단 유무 ' + au('질문 답') + '</div><div>○ 근로자 구성 및 경력특성 ' + au('근로자 화면에서 선택') + '</div><div>○ 그 밖에 위험성평가에 참고가 되는 자료 등</div>';
        var list = function (key, arr, k) { return '<td' + edAttr(key) + '>' + arr.map(function (e) { return esc(e[k]); }).join('<br>') + '</td>'; };
        return '<div class="tbl">' + tblBar('info', t) + '<div class="rp-wrap"><table class="rt wide">' +
          '<tr><th>작업</th>' + procCell('info', t) + '<td colspan="5" rowspan="2" class="ttl">안전ㆍ보건상 위험정보</td><th>근로자수</th><td>' + au('자동') + '</td></tr>' +
          '<tr><th>평가일시</th><td>' + au('작성일') + '</td><th>평가자</th><td>' + au('대표자') + '</td></tr>' +
          '<tr><th rowspan="2">공정</th><th colspan="2">기계 ･ 기구 및 설비</th><th colspan="3">유 해 화 학 물 질</th><th colspan="3" rowspan="2">기타 안전ㆍ보건상 정보</th></tr>' +
          '<tr><th>설 비 명</th><th>수량</th><th>화학물질명</th><th>취급량(일)</th><th>취급시간</th></tr>' +
          '<tr class="c">' + procCell('info', t) + list(eqKey, eq, 'name') + list(eqKey, eq, 'qty') + list(chKey, ch, 'name') + list(chKey, ch, 'amount') + list(chKey, ch, 'time') +
          '<td colspan="3" class="l sm">' + other + '</td></tr></table></div></div>';
      }).join('') + tblAddBtn('info');
    },
    patrol: function () {
      return '<div class="rp-wrap"><table class="rt">' +
        '<colgroup><col style="width:72%"><col style="width:28%"></colgroup>' +
        '<tr><th colspan="2" class="ttl2">사업장 순회점검에 의한 유해·위험요인 조사표</th></tr>' +
        '<tr><td colspan="2" class="l">실시방법: 위험성평가 수행자가 정기적으로 사업장을 순회점검하고 이 조사표를 사용하여 유해·위험요인을 찾음</td></tr>' +
        '<tr><td colspan="2" class="l">수행자 성명 : ' + au('대표자') + ' (사장)<br>수 행 일 시 : ' + au('점검 날짜') + '</td></tr>' +
        '<tr><th>유해·위험 작업<br><small>※ 발견한 작업의 내용, 장소 및 유해위험 정도를 표시함</small></th><th>사고·질병의 유형</th></tr>' +
        rows('edit.patrol', '조사 항목', function (r) { return '<td class="l">' + nl(r.text) + '</td><td class="l">' + nl(r.type) + '</td>'; }) +
        '<tr><th colspan="2">사고·질병의 유형 -위험성 평가 지원시스템 (KRAS) 분류-</th></tr>' +
        T.FIXED.kras.map(function (k) { return '<tr><td class="l">' + esc(k[0]) + '</td><td class="l sm">' + esc(k[1]) + '</td></tr>'; }).join('') +
        '</table></div>' + addBtn('edit.patrol', '조사 항목');
    },
    cases: function () {
      return '<div class="rp-title orange">재해사례, 재해통계<br>정보 조사</div>' +
        '<p class="rp-p">□ 공종명 : ' + esc((cur.edit.processes || []).map(function (x) { return x.name; }).filter(Boolean).join(', ')) + '</p><p class="rp-p">□ 재해통계 ' + au('질문 답으로 자동') + '</p>' +
        '<div class="rp-wrap"><table class="rt"><tr><th>사 고</th><th>사망(명)</th><th>부상(명)</th><th>비고</th></tr><tr class="c"><td>' + au('자동') + '</td><td>' + au('자동') + '</td><td>' + au('자동') + '</td><td></td></tr></table></div>' +
        '<p class="rp-p">□ 유사사례</p><div class="rp-wrap"><table class="rt"><colgroup><col style="width:10%"><col style="width:9%"><col style="width:22%"><col><col style="width:10%"></colgroup>' +
        '<tr><th>구분</th><th>연도</th><th>기관명</th><th>사고내용</th><th>비고</th></tr>' +
        rows('edit.cases', '유사사례', function (r) { return '<td>' + nl(r.kind) + '</td><td>' + nl(r.year) + '</td><td>' + nl(r.org) + '</td><td class="l">' + nl(r.text) + '</td><td>' + nl(r.note) + '</td>'; }) +
        '</table></div>' + addBtn('edit.cases', '유사사례');
    },
    msds: function () {
      return '<div class="rp-title">물질안전보건자료</div><div class="rp-wrap"><table class="rt">' +
        '<tr><th colspan="6" class="ttl2">MSDS 목록</th></tr><tr><th>연번</th><th>물질명</th><th>CAS No.</th><th>사용량<br>(ℓ·㎏/일)</th><th>저장량<br>(ℓ·㎏/일)</th><th>용도</th></tr>' +
        rows('edit.msds', '물질', function (m, i) { return '<td>' + (i + 1) + '</td><td>' + nl(m.name) + '</td><td>' + nl(m.cas) + '</td><td>' + nl(m.use) + '</td><td>' + nl(m.store) + '</td><td>' + nl(m.purpose) + '</td>'; }) +
        '<tr><td colspan="6" class="note-row">…빈 줄은 보고서에서 22번까지 자동으로 채워집니다</td></tr></table></div>' + addBtn('edit.msds', '물질');
    },
    hazard: function () {
      return (cur.edit.hazardTables || []).map(function (HT, t) {
        var base = 'edit.hazardTables.' + t, set = {}; (HT.checks || []).forEach(function (k) { set[k] = 1; });
        var h = '<div class="tbl">' + tblBar('hazard', t) + '<div class="rp-wrap"><table class="rt hz"><tr><th colspan="11" class="ttl2">유해위험요인 분류</th></tr>' +
          '<tr><th>공 정</th>' + procCell('hazard', t) + '<th colspan="2">세부 분류</th>' + fld('hazard.' + t + '.sub', '세부 분류', base + '.sub', { type: 'text' }) +
          '<th colspan="2">설비</th>' + fld('hazard.' + t + '.equip', '설비', base + '.equip', { type: 'text' }) + '<th colspan="2">물질</th>' + fld('hazard.' + t + '.mat', '물질', base + '.material', { type: 'text' }) + '</tr>';
        T.FIXED.hazardGroups.forEach(function (g) {
          var n = Math.ceil(g.items.length / 3);
          for (var r = 0; r < n; r++) {
            h += '<tr>' + (r === 0 ? '<td rowspan="' + n + '">' + g.no + '</td><td rowspan="' + n + '">' + esc(g.name) + '</td>' : '');
            for (var k = 0; k < 3; k++) {
              var it = g.items[r * 3 + k];
              if (it) h += '<td class="ed ck" data-act="hz" data-t="' + t + '" data-k="' + it[0] + '" title="눌러서 해당/해당 없음 바꾸기">' + (set[it[0]] ? '▣' : '□') + '</td><td>' + it[0] + '</td><td class="l">' + esc(it[1]) + '</td>';
              else h += '<td></td><td></td><td></td>';
            }
            h += '</tr>';
          }
        });
        return h + '</table></div></div>';
      }).join('') + tblAddBtn('hazard');
    },
    results: function () {
      return (cur.edit.resultTables || []).map(function (RT, t) {
        var base = 'edit.resultTables.' + t;
        return '<div class="tbl">' + tblBar('result', t) + '<div class="rp-wrap"><table class="rt wide res">' +
          '<tr><th colspan="2" class="g">공정명</th>' + procCell('result', t, ' colspan="2"') + '<td colspan="6" rowspan="2" class="ttl green">위험성평가 결과서</td><th colspan="2" class="g">평가일자</th><td colspan="2">' + au('작성일') + '</td></tr>' +
          '<tr><th colspan="2" class="g">세부공정명</th>' + fld('result.' + t + '.sub', '세부공정명', base + '.sub', { attrs: ' colspan="2"', type: 'text' }) + '<th colspan="2" class="g">평 가 자</th><td colspan="2">' + au('대표자') + '</td></tr>' +
          '<tr><th rowspan="2" class="g">세부작업</th><th colspan="2" class="g">유해위험요인 파악</th><th rowspan="2" class="g">현재 안전보건조치</th><th rowspan="2" class="g">재해사례</th><th colspan="3" class="g">현재 위험성</th><th colspan="2" class="g">감소대책</th><th rowspan="2" class="g">개선후<br>위험성</th><th rowspan="2" class="g">개선<br>예정일</th><th rowspan="2" class="g">완료일</th><th rowspan="2" class="g">사 장</th></tr>' +
          '<tr><th class="g">위험분류</th><th class="g">유해・위험 상황 및 결과</th><th class="g">가능성</th><th class="g">중대성</th><th class="g">위험성</th><th class="g">NO</th><th class="g">세부내용</th></tr>' +
          rows(base + '.rows', '위험요인', function (r) {
            var v = (+r.p || 0) * (+r.s || 0);
            return '<td>' + nl(r.task) + '</td><td>' + nl(r.cls) + '</td><td class="l">' + nl(r.situation) + '</td><td class="l">' + nl(r.measure) + '</td><td>' + nl(r.cases) + '</td><td>' + (r.p || '') + '</td><td>' + (r.s || '') + '</td><td>' + (v ? v + '<br>(' + (v >= 6 ? '높음' : v === 4 ? '보통' : '낮음') + ')' : '') + '</td><td>' + nl(r.redNo) + '</td><td class="l">' + nl(r.redText) + '</td><td>' + nl(r.after) + '</td><td>' + nl(r.plan) + '</td><td>' + nl(r.done) + '</td><td>' + ph('사장 서명') + '</td>';
          }) + '</table></div>' + addBtn(base + '.rows', '위험요인') + '</div>';
      }).join('') + tblAddBtn('result');
    },
    edu: function () {
      function block(title, path) {
        return '<div class="rp-paper"><div class="rp-lt">' + esc(title.replace('{Y}', String(new Date().getFullYear()))) + '</div>' +
          '<p>□ 교육결과</p><p>o <b>(일 시)</b> ' + au('날짜 질문') + '</p><p>o <b>(장 소)</b> ' + au('지사·업체 이름으로 자동') + '</p><p>o <b>(교 육 자)</b> 사장 ' + au('대표자') + '</p><p>o <b>(참 석 자)</b> ' + au('근로자 명단') + '</p>' +
          '<p><b>o (교육내용)</b></p>' + lines(path, path.indexOf('pre') >= 0 ? '사전 교육 내용' : '결과 교육 내용', 'o ') + addBtn(path, '교육 내용') +
          '<p>□ 사진대지</p><div class="rp-photos"><div>' + ph('사진 (업체가 넣음)') + '</div><div>' + ph('사진 (업체가 넣음)') + '</div></div></div>';
      }
      return block('{Y}년 위험성평가 사전 교육 결과', 'edit.preEdu.topics') + block('{Y}년 위험성평가 결과 교육 실시', 'edit.postEdu.topics');
    },
    interviews: function () {
      var h = '<div class="rp-wrap"><table class="rt"><colgroup><col style="width:28%"><col></colgroup>' +
        '<tr><th colspan="2" class="ttl2">근로자 청취조사에 의한 유해·위험요인 조사표</th></tr>' +
        '<tr><th>실시대상</th><td>' + au('계약명') + '</td></tr><tr><th>수행자(소속/성명)</th><td>사장 ' + au('대표자') + '</td></tr>' +
        '<tr><th>근로자(소속/성명)</th><td>' + au('근로자 명단') + '</td></tr><tr><th>수행일시</th><td>' + au('날짜 질문') + '</td></tr>';
      (cur.edit.interviews || []).forEach(function (iv, i) {
        var key = rowReg('edit.interviews', i, '경험담');
        h += '<tr><th colspan="2" class="l">경험담 ' + (i + 1) + '　성 명 : ' + au('근로자 이름 자동') + ' (인)</th></tr>' +
          '<tr class="ed-row" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정"><td colspan="2" class="l">【대상공종】' + nl(iv.work) + '<br>【근로자 의견】' + nl(iv.opinion) + '<br>【위험성평가 담당자 의견】' + nl(iv.reply) + rowX('edit.interviews', i) + '</td></tr>';
      });
      return h + '</table></div>' + addBtn('edit.interviews', '경험담');
    },
    '@eval': function () { return ''; },
    budget: function () {
      return '<h3 class="rp-h">안전 예산 현황</h3><p class="rp-p">ㅇ 안전예산 편성 현황 (단위 : 천원)</p><div class="rp-wrap"><table class="rt"><colgroup><col><col style="width:30%"></colgroup>' +
        '<tr><th rowspan="2">구 분</th><th>' + au('작성연도') + '</th></tr><tr><th>예산</th></tr><tr class="c"><td>계</td><td>' + au('자동 합계') + '</td></tr>' +
        rows('edit.budget', '예산 항목', function (b) { return '<td class="l">' + nl(b.item) + '</td><td>' + (/^\s*-/.test(b.item) ? ph('업체가 질문에서 입력') : '') + '</td>'; }) +
        '</table></div>' + addBtn('edit.budget', '예산 항목');
    },
    danger: function () {
      return '<h3 class="rp-h">위험작업 관리계획</h3><p class="rp-p">ㅇ 위험작업 검토</p><div class="rp-wrap"><table class="rt"><colgroup><col style="width:30%"><col style="width:13%"><col><col style="width:11%"></colgroup>' +
        '<tr><th>작업내용</th><th>위 치</th><th>세부 공종 예시</th><th>해당<br>여부</th></tr>' +
        rows('edit.dangerWork', '위험작업', function (d) { return '<td class="l">' + nl(d.work) + '</td><td>' + nl(d.place) + '</td><td class="l">' + nl(d.detail) + '</td><td>' + (d.yes ? '√' : '') + '</td>'; }) +
        '</table></div>' + addBtn('edit.dangerWork', '위험작업') +
        '<div class="rp-fixed">' + (cur.edit.dangerPlan || []).map(function (d) { return '<p><b>' + esc(d.b) + '</b>' + esc(d.t) + '</p>'; }).join('') + '</div>';
    },
    ppe: function () {
      var p = cur.edit.ppe || {}, rs = p.rows || [];
      var body = rs.map(function (r, i) {
        var key = rowReg('edit.ppe.rows', i, '지급계획');
        return '<tr>' + (i === 0 ? '<td rowspan="' + rs.length + '">' + au('근로자 명단') + '<br><br>' + au('업체명') + '</td>' : '') +
          '<td class="l ed-c" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + nl(r.plan) + '</td><td class="ed-c" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + nl(r.note) + rowX('edit.ppe.rows', i) + '</td></tr>';
      }).join('');
      return '<h3 class="rp-h">개인보호구</h3><p class="rp-p">□ 개인보호구 지급계획서</p><div class="rp-wrap"><table class="rt"><colgroup><col style="width:28%"><col><col style="width:24%"></colgroup>' +
        '<tr><th>대상자</th><th>지급계획</th><th>비고</th></tr>' + body + '</table></div>' + addBtn('edit.ppe.rows', '지급계획') +
        '<p class="rp-p">□ 개인보호구 관리·운영방안</p>' + lines('edit.ppe.mgmt', '관리·운영방안', 'ㅇ ') + addBtn('edit.ppe.mgmt', '관리·운영방안');
    },
    insp: function () {
      return '<h3 class="rp-h">안전점검 계획</h3><p class="rp-p">□ 작업전 안전점검 항목 및 계획</p><div class="rp-wrap"><table class="rt"><colgroup><col style="width:18%"><col><col><col style="width:10%"></colgroup>' +
        '<tr><th>공정</th><th>위험요소</th><th>안전점검사항</th><th>비고</th></tr>' +
        rows('edit.inspection', '점검 공정', function (r) { return '<td>' + nl(r.proc) + '</td><td class="l">' + nl(r.risk) + '</td><td class="l">' + nl(r.check) + '</td><td>' + nl(r.note) + '</td>'; }) +
        '</table></div>' + addBtn('edit.inspection', '점검 공정') + '<p class="rp-p">ㅇ 점검계획</p>' + lines('edit.inspectionPlan', '점검계획') + addBtn('edit.inspectionPlan', '점검계획');
    },
    eduRec: function () {
      return '<h3 class="rp-h">교육실적</h3><p class="rp-p">□ 산업재해 예방 교육 실적(제설작업 관련)</p><div class="rp-wrap"><table class="rt"><tr><th>구분</th><th>대상</th><th>기준</th><th>실시</th><th>대상자</th><th>비고</th></tr>' +
        rows('edit.eduRecord', '교육', function (r) { return '<td>' + nl(r.kind) + '</td><td>' + nl(r.target) + '</td><td>' + nl(r.std) + '</td><td>' + (r.done === 'auto' ? au('질문 답') : nl(r.done)) + '</td><td>' + au('근로자 이름') + '</td><td>' + nl(r.note) + '</td>'; }) +
        '</table></div>' + addBtn('edit.eduRecord', '교육') +
        '<p class="rp-p">ㅇ 사진대지</p><div class="rp-wrap"><table class="rt"><tr><td colspan="2" class="photo">' + ph('사진 (업체가 넣음)') + '</td></tr><tr><th>내 용</th>' + fld('eduLabel', '사진대지 › 내용', 'edit.eduPhotoLabel', { type: 'text' }) + '</tr></table></div>';
    },
    emer: function () {
      return '<h3 class="rp-h">비 상 대 책</h3><p class="rp-p">□ 재해발생 시 행동매뉴얼 — (예시 1) 재해발생시 흐름도</p><div class="rp-wrap"><table class="rt flow"><colgroup><col style="width:26%"><col></colgroup>' +
        rows('edit.emergencyFlow', '흐름도 단계', function (f) { return '<td class="stepbox">' + nl(f.step) + '</td><td class="l">' + nl(f.text) + '</td>'; }) +
        '</table></div>' + addBtn('edit.emergencyFlow', '단계') + '<p class="rp-p">□ 재해발생 시 유관기관 연락망 ' + au('업체가 비상연락처 화면에서 입력') + '</p>';
    }
  };
  /* --- 작업계획서 · 특별교육 기본 내용 (도로공사가 고침) --- */
  function pageFor(id) {
    if (PAGES[id]) return PAGES[id]();
    if (id === 'p_common') return planCommonPage();
    if (/^pt_/.test(id)) return planTypePage(id.slice(3));
    if (id === 'e_log') return eduLogPage();
    return '';
  }
  function canReset(id) {
    if (/^pt_/.test(id)) return DOCTPL.PLAN.types.some(function (t) { return 'pt_' + t.id === id; });
    return !!(SEC_PATHS[id] || id === 'p_common' || id === 'e_log');
  }
  function resetSection(id) {
    if (SEC_PATHS[id]) { SEC_PATHS[id].forEach(function (p) { cur.edit[p] = clone(T.DEFAULT_EDIT[p]); }); T.upgradeEdit(cur.edit); return; }
    if (id === 'p_common') { ['approvals', 'guide', 'surveyNote', 'driverNote'].forEach(function (k) { cur.plan[k] = clone(DOCTPL.PLAN[k]); }); return; }
    if (id === 'e_log') { cur.sedu = DOCTPL.fillSedu(null); return; }
    if (/^pt_/.test(id)) {
      var def = DOCTPL.PLAN.types.filter(function (t) { return 'pt_' + t.id === id; })[0], ti = typeIdx(id.slice(3));
      if (def && ti >= 0) cur.plan.types[ti] = clone(def);
    }
  }
  function cellTd(key, label, html, attrs, renderFn, del) { reg(key, label, renderFn, del); return '<td' + (attrs || '') + edAttr(key) + '>' + html + '</td>'; }
  function planCommonPage() {
    var P = cur.plan, apv = P.approvals;
    var h = '<h3 class="rp-h">작업계획서 머리 표 <small>(모든 장비에 똑같이 들어감)</small></h3><div class="rp-wrap"><table class="rt">' +
      '<colgroup><col style="width:17%"><col style="width:10%"><col><col style="width:12%"><col style="width:27%"></colgroup>';
    apv.forEach(function (a, i) {
      var key = rowReg('plan.approvals', i, '결재칸');
      h += '<tr>' + (i === 0 ? '<td colspan="3" rowspan="' + apv.length + '" class="ttl2">' + ph('○○ 작업계획서') + '<br><small>(장비마다 바뀜)</small></td>' : '') +
        '<th class="ed-c" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + nl(a.label) + '</th>' +
        '<td class="ed-c" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + nl(a.who) + (/사\s*업\s*주/.test(a.who || '') ? ' ' + au('대표자 이름') : '') + ' (인)' + rowX('plan.approvals', i) + '</td></tr>';
    });
    h += '<tr><th>작업명(장소)</th><td colspan="2">' + ph() + '</td><th>작업기간</th><td>' + ph() + '</td></tr>' +
      '<tr><th>작업업체/작업자</th><th>업체명</th><td>' + au('업체명') + '</td><th>작업자</th><td>' + au('근로자 이름') + '</td></tr>' +
      '<tr><th>운전원</th><th>성명</th>' + cellTd('plan.driverNote', '운전원 이름 뒤에 붙는 말', ph('업체가 고름') + ' ' + nl(P.driverNote), '', function () { return field('운전원 이름 뒤에 붙는 말', 'plan.driverNote', {}); }) + '<th>연락처</th><td>' + au('자동') + '</td></tr>' +
      '<tr><th>유도자</th><th>성명</th>' + fld('plan.guide.name', '유도자 성명', 'plan.guide.name', { type: 'text' }) + '<th>연락처</th>' + fld('plan.guide.phone', '유도자 연락처', 'plan.guide.phone', { type: 'text' }) + '</tr>' +
      '<tr><th>사전조사 내용</th>' + cellTd('plan.surveyNote', '사전조사 내용 문구', nl(P.surveyNote) + ' ' + au('업체가 붙였을 때만 「(첨부 n)」 표시'), ' colspan="4" style="text-align:left"', function () { return field('사전조사 내용 문구', 'plan.surveyNote', { type: 'area', rows: 3 }); }) + '</tr>' +
      '<tr><th>기계·장비 제원</th><td colspan="4" style="text-align:left">' + au('장비마다 따로 (2장에서 고침)') + '</td></tr></table></div>' + addBtn('plan.approvals', '결재칸');
    return h;
  }
  function planTypePage(tid) {
    var P = cur.plan, ti = typeIdx(tid), Ty = P.types[ti];
    if (!Ty) return '<p class="note">지운 장비입니다.</p>';
    var base = 'plan.types.' + ti;
    var tKey = reg(base + '.title', '장비 이름 · 부제목', function () { return field('장비 이름', base + '.name', {}) + field('부제목 (「-」와 「-」 사이)', base + '.sub', {}); });
    var h = '<div class="tbl-bar"><span><b>' + esc(Ty.name) + '</b> 작업계획서</span>' + (P.types.length > 1 ? '<button type="button" class="tbl-x" data-act="typeDel" data-t="' + ti + '" title="이 장비 종류 지우기" aria-label="이 장비 종류 지우기">✕</button>' : '') + '</div>';
    h += '<div class="rp-wrap"><table class="rt"><colgroup><col style="width:17%"><col style="width:10%"><col><col style="width:12%"><col style="width:27%"></colgroup>' +
      '<tr><td colspan="3"' + edAttr(tKey) + '><b class="pt-t">' + esc(Ty.name) + ' 작업계획서</b><br><small>- ' + esc(Ty.sub) + ' -</small></td><th>' + esc((P.approvals[0] || {}).label || '') + '</th><td>' + au('결재칸은 1장 공통') + '</td></tr>' +
      '<tr><th>작업명(장소)</th><td colspan="2">' + ph() + '</td><th>작업기간</th><td>' + ph() + '</td></tr>' +
      '<tr><th>운전원 · 유도자</th><td colspan="4">' + au('업체 입력 · 1장 공통') + '</td></tr>' +
      '<tr><th>사전조사 내용</th><td colspan="4" style="text-align:left">' + esc(P.surveyNote) + ' ' + au('1장 공통') + '</td></tr>' +
      '<tr><th>기계·장비 제원</th>' + cellTd(base + '.equipNote', '기계·장비 제원 문구', nl(Ty.equipNote) + ' ' + au('업체가 붙였을 때만 「(첨부 n)」 표시'), ' colspan="4" style="text-align:left"', function () { return field('기계·장비 제원 문구', base + '.equipNote', { type: 'area', rows: 3 }); }) + '</tr></table></div>';
    var ck = Ty.checks || [];
    h += '<div class="rp-wrap"><table class="rt"><colgroup><col style="width:14%"><col><col style="width:7%"><col style="width:8%"><col style="width:17%"></colgroup><tr><th>구분</th><th>점검 항목</th><th>적정</th><th>부적정</th><th>안전조치</th></tr>' +
      rows(base + '.checks', '점검 항목', function (it, i) {
        var first = i === 0 || ck[i - 1].group !== it.group;
        return '<td>' + (first ? '<b>' + nl(it.group) + '</b>' : '<span class="dim">〃</span>') + '</td><td class="l' + (it.hi ? ' hi' : '') + '">' + (i + 1) + '. ' + nl(it.text) + (it.note ? '<br><small>' + nl(it.note) + '</small>' : '') + '</td><td>□</td><td>□</td><td class="sm">' + nl(it.action) + '</td>';
      }) + '</table></div>' + addBtn(base + '.checks', '점검 항목');
    h += '<h4 class="rp-sub">□ 운행경로 및 작업방법</h4>' + routeBox(base + '.route', '운행경로 및 작업계획 도면 (업체도 바꿀 수 있음)');
    var st = Ty.steps || [];
    h += '<div class="rp-wrap"><table class="rt"><colgroup><col style="width:6%"><col style="width:22%"><col><col></colgroup><tr><th colspan="2">작업내용(순서)</th><th>위험요인</th><th>제거대책</th></tr>' +
      rows(base + '.steps', '작업 순서', function (x, i) { var first = i === 0 || st[i - 1].work !== x.work; return '<td>' + (i + 1) + '</td><td>' + (first ? nl(x.work) : '<span class="dim">〃</span>') + '</td><td>' + nl(x.risk) + '</td><td>' + nl(x.fix) + '</td>'; }) +
      '</table></div>' + addBtn(base + '.steps', '작업 순서');
    return h;
  }
  function eduLogPage() {
    var S = cur.sedu, ap = S.approvals || [];
    var tKey = reg('sedu.title', '제목 · 부제목', function () { return field('제목', 'sedu.title', {}) + field('부제목', 'sedu.subtitle', {}); });
    var h = '<div class="rp-wrap"><table class="rt"><colgroup><col><col style="width:5%">' + ap.map(function () { return '<col style="width:15%">'; }).join('') + '</colgroup>' +
      '<tr><td rowspan="2"' + edAttr(tKey) + '><b class="pt-t">' + esc(S.title) + '</b><br><b>' + esc(S.subtitle) + '</b></td><th rowspan="2">결<br><br>재</th>' +
      ap.map(function (a, i) { var k = rowReg('sedu.approvals', i, '결재칸'); return '<th class="ed-c" data-act="edOpen" data-ed="' + esc(k) + '" title="눌러서 수정">' + nl(a.label) + rowX('sedu.approvals', i) + '</th>'; }).join('') + '</tr>' +
      '<tr>' + ap.map(function () { return '<td class="sign">' + ph('서명') + '</td>'; }).join('') + '</tr></table></div>' + addBtn('sedu.approvals', '결재칸');
    var kinds = S.kinds || [], kb = '';
    for (var i = 0; i < kinds.length; i += 2) {
      kb += '<tr>' + (i === 0 ? '<th rowspan="' + Math.ceil(kinds.length / 2) + '">교육구분</th>' : '');
      [i, i + 1].forEach(function (j) {
        var k = kinds[j];
        if (!k) { kb += '<td></td>'; return; }
        var key = rowReg('sedu.kinds', j, '교육구분');
        kb += '<td class="l ed-c" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + (j + 1) + '. ' + (k.on ? '■' : '□') + ' ' + nl(k.label) + rowX('sedu.kinds', j) + '</td>';
      });
      kb += '</tr>';
    }
    var mats = (S.materials || []).map(function (m, j) { var key = rowReg('sedu.materials', j, '교육자료'); return '<span class="mat ed-c" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정">' + nl(m.label) + ' ' + (m.on ? '■' : '□') + rowX('sedu.materials', j) + '</span>'; }).join('');
    var etcKey = reg('sedu.materialEtc', '교육자료 › 기타', function () { return field('기타', 'sedu.materialEtc', {}); });
    var blocks = (S.blocks || []).map(function (bl, bi) {
      var key = reg('sedu.blocks.' + bi, '교육내용 묶음 ' + (bi + 1) + ' 제목', function () { return field('묶음 제목', 'sedu.blocks.' + bi + '.head', { type: 'area', rows: 2, hint: '{N} 은 참석 근로자 수로 바뀝니다.' }); }, canDel('sedu.blocks') ? function () { return delRow('sedu.blocks', bi, true); } : null);
      return '<div class="edu-blk"><div' + edAttr(key) + '><b>' + nl(bl.head) + '</b>' + rowX('sedu.blocks', bi) + '</div>' + lines('sedu.blocks.' + bi + '.items', '교육내용', '○ ') + addBtn('sedu.blocks.' + bi + '.items', '내용') + '</div>';
    }).join('');
    h += '<div class="rp-wrap"><table class="rt"><colgroup><col style="width:14%"><col><col></colgroup>' +
      '<tr><th>교육일시</th>' + cellTd('sedu.timeText', '교육 시간 (기본값)', ph('교육한 날') + ' ' + nl(S.timeText), ' colspan="2" style="text-align:left"', function () { return field('교육 시간 기본값 (업체가 바꿀 수 있음)', 'sedu.timeText', {}); }) + '</tr>' + kb +
      '<tr><th>교육인원</th><td colspan="2">' + au('근로자 수와 「교육 확인」 답으로 자동') + '</td></tr>' +
      '<tr><th>교육제목</th>' + fld('sedu.eduTitle', '교육제목', 'sedu.eduTitle', { attrs: ' colspan="2"', type: 'text' }) + '</tr>' +
      '<tr><th>교육자료</th><td colspan="2"><div class="mats">' + mats + '<span class="mat"' + edAttr(etcKey).replace(' class="ed"', ' class="ed mat"') + '>기타 ' + nl(S.materialEtc) + '</span></div></td></tr>' +
      '<tr><th>교육내용</th><td colspan="2" class="l">' + blocks + addBtn('sedu.blocks', '교육내용 묶음') + '</td></tr></table></div>' + addBtn('sedu.kinds', '교육구분') + addBtn('sedu.materials', '교육자료');
    h += '<div class="rp-wrap"><table class="rt"><colgroup><col style="width:14%"><col><col><col></colgroup>' +
      '<tr><th rowspan="' + ((S.instructors || []).length + 1) + '">교육 실시자<br>및 장소<br><small>(업체가 고칠 수 있는 기본값)</small></th><th>성 명</th><th>직 명</th><th>교육실시 장소</th></tr>' +
      (S.instructors || []).map(function (r, i) { var key = rowReg('sedu.instructors', i, '교육 실시자 기본값'); return '<tr class="ed-row" data-act="edOpen" data-ed="' + esc(key) + '" title="눌러서 수정"><td>' + (nl(r.name) || ph('업체 입력')) + '</td><td>' + nl(r.title) + '</td><td>' + nl(r.place) + rowX('sedu.instructors', i) + '</td></tr>'; }).join('') +
      '</table></div>' + addBtn('sedu.instructors', '교육 실시자');
    return h;
  }
  /* 항목마다 「원본으로 되돌리기」 할 때 되돌릴 내용 */
  var SEC_PATHS = {
    process: ['processes'], equip: ['infoTables'], patrol: ['patrol'], cases: ['cases'], msds: ['msds'],
    hazard: ['hazardTables'], results: ['resultTables'], edu: ['preEdu', 'postEdu'],
    interviews: ['interviews'], budget: ['budget'], danger: ['dangerWork'], ppe: ['ppe'], insp: ['inspection', 'inspectionPlan'],
    eduRec: ['eduRecord', 'eduPhotoLabel'], emer: ['emergencyFlow']
  };
  var showEd = true;    // 「수정할 곳 보기」 — 터치 화면처럼 마우스를 올릴 수 없을 때 수정 가능한 칸을 모두 표시

  function viewSettings() {
    var rv = cur.reviewed || {};
    if (!setSec) {
      var h = '<p class="lead">' + DOCS[doc].name + ' 서류 순서대로 정리했습니다. 항목을 누르면 <b>서류의 표 모양 그대로</b> 나옵니다. 바꾼 내용은 <b>모든 업체의 서류에 똑같이</b> 들어갑니다.</p>';
      docChapters().forEach(function (ch) {
        h += '<section class="toc"><h3 class="toc-h"><span class="toc-no">' + ch.no + '</span>' + esc(ch.title) + '</h3>';
        if (ch.fixed) { h += '<p class="toc-fixed">🔒 ' + esc(ch.fixed) + '</p></section>'; return; }
        h += '<div class="set-list">';
        ch.items.forEach(function (id, i) {
          var no = ch.no + '-' + (i + 1);
          if (id === '@eval') {
            h += '<div class="set-item auto"><span class="set-no">' + no + '</span><span class="set-t">' + esc(SEC_TITLE[id]) + '<small>질문 답으로 자동으로 채워집니다</small></span><span class="set-st none">자동</span></div>';
            return;
          }
          var st = rv[id];
          h += '<button class="set-item" data-act="setOpen" data-sec="' + id + '"><span class="set-no">' + no + '</span><span class="set-t">' + esc(secTitle(id)) + '</span>' +
            '<span class="set-st ' + (st || 'none') + '">' + (st === 'ok' ? '✔ 확인' : st === 'edited' ? '✎ 수정함' : '확인 전') + '</span></button>';
        });
        h += '</div>' + (ch.addType ? '<button class="btn btn-ghost rp-addtbl" data-act="typeAdd">＋ 장비 종류 추가</button>' : '') + '</section>';
      });
      return h + '<button class="btn btn-primary btn-big" data-act="home">처음 화면으로</button>';
    }
    EDREG = {};
    return '<button class="btn btn-sm btn-ghost set-back" data-act="setBack">◀ 목차로</button>' +
      '<div class="rp' + (showEd ? ' show-ed' : '') + '">' + pageFor(setSec) + '</div>' +
      (canReset(setSec) ? '<button class="btn btn-ghost btn-reset" data-act="resetSec" data-sec="' + setSec + '">↺ 이 항목을 원본 내용으로 되돌리기</button>' : '');
  }
  /* 넓은 표는 옆으로 밀지 않고 화면 폭에 맞게 줄여서 보여 줌 (손가락으로 벌리면 확대) */
  function fitTables() {
    if (view !== 'settings' || !setSec) return;
    Array.prototype.forEach.call(document.querySelectorAll('.rp-wrap > table'), function (t) {
      t.style.zoom = '';
      var w = t.parentNode.clientWidth, sw = t.scrollWidth;
      if (w && sw > w + 1) t.style.zoom = (Math.floor(w / sw * 1000) / 1000).toString();
    });
  }
  var fitT = null;
  window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(fitTables, 120); });
  function chapterOf(id) {
    var ch = docChapters();
    for (var c = 0; c < ch.length; c++) if ((ch[c].items || []).indexOf(id) >= 0) return ch[c].no + '. ' + ch[c].title;
    return '';
  }

  /* --- 수정 창(메모) --- */
  function drawMemo() {
    var m = document.getElementById('modal'), r = EDREG[memoKey];
    if (!r) { memoKey = null; closeModal(); return; }
    var old = m.querySelector('.memo-body'), st = old ? old.scrollTop : 0;
    m.innerHTML = '<div class="memo" role="dialog" aria-label="고치기"><div class="memo-head"><div><small>' + esc(chapterOf(setSec)) + ' › ' + esc(secTitle(setSec)) + '</small><b>✎ ' + esc(r.label) + '</b></div>' +
      '<button class="btn btn-sm btn-ghost" data-act="edCancel" aria-label="닫기">✕</button></div>' +
      '<div class="memo-body">' + r.render() + '</div>' +
      '<div class="memo-foot">' + (r.del ? '<button class="btn btn-danger" data-act="edDel">삭제</button>' : '') + '<span class="sp"></span>' +
      '<button class="btn btn-ghost" data-act="edCancel">취소</button><button class="btn btn-primary" data-act="edSave">저장</button></div></div>';
    m.hidden = false; m.classList.add('memo-on'); document.body.classList.add('noscroll');
    var nb = m.querySelector('.memo-body'); if (nb) nb.scrollTop = st;
  }
  function snapAll() { return clone({ edit: cur.edit, plan: cur.plan, sedu: cur.sedu }); }
  function restoreAll(sn) { cur.edit = sn.edit; cur.plan = sn.plan; cur.sedu = sn.sedu; }
  function openMemo(key, snapTaken) {
    if (!snapTaken) memoSnap = snapAll();
    memoKey = key; drawMemo();
    if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
      setTimeout(function () { var f = document.querySelector('.memo-body textarea, .memo-body input'); if (f) f.focus(); }, 30);
    }
  }
  function closeMemo(msg) {
    memoKey = null; memoSnap = null;
    var m = document.getElementById('modal'); m.classList.remove('memo-on'); closeModal();
    save(true); rerender(); if (msg) toast(msg);
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
    var d = doc === 'sedu' ? (cur.docs.sedu.date || D.today()) : doc === 'plan' ? D.today() : (cur.info.writeDate || D.today());
    return { ra: '위험성평가_', plan: '작업계획서_', sedu: '특별교육_' }[doc] + n + '_' + d.replace(/-/g, '') + '.pdf';
  }
  function pdfBlob(dd) {
    return new Promise(function (res, rej) { try { window.pdfMake.createPdf(dd).getBlob(function (b) { cur.docs[doc].sigPages = dd._sigPages || null; res(b); }); } catch (e) { rej(e); } });
  }
  function dataURLBytes(d) { var b = atob(String(d).split(',')[1] || ''), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  var routeCache = {}, pdfLibLoad = null;
  function unitRoute(u) { var Ty = PLANDOC.typeOf(PS(), u.type) || {}; return u.route || Ty.route || Ty.routeDefault || ''; }
  /* 작업계획서: 그림 첨부는 쪽으로 넣고, PDF 첨부는 뒤에 이어 붙이고, 한글·워드는 PDF 안의 첨부파일로 */
  function buildPlanPdf() {
    var P = PS(), pd = cur.docs.plan;
    var units = pd.units.filter(function (u) { return PLANDOC.typeOf(P, u.type); });
    var atts = [], no = 1;
    (pd.survey || []).forEach(function (f) { atts.push(Object.assign({}, f, { no: no++, title: '사전조사 내용', unit: null })); });
    units.forEach(function (u, ui) {
      var Ty = PLANDOC.typeOf(P, u.type);
      (u.reg || []).forEach(function (f) { atts.push(Object.assign({}, f, { no: no++, title: (ui + 1) + '. ' + Ty.name + ' 기계·장비 제원', unit: ui })); });
      (u.lic || []).forEach(function (f) { atts.push(Object.assign({}, f, { no: no++, title: (ui + 1) + '. ' + Ty.name + ' 운전원 자격·면허', unit: ui, lic: true })); });
    });
    var need = units.map(unitRoute).filter(function (x) { return x && x.indexOf('data:') !== 0 && !routeCache[x]; });
    return Promise.all(need.map(function (x) { return fetchDataURL(x).then(function (d) { routeCache[x] = d; }).catch(function () {}); })).then(function () {
      var dd = PLANDOC.build(cur, P, { attachments: atts, routeImage: function (u) { var x = unitRoute(u); return x.indexOf('data:') === 0 ? x : (routeCache[x] || null); } });
      return new Promise(function (res, rej) { try { window.pdfMake.createPdf(dd).getBuffer(function (buf) { cur.docs.plan.sigPages = dd._sigPages || null; res(buf); }); } catch (e) { rej(e); } });
    }).then(function (buf) {
      var extra = atts.filter(function (a) { return a.kind !== 'image'; });
      if (!extra.length) return new Blob([buf], { type: 'application/pdf' });
      pdfLibLoad = pdfLibLoad || loadScript('lib/pdf-lib.min.js');
      return pdfLibLoad.then(function () {
        var PL = window.PDFLib;
        return PL.PDFDocument.load(buf).then(function (main) {
          var chain = Promise.resolve();
          extra.forEach(function (a) {
            chain = chain.then(function () {
              var bytes = dataURLBytes(a.data);
              var asFile = function () { return main.attach(bytes, a.name, { mimeType: a.mime || 'application/octet-stream', description: '첨부 ' + a.no + '. ' + a.title }); };
              if (a.kind !== 'pdf') return asFile();
              return PL.PDFDocument.load(bytes, { ignoreEncryption: true }).then(function (src) {
                return main.copyPages(src, src.getPageIndices()).then(function (pages) { pages.forEach(function (pg) { main.addPage(pg); }); });
              }).catch(asFile);
            });
          });
          return chain.then(function () { return main.save(); }).then(function (b) { return new Blob([b], { type: 'application/pdf' }); });
        });
      });
    });
  }
  function makePdf(preview) {
    var win = null;
    if (preview) { try { win = window.open('', '_blank'); if (win) win.document.write('<p style="font:20px sans-serif;padding:20px">PDF를 만드는 중입니다…</p>'); } catch (e) { win = null; } }
    busy(true, 'PDF를 만드는 중입니다…<br><small>처음에는 10~20초 걸릴 수 있어요</small>');
    prepPdf().then(function (flow) {
      if (doc === 'plan') return buildPlanPdf();
      if (doc === 'sedu') return pdfBlob(EDUDOC.build(cur, SS()));
      return pdfBlob(PDFDOC.build(cur, { flow: flow, edit: E() }));
    }).then(function (blob) {
      busy(false); save(true); if (view === 'step' && STEPS[stepIdx].key === 'done') rerender();
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

  /* ---------- 설정 파일로 저장 / 불러오기 (보고서 기본 내용 설정만. 업체 작성 내용은 들어가지 않음) ---------- */
  function exportAll() {
    if (!SET) { alert('저장할 설정이 없습니다.'); return; }
    var payload = { app: 'risk_assessment', kind: 'settings', v: 3, savedAt: D.today(), settings: { edit: SET.edit, reviewed: SET.reviewed, plan: SET.plan, sedu: SET.sedu } };
    var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = '제설안전서류_기본내용설정_' + D.today().replace(/-/g, '') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('설정 파일을 받았습니다. 「다운로드」 폴더에 있어요.');
  }
  function readBackup(text) {
    var t = String(text || '').trim();
    if (t.charAt(0) === '{') return JSON.parse(t);
    var doc = new DOMParser().parseFromString(t, 'text/html');   // 예전 HTML 저장 파일
    var el = doc.getElementById('ra-backup');
    if (!el) throw new Error('형식 오류');
    return JSON.parse(el.textContent);
  }
  /* 파일 안의 보고서 기본 내용 설정만 가져옴 (업체 내용은 무시) */
  function importSettings(d) {
    if (!d || !d.settings || !d.settings.edit) return Promise.reject(new Error('설정 없음'));
    if (!confirm('이 기기의 「보고서 기본 내용」 설정을 파일의 설정으로 바꿀까요?\n(업체가 작성한 내용은 바뀌지 않습니다)')) return Promise.resolve(false);
    SET = migrateSet(clone(d.settings));
    return Store.put(SET).then(function () { return true; });
  }
  function receiveFromFile() { return false; }
  function importFile() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.html,.htm,application/json,text/html,text/plain,application/octet-stream';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      f.text().then(function (t) { return importSettings(readBackup(t)); })
        .then(function (ok) { if (ok) { toast('보고서 기본 내용 설정을 불러왔습니다.'); render(); } })
        .catch(function () { alert('설정을 불러올 수 없는 파일입니다.'); });
    };
    inp.click();
  }

  /* ---------- 첨부 파일 (한글·워드·PDF·그림) ---------- */
  function fileKind(f) {
    var n = (f.name || '').toLowerCase();
    if (/^image\//.test(f.type) || /\.(jpe?g|png|gif|webp|bmp|heic)$/.test(n)) return 'image';
    if (f.type === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
    if (/\.hwpx?$/.test(n)) return 'hwp';
    if (/\.docx?$/.test(n)) return 'doc';
    return 'other';
  }
  function readDataURL(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(f); }); }
  function afterAttach() {
    if (view === 'settings') { cur.reviewed = cur.reviewed || {}; if (setSec) cur.reviewed[setSec] = 'edited'; }
    save(true); rerender();
  }
  function addAttachments(path, files) {
    if (!files.length) return;
    var list = getP(cur, path); if (!list) { setP(cur, path, []); list = getP(cur, path); }
    var chain = Promise.resolve(), added = 0;
    files.forEach(function (f) {
      chain = chain.then(function () {
        var kind = fileKind(f);
        if (f.size > 20 * 1024 * 1024) { alert('「' + f.name + '」 파일이 너무 큽니다 (20MB 넘음).'); return; }
        if (kind === 'image') {
          busy(true, '그림을 여는 중…');
          return ImgEdit.fromFile(f).then(function (d) {
            busy(false);
            return ImgEdit.open(d, '그림 편집 · 필요한 부분만 남기세요').then(function (e) { list.push({ id: uid(), name: f.name || '사진.jpg', kind: 'image', mime: 'image/jpeg', data: e || d, orig: d }); added++; });
          }).catch(function () { busy(false); alert('「' + f.name + '」 그림을 읽지 못했습니다.'); });
        }
        return readDataURL(f).then(function (d) { list.push({ id: uid(), name: f.name, kind: kind, mime: f.type || '', data: d }); added++; });
      });
    });
    chain.then(function () { if (added) { afterAttach(); toast(added + '개를 붙였습니다.'); } });
  }

  /* ---------- 이벤트 ---------- */
  function openCompany(id, step) {
    return Store.get(id).then(function (c) {
      if (!c) return;
      cur = migrate(c); Settings.set('currentId', cur.id);
      goStep(step != null ? step : Math.min(cur.docs[doc].lastStep || 0, STEPS.length - 1));
    });
  }
  function goHome() { closeModal(); if (cur) save(true); cur = null; view = 'home'; render(); window.scrollTo(0, 0); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    switch (act) {
      case 'setMulti': multi = b.dataset.v === '1'; Settings.set('multi', multi); renderHome(); break;
      case 'home': if (memoKey && memoSnap) { restoreAll(memoSnap); memoKey = null; memoSnap = null; document.getElementById('modal').classList.remove('memo-on'); } setSec = null; goHome(); break;
      case 'menu': stepMenu(); break;
      case 'closeModal': closeModal(); break;
      case 'goto': closeModal(); goStep(+b.dataset.i); break;
      case 'settings': cur = SET; view = 'settings'; setSec = null; showEd = true; render(); window.scrollTo(0, 0); break;
      case 'setOpen': setSec = b.dataset.sec; render(); window.scrollTo(0, 0); break;
      case 'setBack': setSec = null; render(); window.scrollTo(0, 0); break;
      case 'setOk': cur.reviewed = cur.reviewed || {}; if (cur.reviewed[setSec] !== 'edited') cur.reviewed[setSec] = 'ok'; save(true); setSec = null; render(); window.scrollTo(0, 0); toast('확인했습니다.'); break;
      case 'edShow': showEd = !showEd; rerender(); if (showEd) toast('테두리 친 칸을 누르면 고칠 수 있어요.'); break;
      case 'edOpen': openMemo(b.dataset.ed); break;
      case 'edAdd': {
        var lp = b.dataset.path, la = getP(cur, lp), lt = ROWT[norm(lp)];
        memoSnap = snapAll(); la = getP(cur, lp);
        var nv = lt ? clone(lt) : '';
        if (lp === 'edit.processes') nv.id = 'p' + Date.now().toString(36);
        la.push(nv); save(); rerender();
        openMemo(lp + '.' + (la.length - 1), true); break;
      }
      case 'edSave': cur.reviewed = cur.reviewed || {}; cur.reviewed[setSec] = 'edited'; closeMemo('저장했습니다. 모든 업체 보고서에 들어갑니다.'); break;
      case 'edCancel': if (memoSnap) restoreAll(memoSnap); closeMemo(); break;
      case 'edDel': {
        var dr = EDREG[memoKey]; if (!dr || !dr.del) break;
        var isProc = /^edit\.processes\.\d+$/.test(memoKey);
        if (!isProc && !confirm('이 줄을 지울까요?')) break;
        if (!dr.del()) break;
        cur.reviewed = cur.reviewed || {}; cur.reviewed[setSec] = 'edited'; closeMemo('지웠습니다.'); break;
      }
      case 'rowDel': {
        if (delRow(b.dataset.path, +b.dataset.i)) { cur.reviewed = cur.reviewed || {}; cur.reviewed[setSec] = 'edited'; save(true); rerender(); toast('지웠습니다.'); }
        break;
      }
      case 'tblAdd': {
        var tk = TBL[b.dataset.kind], tl = cur.edit[tk.path] = cur.edit[tk.path] || [], used = tl.map(function (x) { return x.proc; });
        var ps = cur.edit.processes || [], free = ps.filter(function (x) { return used.indexOf(x.id) < 0; })[0] || ps[0];
        var nt = tk.tmpl(); nt.proc = free ? free.id : '';
        tl.push(nt); cur.reviewed = cur.reviewed || {}; cur.reviewed[setSec] = 'edited'; save(true); rerender();
        setTimeout(function () { var bars = document.querySelectorAll('.tbl'); if (bars.length) bars[bars.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
        toast('표를 추가했습니다. 「' + (free ? free.name : '') + '」 공정으로 정했어요.');
        break;
      }
      case 'tblDel': {
        var dk = TBL[b.dataset.kind], dl = cur.edit[dk.path], di = +b.dataset.t;
        if (!dl || dl.length <= 1) break;
        if (!confirm(dk.name + ' 표 ' + (di + 1) + '(「' + procName(dl[di].proc) + '」)을 지울까요?')) break;
        dl.splice(di, 1); cur.reviewed = cur.reviewed || {}; cur.reviewed[setSec] = 'edited'; save(true); rerender(); toast('표를 지웠습니다.');
        break;
      }
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
      case 'chipAdd': {
        var ap = b.dataset.path; customOpen[ap] = true; setP(cur, ap, ''); save(); rerender();
        setTimeout(function () { var inp = $app.querySelector('[data-bind="' + ap + '"]'); if (inp) inp.focus(); }, 30);
        break;
      }
      case 'chip': {
        var p = b.dataset.path, v = b.dataset.val; customOpen[p] = false;
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
      case 'nearMode': nearMode = b.dataset.v; rerender(); break;
      case 'nearMap': {
        var mk = b.dataset.k;
        Near.pick(mk, { mode: nearMode, branch: cur.info.branch, address: cur.info.address }).then(function (r) {
          if (!r) return;
          cur.agencies[mk] = { name: r.name, phone: r.phone }; save(); rerender();
          toast(r.phone ? '「' + r.name + '」을(를) 넣었습니다.' : '「' + r.name + '」을(를) 넣었습니다. 전화번호를 적어 주세요.');
        });
        break;
      }
      case 'nearPick': {
        var nk = b.dataset.k, pl = nearCache[cur.id][nk][+b.dataset.i];
        cur.agencies[nk] = { name: pl.name, phone: pl.phone }; save(); rerender(); break;
      }
      case 'recrop': {
        var sk = b.dataset.k, slot = ALL_SLOTS.filter(function (s) { return s.k === sk; })[0], o = cur.photosOrig[sk];
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
      case 'hz': { var hct = cur.edit.hazardTables[+b.dataset.t || 0]; hct.checks = hct.checks || []; var hc = hct.checks, ix = hc.indexOf(b.dataset.k); if (ix >= 0) hc.splice(ix, 1); else hc.push(b.dataset.k); if (view === 'settings') { cur.reviewed = cur.reviewed || {}; cur.reviewed[setSec] = 'edited'; } save(); rerender(); break; }
      case 'resetSec': {
        var rs = b.dataset.sec;
        if (confirm('「' + secTitle(rs) + '」을(를) 원본 내용으로 되돌릴까요?')) { resetSection(rs); if (cur.reviewed) delete cur.reviewed[rs]; save(); rerender(); toast('원본 내용으로 되돌렸습니다.'); }
        break;
      }
      case 'docSel': setDoc(b.dataset.v); renderHome(); window.scrollTo(0, 0); break;
      case 'unitAdd': {
        var pdU = cur.docs.plan, ty = b.dataset.type, Ty = PLANDOC.typeOf(PS(), ty);
        var used = pdU.units.map(function (u) { return u.driver; });
        var free = cur.workers.findIndex(function (w, i) { return w.name && used.indexOf(String(i)) < 0 && used.indexOf(i) < 0; });
        pdU.units.push({ id: uid(), type: ty, driver: free >= 0 ? String(free) : '', reg: [], lic: [], route: '' });
        save(); rerender(); toast('「' + (Ty ? Ty.name : '') + '」 작업계획서를 추가했습니다.');
        setTimeout(function () { var cs = document.querySelectorAll('.card.unit'); if (cs.length) cs[cs.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
        break;
      }
      case 'unitDel': if (confirm('이 장비의 작업계획서를 뺄까요? 붙인 서류도 함께 빠집니다.')) { cur.docs.plan.units.splice(+b.dataset.i, 1); save(true); rerender(); } break;
      case 'attDel': if (confirm('이 첨부를 뺄까요?')) { getP(cur, b.dataset.path).splice(+b.dataset.i, 1); afterAttach(); } break;
      case 'attEdit': {
        var ap = b.dataset.path, ai = +b.dataset.i, af = getP(cur, ap)[ai];
        ImgEdit.open(af.orig || af.data, '그림 편집 · ' + af.name).then(function (d) { if (d) { af.data = d; afterAttach(); } });
        break;
      }
      case 'routeEdit': {
        var rp = b.dataset.path, src = routeSrc(rp);
        ImgEdit.open(src, '운행경로 그림 편집').then(function (d) { if (d) { setP(cur, rp, d); afterAttach(); } }).catch(function () { alert('그림을 열지 못했습니다.'); });
        break;
      }
      case 'routeReset': if (confirm('기본 그림으로 되돌릴까요?')) { setP(cur, b.dataset.path, ''); afterAttach(); } break;
      case 'eduAll': cur.docs.sedu.allDone = b.dataset.v; if (b.dataset.v === 'O') cur.docs.sedu.absent = 0; save(); rerender(); break;
      case 'absCnt': { var ed = cur.docs.sedu, nW = cur.workers.filter(function (w) { return w.name; }).length; ed.absent = Math.max(0, Math.min(nW, (+ed.absent || 0) + (+b.dataset.d))); save(); rerender(); break; }
      case 'insAdd': cur.docs.sedu.instructors.push({ name: '', title: '', place: '' }); save(); rerender(); break;
      case 'insDel': if (confirm('이 교육 실시자를 지울까요?')) { cur.docs.sedu.instructors.splice(+b.dataset.i, 1); save(); rerender(); } break;
      case 'typeAdd': {
        var nid = 't' + Date.now().toString(36);
        cur.plan.types.push({ id: nid, name: '새 장비', sub: '차량계 건설기계', equipNote: '건설기계 등록·검사증, 기계 대여사항 기록부, 점검 이력 등', routeDefault: '', route: '',
          checks: [{ group: '운전자 자격', text: '운전자의 적정 자격*을 확인한다.', note: '', hi: false, action: '' }], steps: [{ work: '', risk: '', fix: '' }] });
        cur.reviewed = cur.reviewed || {}; cur.reviewed['pt_' + nid] = 'edited';
        save(true); setSec = 'pt_' + nid; render(); window.scrollTo(0, 0);
        memoSnap = snapAll(); openMemo('plan.types.' + (cur.plan.types.length - 1) + '.title', true);
        break;
      }
      case 'typeDel': {
        var tdi = +b.dataset.t, tdt = cur.plan.types[tdi];
        if (cur.plan.types.length <= 1 || !confirm('「' + tdt.name + '」 작업계획서를 지울까요? 업체가 이 장비로 만든 작업계획서도 PDF에서 빠집니다.')) break;
        cur.plan.types.splice(tdi, 1); save(true); setSec = null; render(); window.scrollTo(0, 0); toast('지웠습니다.');
        break;
      }
      case 'ckAns': {
        var cu = cur.docs.plan.units[+b.dataset.u], ci = +b.dataset.i;
        cu.ans = cu.ans || {}; cu.act = cu.act || {}; cu.ans[ci] = b.dataset.v;
        if (b.dataset.v === 'X') ckAct = { u: +b.dataset.u, i: ci }; else delete cu.act[ci];
        save(); render(); window.scrollTo(0, 0); break;
      }
      case 'ckActDone': ckAct = null; save(); render(); window.scrollTo(0, 0); break;
      case 'ckBack': {
        // 마지막으로 답한 항목 (장비 순서·항목 순서로 가장 뒤) 지우기
        var last = null;
        planUnits().forEach(function (x) { (x.T.checks || []).forEach(function (c, i) { if ((x.u.ans || {})[i]) last = { u: x.u, i: i }; }); });
        if (last) { delete last.u.ans[last.i]; if (last.u.act) delete last.u.act[last.i]; }
        ckAct = null; save(); render(); break;
      }
      case 'ckRedo': { var ru = cur.docs.plan.units[+b.dataset.u]; if (ru.ans) delete ru.ans[+b.dataset.i]; ckAct = null; save(); render(); window.scrollTo(0, 0); break; }
      case 'ckReset': if (confirm('이 장비의 점검 답을 모두 지우고 처음부터 할까요?')) { var su = cur.docs.plan.units[+b.dataset.u]; su.ans = {}; su.act = {}; ckAct = null; save(); render(); window.scrollTo(0, 0); } break;
      case 'pdf': save(true); makePdf(false); break;
      case 'pdfView': save(true); makePdf(true); break;
    }
  });
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); if (memoKey && view === 'settings') drawMemo(); }

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
    if (t.dataset && t.dataset.bind && t.tagName === 'SELECT') { setP(cur, t.dataset.bind, t.value); save(); }
    if (t.dataset && t.dataset.attach) { addAttachments(t.dataset.attach, Array.prototype.slice.call(t.files || [])); t.value = ''; return; }
    if (t.dataset && t.dataset.routefile) {
      var rf = t.files && t.files[0], rpth = t.dataset.routefile; t.value = '';
      if (!rf) return;
      ImgEdit.fromFile(rf).then(function (d) { return ImgEdit.open(d, '운행경로 그림 · 필요한 부분만 남기세요').then(function (e) { return e || d; }); })
        .then(function (d) { setP(cur, rpth, d); afterAttach(); toast('그림을 바꿨습니다.'); }).catch(function () { alert('그림을 읽지 못했습니다.'); });
      return;
    }
    if (t.dataset && t.dataset.photo) {
      var file = t.files && t.files[0], k = t.dataset.photo; t.value = '';
      if (!file) return;
      var slot = ALL_SLOTS.filter(function (s) { return s.k === k; })[0];
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
