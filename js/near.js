/* 가까운 긴급 구호기관 찾기 (카카오맵 무료 API: 지도 + 키워드 장소 검색)
 * 기준 위치: 'gps' = 휴대폰의 지금 위치, 'base' = 일하는 지사(없으면 사업장 주소) */
(function (g) {
  'use strict';
  var sdkP = null;
  var KINDS = {
    fire: { label: '119 안전센터', color: '#c42b2b', words: ['119안전센터', '소방서'], ok: function (p) { return /119|소방/.test(p.place_name); } },
    /* 병원은 카카오 「병원」 분류(HP8)에서만 찾음 → 「응급실 ○○떡볶이」 같은 음식점이 안 나옴 */
    hospital: { label: '병원', color: '#0e7a55', words: ['응급실', '종합병원', '병원'], cat: 'HP8',
      ok: function (p) { return p.category_group_code === 'HP8' && /병원|의료원/.test(p.place_name) && !/동물|한의원|치과|요양|한방|정신/.test(p.place_name + p.category_name); } },
    /* 경찰서뿐 아니라 지구대·파출소·치안센터도 (카카오맵에서 「경찰서」로 찾으면 나오는 곳들). 고속도로 순찰대는 따로 */
    police: { label: '경찰서·지구대·파출소', color: '#1f5f8f', words: ['경찰서', '지구대', '파출소', '치안센터'], all: true,
      ok: function (p) {
        var n = p.place_name.trim(), c = p.category_name || '';
        if (/순찰대/.test(n)) return false;
        return /(경찰서|지구대|파출소|치안센터)$/.test(n) || (/경찰서/.test(c) && /(경찰|지구대|파출소|치안센터)/.test(n));
      } },
    patrol: { label: '고속도로 순찰대', color: '#b26a00', words: ['고속도로순찰대', '고속도로 순찰대'], ok: function (p) { return /순찰대/.test(p.place_name); } }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function key() { return (g.APP_CONFIG && g.APP_CONFIG.kakaoJsKey || '').trim(); }
  function load() {
    if (!key()) return Promise.reject(new Error('NO_KEY'));
    if (sdkP) return sdkP;
    sdkP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(key()) + '&libraries=services&autoload=false';
      s.onload = function () { try { g.kakao.maps.load(function () { res(g.kakao); }); } catch (e) { sdkP = null; rej(new Error('SDK_LOAD')); } };
      s.onerror = function () { sdkP = null; rej(new Error('SDK_LOAD')); };
      document.head.appendChild(s);
    });
    return sdkP;
  }
  /* 음식점·카페·편의점·주차장 등은 어느 기관을 찾든 빼기 */
  var NOT_AGENCY = /^(FD6|CE7|CS2|PK6|OL7|AD5|AT4|CT1|AC5|MT1|BK9|SW8|PS3|SC4|AG2|PM9)$/;
  function notShop(p) { return !NOT_AGENCY.test(p.category_group_code || '') && !/^(음식점|카페|가정,생활|쇼핑)/.test(p.category_name || ''); }
  function kw(k, ps, word, opt) {
    return new Promise(function (res) {
      ps.keywordSearch(word, function (data, status) { res(status === k.maps.services.Status.OK ? data : []); }, opt || {});
    });
  }
  function fmtDist(m) { m = +m || 0; return m >= 1000 ? (Math.round(m / 100) / 10) + 'km' : m + 'm'; }

  /* 휴대폰 위치 */
  function gps() {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) return rej(new Error('NO_GPS'));
      navigator.geolocation.getCurrentPosition(function (p) { res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy || 0), label: '지금 내 위치' }); },
        function (e) { rej(new Error(e && e.code === 1 ? 'GPS_DENIED' : 'NO_GPS')); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }
  /* 지사 → 주소 순서로 위치 찾기 */
  function basePoint(k, branch, address) {
    var ps = new k.maps.services.Places();
    var tries = [];
    if (branch) {
      var b = String(branch).replace(/지사$/, '');
      tries.push(function () { return kw(k, ps, '한국도로공사 ' + b + '지사').then(function (d) { var p = d.filter(function (x) { return /지사/.test(x.place_name); })[0]; return p ? { lat: +p.y, lng: +p.x, label: p.place_name } : null; }); });
    }
    if (address) {
      tries.push(function () {
        return new Promise(function (res) {
          new k.maps.services.Geocoder().addressSearch(address, function (d, st) {
            res(st === k.maps.services.Status.OK && d[0] ? { lat: +d[0].y, lng: +d[0].x, label: address } : null);
          });
        });
      });
    }
    var i = 0;
    function next() { if (i >= tries.length) return Promise.resolve(null); return tries[i++]().then(function (r) { return r || next(); }); }
    return next().then(function (r) { if (!r) throw new Error('NO_BASE'); return r; });
  }
  /* 두 점 사이 거리 (m) */
  function distM(a, b) {
    var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  var ROUGH_M = 5000, FAR_M = 60000, WIDE_M = 50000;
  /* 「내 위치」가 믿을 만한지 확인:
   * - 오차가 5km보다 크면 GPS가 아니라 인터넷 회선 위치 → GPS_ROUGH
   * - 지사에서 60km보다 멀면 회사 인터넷(본사 등) 위치가 잡힌 것 → GPS_FAR
   * opt.loc 이 있으면 그 위치를 확인 없이 그대로 씀 */
  function locate(mode, branch, address, opt) {
    opt = opt || {};
    return load().then(function (k) {
      if (mode !== 'gps') return basePoint(k, branch, address);
      if (opt.loc) return opt.loc;   // 「그래도 이 위치로」: 방금 잡은 위치를 그대로 씀
      return gps().then(function (me) {
        var err = function (code, extra) { var e = new Error(code); Object.assign(e, { loc: me }, extra || {}); return e; };
        if (me.acc > ROUGH_M) throw err('GPS_ROUGH', { km: Math.round(me.acc / 1000) });
        if (!branch && !address) return me;
        return basePoint(k, branch, address).then(function (b) {
          var d = distM(me, b);
          if (d > FAR_M) throw err('GPS_FAR', { km: Math.round(d / 1000), base: b });
          return me;
        }, function () { return me; });
      });
    });
  }
  /* 한 종류의 기관을 가까운 순서로 (최대 n곳) */
  function search(kind, loc, n) {
    return load().then(function (k) {
      var ps = new k.maps.services.Places(), K = KINDS[kind], words = K.words.slice(), found = [];
      var center = new k.maps.LatLng(loc.lat, loc.lng);
      /* 1차: 20km 안 (카카오 검색 반경 최대값) → 하나도 없으면 2차: 반경 없이 가까운 순으로 찾아 50km 안만 */
      function pass(opt, maxM) {
        var ws = K.words.slice();
        function nextWord() {
          if (!ws.length || (!K.all && found.length >= n)) return Promise.resolve();   // all: 모든 낱말로 찾아 가까운 순으로
          return kw(k, ps, ws.shift(), K.cat ? Object.assign({ category_group_code: K.cat }, opt) : opt).then(function (d) {
            d.filter(notShop).filter(K.ok).forEach(function (p) {
              var m = +p.distance || 0;
              if (maxM && m > maxM) return;
              if ((K.all || found.length < n) && !found.some(function (f) { return f.name === p.place_name; }))
                found.push({ name: p.place_name, phone: p.phone || '', dist: fmtDist(m), meters: m, lat: +p.y, lng: +p.x });
            });
            return nextWord();
          });
        }
        return nextWord();
      }
      var wide = false;
      return pass({ location: center, radius: 20000, sort: k.maps.services.SortBy.DISTANCE }).then(function () {
        if (found.length) return;
        wide = true;
        return pass({ location: center, sort: k.maps.services.SortBy.DISTANCE }, WIDE_M);
      }).then(function () {
        found.sort(function (a, b) { return a.meters - b.meters; });
        found = found.slice(0, n);
        found.wide = wide;
        return found;
      });
    });
  }

  /* ---------- 지도에서 고르기 (화면 위에 크게 띄움) ---------- */
  function picker(kind, ctx) {
    return new Promise(function (resolve) {
      var K = KINDS[kind], mode = ctx.mode || 'gps', list = [], sel = -1, map = null, overlays = [], me = null;
      var modal = document.getElementById('modal');
      modal.innerHTML =
        '<div class="mp">' +
        '<div class="mp-head"><b>가까운 ' + esc(K.label) + ' 고르기</b><button class="btn btn-sm btn-ghost" id="mpClose">닫기</button></div>' +
        '<div class="seg mp-seg" role="group" aria-label="기준 위치"><button data-m="gps">📍 내 위치 근처</button><button data-m="base">🏢 지사 근처</button></div>' +
        '<div class="mp-map" id="mpMap"><div class="mp-msg" id="mpMsg">지도를 불러오는 중…</div></div>' +
        '<div class="mp-sheet" id="mpSheet"></div>' +
        '</div>';
      modal.hidden = false; document.body.classList.add('noscroll');
      var $map = document.getElementById('mpMap'), $msg = document.getElementById('mpMsg'), $sheet = document.getElementById('mpSheet');
      function close(v) { modal.hidden = true; modal.innerHTML = ''; document.body.classList.remove('noscroll'); resolve(v); }
      document.getElementById('mpClose').onclick = function () { close(null); };
      Array.prototype.forEach.call(modal.querySelectorAll('.mp-seg button'), function (b) {
        b.onclick = function () { if (mode !== b.dataset.m) { mode = b.dataset.m; run(); } };
      });
      function segState() { Array.prototype.forEach.call(modal.querySelectorAll('.mp-seg button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === mode)); }); }
      function msg(t) { $msg.textContent = t; $msg.hidden = !t; }
      function sheet() {
        if (!list.length) { $sheet.innerHTML = '<p class="mp-empty">근처 50km 안에서 찾지 못했어요.<br>「지사 근처」로 바꿔 보거나 직접 적어 주세요.</p>'; return; }
        var h = list.wide ? '<p class="mp-wide">20km 안에 없어서 50km까지 넓혀 찾았어요.</p>' : '';
        if (sel >= 0) {
          var p = list[sel];
          h += '<div class="mp-pick"><div class="mp-name"><span class="mp-no" style="background:' + K.color + '">' + (sel + 1) + '</span>' + esc(p.name) + '</div>' +
            '<div class="mp-info">' + (p.phone ? '☎ ' + esc(p.phone) : '전화번호 없음 — 선택한 뒤 직접 적어 주세요') + ' · ' + esc(p.dist) + '</div>' +
            '<button class="btn btn-primary btn-big" id="mpOk">이 기관으로 선택하기</button></div>';
        } else {
          h += '<p class="mp-tip">지도의 번호나 아래 목록을 눌러 고르세요.</p>';
        }
        h += '<div class="mp-list">' + list.map(function (p, i) {
          return '<button class="mp-item' + (i === sel ? ' on' : '') + '" data-i="' + i + '"><span class="mp-no" style="background:' + K.color + '">' + (i + 1) + '</span><span class="mp-t"><b>' + esc(p.name) + '</b><small>' + esc(p.phone || '전화번호 없음') + ' · ' + esc(p.dist) + '</small></span></button>';
        }).join('') + '</div>';
        $sheet.innerHTML = h;
        var ok = document.getElementById('mpOk');
        if (ok) ok.onclick = function () { var p = list[sel]; close({ name: p.name, phone: p.phone }); };
        Array.prototype.forEach.call($sheet.querySelectorAll('.mp-item'), function (b) { b.onclick = function () { choose(+b.dataset.i, true); }; });
      }
      function choose(i, pan) {
        sel = i;
        overlays.forEach(function (o, j) { var el = o.__el; if (el) el.classList.toggle('on', j === i); o.setZIndex(j === i ? 10 : 1); });
        if (pan && map) map.panTo(new g.kakao.maps.LatLng(list[i].lat, list[i].lng));
        sheet();
        $sheet.scrollTop = 0;
      }
      function draw(k, loc) {
        if (!map) {
          map = new k.maps.Map($map, { center: new k.maps.LatLng(loc.lat, loc.lng), level: 6 });
          map.addControl(new k.maps.ZoomControl(), k.maps.ControlPosition.RIGHT);
        }
        overlays.forEach(function (o) { o.setMap(null); }); overlays = [];
        if (me) me.setMap(null);
        var meEl = document.createElement('div'); meEl.className = 'mp-me'; meEl.innerHTML = '<i></i><span>' + esc(mode === 'gps' ? '내 위치' : '지사') + '</span>';
        me = new k.maps.CustomOverlay({ position: new k.maps.LatLng(loc.lat, loc.lng), content: meEl, yAnchor: 0.5, zIndex: 5 }); me.setMap(map);
        var bounds = new k.maps.LatLngBounds(); bounds.extend(new k.maps.LatLng(loc.lat, loc.lng));
        list.forEach(function (p, i) {
          var el = document.createElement('button'); el.type = 'button'; el.className = 'mp-pin'; el.style.background = K.color; el.innerHTML = '<span>' + (i + 1) + '</span>';
          el.setAttribute('aria-label', (i + 1) + '번 ' + p.name);
          el.onclick = function (e) { e.stopPropagation(); choose(i, false); };
          var ov = new k.maps.CustomOverlay({ position: new k.maps.LatLng(p.lat, p.lng), content: el, yAnchor: 1, zIndex: 1, clickable: true });
          ov.__el = el; ov.setMap(map); overlays.push(ov);
          bounds.extend(new k.maps.LatLng(p.lat, p.lng));
        });
        map.relayout();
        if (list.length) map.setBounds(bounds, 40, 30, 40, 30); else map.setCenter(new k.maps.LatLng(loc.lat, loc.lng));
      }
      var runId = 0;
      function run(useLoc) {
        var my = ++runId; segState(); sel = -1; list = []; $sheet.innerHTML = ''; msg(mode === 'gps' ? '내 위치를 확인하는 중… (위치 사용을 허락해 주세요)' : '지사 위치를 찾는 중…');
        load().then(function (k) {
          return locate(mode, ctx.branch, ctx.address, { loc: useLoc }).then(function (loc) {
            if (my !== runId) return;
            msg('가까운 ' + K.label + '을(를) 찾는 중…');
            return search(kind, loc, 10).then(function (r) {
              if (my !== runId) return;
              list = r; msg(''); draw(k, loc); sheet();
              if (list.length) choose(0, false);
            });
          });
        }).catch(function (e) {
          if (my !== runId) return;
          var m = e && e.message;
          if (m === 'GPS_DENIED') { msg('위치 사용이 허락되지 않았어요. 「지사 근처」로 찾아 볼게요.'); mode = 'base'; setTimeout(run, 1200); return; }
          if (m === 'NO_GPS') { msg('내 위치를 알 수 없어요. 「지사 근처」로 찾아 볼게요.'); mode = 'base'; setTimeout(run, 1200); return; }
          if (m === 'GPS_ROUGH' || m === 'GPS_FAR') {
            msg('');
            $sheet.innerHTML = '<div class="mp-warn"><b>내 위치가 정확하지 않아요</b><p>' + esc(roughText(e)) + '</p>' +
              ((ctx.branch || ctx.address) ? '<button class="btn btn-primary btn-big" id="mpBase">🏢 지사 근처로 찾기</button>' : '<p>「기본 정보」에 지사 이름을 적으면 지사 근처로 찾을 수 있어요.</p>') +
              '<button class="btn btn-ghost" id="mpForce">그래도 이 위치로 찾기</button></div>';
            var bb = document.getElementById('mpBase'); if (bb) bb.onclick = function () { mode = 'base'; run(); };
            document.getElementById('mpForce').onclick = function () { run(e.loc); };
            return;
          }
          if (m === 'NO_BASE') { msg('지사나 주소 위치를 찾지 못했어요. 「기본 정보」의 지사 이름이나 주소를 확인해 주세요.'); return; }
          msg('지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
        });
      }
      run();
    });
  }

  /* 위치가 이상할 때 보여 줄 설명 */
  function roughText(e) {
    if (e.message === 'GPS_ROUGH') return '이 기기의 위치 오차가 약 ' + e.km + 'km입니다. GPS가 없는 컴퓨터나 회사 인터넷에서는 인터넷 회선이 있는 곳(예: 본사)이 내 위치로 잡힐 수 있어요.';
    return '잡힌 위치가 지사에서 약 ' + e.km + 'km 떨어져 있어요. 회사 인터넷에 연결되어 있으면 본사 등 다른 곳이 내 위치로 잡힐 수 있어요. 휴대폰의 위치(GPS)를 켜고 다시 해 보거나 「지사 근처」로 찾으세요.';
  }
  var Near = {
    KINDS: KINDS,
    roughText: roughText,
    hasKey: function () { return !!key(); },
    /* 네 종류 모두 가장 가까운 곳 찾기: { base: {name}, fire: [...], ... } */
    find: function (mode, branch, address, opt) {
      return locate(mode, branch, address, opt).then(function (loc) {
        var out = { base: { name: loc.label + (loc.acc ? ' (오차 약 ' + fmtDist(loc.acc) + ')' : '') } };
        return Promise.all(Object.keys(KINDS).map(function (kind) {
          return search(kind, loc, 3).then(function (r) { out[kind] = r; });
        })).then(function () { return out; });
      });
    },
    pick: picker,
    /* 키가 없을 때: 카카오맵 검색 페이지 링크 */
    mapLink: function (kind, branch, address) {
      var area = '';
      if (address) { var t = String(address).split(/\s+/); area = t.slice(0, 2).join(' '); }
      else if (branch) area = String(branch).replace(/지사$/, '');
      return 'https://map.kakao.com/link/search/' + encodeURIComponent((area ? area + ' ' : '') + KINDS[kind].words[0]);
    }
  };
  g.Near = Near;
})(window);
