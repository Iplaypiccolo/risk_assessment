/* 설문 정의, 점수 계산, 날짜·문자 처리 등 공통 기능 */
(function (g) {
  'use strict';

  /* ---------- 설문 ----------
   * 각 질문: id, item(평가표 항목), text, help, O/X: 다음 질문 id 또는 {score:n} / {exclude:true}
   * U: '모르겠어요' 버튼 (원본에 해당 조항이 있는 곳만)
   */
  var Q = {
    /* 작업 정보 (17쪽 기타 안전보건상 정보) */
    i_sub: { item: 'info', text: '이번 제설 일을 다른 회사와 함께 하나요?', help: '다른 회사에 일을 나눠 맡기거나, 다른 회사 사람들과 같은 곳에서 함께 일하면 ⭕', O: {}, X: {} },
    i_permit: { item: 'info', text: '용접처럼 불꽃이 튀는 일이나, 탱크 안처럼 좁고 막힌 곳에 들어가는 일이 있나요?', O: {}, X: {} },
    i_checkup: { item: 'info', text: '근로자가 최근에 건강검진을 받았나요?', O: {}, X: {} },

    /* 1. 안전보건 경영방침 */
    q1: { item: 'q1', text: '사장님이 근로자에게 "우리 회사는 안전이 먼저다"라고 약속하셨나요?', help: '이 보고서 4쪽에 그 약속(안전보건방침)이 들어 있어요. 출력해서 사장님이 서명하시면 됩니다.', O: 'q1b', X: { score: 3 } },
    q1b: { item: 'q1', text: '"올해는 다치는 사람 없이 일하자" 같은 안전 목표가 있나요?', O: { score: 10 }, X: { score: 6 } },
    /* 2-1. 안전 전문인력 */
    q2a: { item: 'q2a', text: '회사에 안전 자격증이 있는 사람이 있나요?', help: '예) 산업안전기사, 건설안전기사 같은 자격증. 안전 관련 학과를 졸업한 사람도 ⭕', O: 'q2a2', X: { score: 2 } },
    q2a2: { item: 'q2a', text: '안전 일만 따로 맡아서 하는 사람이나 부서가 있나요?', O: { score: 5 }, X: { score: 3 } },
    /* 2-2. 안전 예산 */
    q2b: { item: 'q2b', text: '이번 일을 하면서 안전을 위해 돈을 쓰나요?', help: '예) 안전모·안전화 구입, 방한복, 손난로, 후방카메라', O: 'q2b2', X: { score: 2 } },
    q2b2: { item: 'q2b', type: 'budget', text: '어디에 얼마를 쓰는지 적어 주세요', help: '단위는 만원입니다. 모르는 칸은 비워 두세요.', B: { score: 5 }, N: { score: 3 } },
    /* 3. 종사자 의견 */
    q3: { item: 'q3', text: '근로자가 "이건 위험해요"라고 말할 수 있는 자리가 있나요?', help: '예) 일 시작 전에 모여서 하는 짧은 회의(TBM), 사장님과의 면담', O: { score: 5 }, X: { score: 2 } },
    /* 4. 위험작업 관리계획 */
    q4: { item: 'q4', text: '어떤 일이 특히 위험한지 알고 계신가요?', help: '예) 좁은 창고에서 여러 장비가 같이 움직이는 일, 눈 올 때 고속도로에서 염화칼슘 뿌리는 일', O: 'q4b', X: { score: 3 } },
    q4b: { item: 'q4', text: '그런 위험한 일을 할 때 지킬 것(신호수 두기, 미리 교육하기 등)을 정해 두셨나요?', O: { score: 10 }, X: { score: 6 } },
    /* 5. 개인보호구 */
    q5: { item: 'q5', text: '근로자에게 안전모, 안전화, 안전조끼를 나눠 주나요?', O: 'q5b', X: { score: 3 } },
    q5b: { item: 'q5', text: '일 시작 전에 안전모·안전화를 제대로 썼는지 확인하나요?', O: { score: 10 }, X: { score: 6 } },
    /* 6. 안전점검 */
    q6: { item: 'q6', text: '일 시작 전에 장비와 작업장을 둘러보며 점검하나요?', O: 'q6b', X: { score: 3 } },
    q6b: { item: 'q6', text: '무엇을 점검할지 정해져 있나요?', help: '예) 브레이크, 후방카메라, 살포기가 단단히 붙어 있는지', O: { score: 10 }, X: { score: 6 } },
    /* 7. 교육 */
    q7: { item: 'q7', text: '근로자를 새로 뽑았을 때 안전교육을 했나요?', help: '처음 일을 시작할 때 하는 교육(8시간)이에요. 하루씩 일하는 일용직만 있으면 ⭕', O: 'q7b', X: { score: 3 } },
    q7b: { item: 'q7', text: '매일 일 시작 전에 짧게 안전 이야기를 하나요?', help: '「TBM」이라고도 해요.', O: { score: 10 }, X: { score: 6 } },
    /* 8. 연락체계 */
    q8: { item: 'q8', text: '도로공사 담당자와 서로 전화번호를 알고 연락할 수 있나요?', O: { score: 5 }, X: { score: 2 } },
    /* 9. 비상대책 */
    q9: { item: 'q9', text: '사고가 나면 누구에게 먼저 전화하고 어디로 피할지 정해져 있나요?', O: { score: 10 }, X: { score: 3 } },
    /* 10. 산업재해 */
    q10: { item: 'q10', text: '회사를 차린 지 1년이 넘었나요?', O: 'q10b', X: { exclude: true } },
    q10b: { item: 'q10', text: '최근 3년 동안 일하다 다친 사람이 있었나요?', O: 'q10n', X: { score: 20 } },
    q10n: { item: 'q10', type: 'count', text: '몇 번, 몇 명이었나요?', help: '숫자는 ＋ / － 버튼으로 바꾸세요.', next: 'q10d', deadScore: 6 },
    q10d: { item: 'q10', text: '같은 일을 하는 다른 회사들보다 사고가 적었나요?', help: '안전보건공단에서 받는 「산업재해율 확인서」에 나와 있어요. 모르시면 「모르겠어요」를 누르세요.', O: 'q10e', X: { score: 6 }, U: { score: 12 } },
    q10e: { item: 'q10', text: '사고가 해마다 줄고 있나요?', O: { score: 20 }, X: { score: 12 } },
    /* 날짜 */
    q_dates: { item: 'dates', text: '교육과 현장 점검을 모두 보고서 작성일({WD})에 하셨나요?', help: '날짜가 다르면 ❌를 누르고 날짜를 고르세요.', O: {}, X: 'q_dates2' },
    q_dates2: { item: 'dates', type: 'dates', text: '날짜를 골라 주세요', next: null }
  };
  var ROOTS = ['q1', 'q2a', 'q2b', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'i_sub', 'i_permit', 'i_checkup', 'q_dates'];
  var ITEM_TITLE = {
    info: '작업', q1: '안전 약속', q2a: '안전 담당자', q2b: '안전에 쓰는 돈', q3: '근로자 의견', q4: '위험한 일',
    q5: '안전모·안전화', q6: '점검', q7: '안전교육', q8: '연락', q9: '사고 대비', q10: '사고 기록', dates: '날짜'
  };

  /* 답변을 따라가며 경로(물어본 질문 목록)와 결과를 계산 */
  function walk(answers, acc) {
    var path = [], results = {}, pending = null;
    for (var r = 0; r < ROOTS.length; r++) {
      var id = ROOTS[r];
      while (id) {
        var q = Q[id];
        path.push(id);
        var a = answers[id];
        if (!a) { pending = pending || id; id = null; break; }
        if (q.type === 'count') {
          if (q.deadScore && acc && acc.dead > 0) { results[q.item] = q.deadScore; id = null; break; }
          id = q.next; continue;
        }
        if (q.type === 'dates') { id = null; break; }
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
    var w = walk(c.answers || {}, c.accident);
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
