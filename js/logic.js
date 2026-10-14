/* 설문 정의, 점수 계산, 날짜·문자 처리 등 공통 기능 */
(function (g) {
  'use strict';

  /* ---------- 설문 ----------
   * 각 질문: id, item(평가표 항목), text, help, O/X: 다음 질문 id 또는 {score:n} / {exclude:true}
   * U: '모르겠어요' 버튼 (원본에 해당 조항이 있는 곳만)
   */
  var Q = {
    /* 17쪽 기타 안전보건상 정보 */
    i_sub: { item: 'info', text: '이번 작업에 다른 업체와 함께 하거나 하도급을 준 일(도급·혼재작업)이 있나요?', O: { set: ['info.subcontract', true] }, X: { set: ['info.subcontract', false] } },
    i_permit: { item: 'info', text: '안전작업허가증이 필요한 작업(용접, 밀폐공간 작업 등)이 있나요?', O: { set: ['info.permit', true] }, X: { set: ['info.permit', false] } },
    i_checkup: { item: 'info', text: '근로자가 건강진단을 받았나요?', O: { set: ['info.checkup', true] }, X: { set: ['info.checkup', false] } },

    /* 평가표 1 */
    q1: { item: 'q1', text: '회사에 안전보건방침(안전에 대한 회사의 약속)이 있나요?', help: '이 보고서 4쪽에 안전보건방침이 들어갑니다. 대표님이 그 방침을 지키기로 하셨다면 ⭕를 누르세요.', O: 'q1b', X: { score: 3 } },
    q1b: { item: 'q1', text: '그 방침에 맞춘 안전 목표(예: 무재해 달성)도 정했나요?', O: { score: 10 }, X: { score: 6 } },
    /* 2-1 */
    q2a: { item: 'q2a', text: '안전 전문인력이 있나요?', help: '안전 관련 자격증이 있거나, 안전 관련 학과를 졸업한 사람', O: 'q2a2', X: { score: 2 } },
    q2a2: { item: 'q2a', text: '안전만 따로 맡는 조직(안전전담조직)도 있나요?', O: { score: 5 }, X: { score: 3 } },
    /* 2-2 */
    q2b: { item: 'q2b', text: '이번 일에 안전을 위한 돈(보호구, 방한용품, 후방카메라 등)을 쓸 계획이 있나요?', O: 'q2b2', X: { score: 2 } },
    q2b2: { item: 'q2b', text: '어디에 얼마를 쓸지 구체적으로 정했나요?', help: '나중에 "내용 수정"의 안전예산 표에 금액을 적을 수 있어요.', O: { score: 5 }, X: { score: 3 } },
    /* 3 */
    q3: { item: 'q3', text: '근로자의 안전 의견을 듣는 방법(작업 전 회의, 면담 등)이 있나요?', O: { score: 5 }, X: { score: 2 } },
    /* 4 */
    q4: { item: 'q4', text: '위험한 작업이 무엇인지 알고 있나요?', help: '예) 좁은 창고에서 여러 장비로 하는 작업, 강설 때 고속도로에서 염화물을 뿌리는 작업', O: 'q4b', X: { score: 3 } },
    q4b: { item: 'q4', text: '그 위험한 작업에 대한 관리계획(작업지휘자 배치, 교육 등)을 세웠나요?', O: { score: 10 }, X: { score: 6 } },
    /* 5 */
    q5: { item: 'q5', text: '근로자에게 보호구(안전모, 안전화, 안전조끼 등)를 나눠 주나요?', O: 'q5b', X: { score: 3 } },
    q5b: { item: 'q5', text: '작업 전에 보호구를 제대로 썼는지 확인하나요?', O: { score: 10 }, X: { score: 6 } },
    /* 6 */
    q6: { item: 'q6', text: '작업 전에 안전점검을 하나요?', O: 'q6b', X: { score: 3 } },
    q6b: { item: 'q6', text: '점검할 항목(장비 상태, 작업장 상태 등)이 정해져 있나요?', O: { score: 10 }, X: { score: 6 } },
    /* 7 */
    q7: { item: 'q7', text: '법으로 정한 안전교육을 했나요?', help: '예) 새로 뽑은 근로자에게 8시간 안전교육. 일용직만 있어 해당이 없으면 ⭕를 누르세요.', O: 'q7b', X: { score: 3 } },
    q7b: { item: 'q7', text: '매일 작업 전 안전교육(TBM)을 할 계획이 있나요?', O: { score: 10 }, X: { score: 6 } },
    /* 8 */
    q8: { item: 'q8', text: '도로공사(발주처) 담당자와 우리 회사 사이의 연락처(연락체계)가 정해져 있나요?', O: { score: 5 }, X: { score: 2 } },
    /* 9 */
    q9: { item: 'q9', text: '사고가 나면 누구에게 어떻게 연락하고 대피할지 정해져 있나요?', O: { score: 10 }, X: { score: 3 } },
    /* 10 */
    q10: { item: 'q10', text: '회사를 세운 지(사업을 시작한 지) 1년이 넘었나요?', O: 'q10b', X: { exclude: true } },
    q10b: { item: 'q10', text: '최근 3년 동안 일하다 다친 사람(산업재해)이 있었나요?', O: 'q10n', X: { score: 20 } },
    q10n: { item: 'q10', type: 'count', text: '몇 건, 몇 명이었나요?', next: 'q10c' },
    q10c: { item: 'q10', text: '그중에 사망사고가 있었나요?', O: { score: 6 }, X: 'q10d' },
    q10d: { item: 'q10', text: '산업재해율이 같은 업종 평균보다 낮은가요?', help: '안전보건공단의 "산업재해율 확인서"로 알 수 있어요.', O: 'q10e', X: { score: 6 }, U: { score: 12 } },
    q10e: { item: 'q10', text: '재해율이 해마다 줄고 있나요?', O: { score: 20 }, X: { score: 12 } }
  };
  var ROOTS = ['i_sub', 'i_permit', 'i_checkup', 'q1', 'q2a', 'q2b', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
  var ITEM_TITLE = {
    info: '작업 정보', q1: '안전보건 방침', q2a: '안전 인력', q2b: '안전 예산', q3: '근로자 의견', q4: '위험작업 관리',
    q5: '개인보호구', q6: '안전점검', q7: '안전교육', q8: '연락체계', q9: '비상대책', q10: '산업재해'
  };

  /* 답변을 따라가며 경로(물어본 질문 목록)와 결과를 계산 */
  function walk(answers) {
    var path = [], results = {}, pending = null;
    for (var r = 0; r < ROOTS.length; r++) {
      var id = ROOTS[r];
      while (id) {
        var q = Q[id];
        path.push(id);
        var a = answers[id];
        if (q.type === 'count') {
          if (!a) { pending = pending || id; id = null; break; }
          id = q.next; continue;
        }
        if (!a) { pending = pending || id; id = null; break; }
        var nx = q[a];
        if (typeof nx === 'string') { id = nx; continue; }
        if (nx && nx.score != null) results[q.item] = nx.score;
        if (nx && nx.exclude) results[q.item] = 'exclude';
        id = null;
      }
      if (pending) break;
    }
    return { path: path, results: results, pending: pending };
  }

  function evalSummary(c) {
    var w = walk(c.answers || {});
    var res = w.results, sub = 0, done = true, items = TPL.FIXED.evalItems;
    items.forEach(function (it) {
      if (it.key === 'q10') return;
      if (typeof res[it.key] === 'number') sub += res[it.key]; else done = false;
    });
    var q10 = res.q10, total = null, grade = '', note = '', base = 100;
    if (q10 === undefined) done = false;
    if (done) {
      if (q10 === 'exclude') {
        total = sub; base = 80;
        var conv = Math.round(sub / 80 * 1000) / 10;
        grade = gradeOf(conv);
        note = '재해발생수준 제외, 100점 환산 ' + conv + '점';
      } else { total = sub + q10; grade = gradeOf(total); }
    }
    return { scores: res, subtotal: sub, total: total, grade: grade, note: note, done: done, base: base };
  }
  function gradeOf(s) { return s >= 90 ? 'S등급' : s >= 80 ? 'A등급' : s >= 70 ? 'B등급' : s >= 60 ? 'C등급' : 'D등급'; }

  /* ---------- 날짜 ---------- */
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function pd(s) { if (!s) return null; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function z(n) { return (n < 10 ? '0' : '') + n; }
  var D = {
    today: function () { var t = new Date(); return t.getFullYear() + '-' + z(t.getMonth() + 1) + '-' + z(t.getDate()); },
    year: function (s) { var p = pd(s); return p ? p.y : new Date().getFullYear(); },
    dot: function (s) { var p = pd(s); return p ? p.y + '. ' + p.m + '. ' + p.d + '.' : ''; },
    ym: function (s) { var p = pd(s); return p ? p.y + '. ' + p.m + '.' : ''; },
    short: function (s) { var p = pd(s); return p ? '‘' + String(p.y).slice(2) + '. ' + p.m + '. ' + p.d + '.' : '‘  .  .  .'; },
    kor: function (s) { var p = pd(s); return p ? p.y + '년 ' + p.m + '월 ' + p.d + '일' : '    년   월   일'; },
    wd: function (s) { var p = pd(s); if (!p) return ''; return WD[new Date(p.y, p.m - 1, p.d).getDay()]; },
    dotWd: function (s) { var p = pd(s); return p ? p.y + '. ' + p.m + '. ' + p.d + '(' + D.wd(s) + ')' : ''; },
    contract: function (s) { var p = pd(s); return p ? '‘' + String(p.y).slice(2) + '.' + z(p.m) + '.' + z(p.d) : '‘00.00.00'; }
  };

  /* ---------- 글꼴에 없는 문자 정리 ---------- */
  var ALLOWED = /[\n\t\x20-\x7e\xa0-\xff‐-⁯℀-⅏←-⇿∀-⋿①-⓿─-╿■-◿☀-⛿✓　-〿㄰-㆏・㈀-㋿㎀-㏿가-힣！-･母妻子父夫女兄弟姉妹孫祖叔姪甥]/;
  function clean(s) {
    if (s == null) return '';
    s = String(s).replace(/∼/g, '~').replace(/∙/g, '·');
    var out = '';
    for (var ch of s) { if (ALLOWED.test(ch)) out += ch; }
    return out;
  }

  function fmtMoney(v) {
    var n = String(v || '').replace(/[^\d]/g, '');
    if (!n) return '';
    return Number(n).toLocaleString('ko-KR');
  }

  g.LOGIC = { Q: Q, ROOTS: ROOTS, ITEM_TITLE: ITEM_TITLE, walk: walk, evalSummary: evalSummary, gradeOf: gradeOf, D: D, clean: clean, fmtMoney: fmtMoney };
})(window);
