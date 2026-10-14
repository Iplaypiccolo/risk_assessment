/* 가까운 긴급 구호기관 찾기 (카카오맵 무료 API, 키워드 장소 검색) */
(function (g) {
  'use strict';
  var sdkP = null;
  var KINDS = {
    fire: { label: '119 안전센터', words: ['119안전센터', '소방서'], ok: function (p) { return /119|소방/.test(p.place_name); } },
    hospital: { label: '병원', words: ['응급실', '종합병원', '병원'], ok: function (p) { return /병원|의료원|응급/.test(p.place_name + p.category_name) && !/동물|한의원|치과/.test(p.place_name + p.category_name); } },
    police: { label: '경찰서', words: ['경찰서'], ok: function (p) { return /경찰서$/.test(p.place_name.trim()); } },
    patrol: { label: '고속도로 순찰대', words: ['고속도로순찰대', '고속도로 순찰대'], ok: function (p) { return /순찰대/.test(p.place_name); } }
  };

  function key() { return (g.APP_CONFIG && g.APP_CONFIG.kakaoJsKey || '').trim(); }
  function load() {
    if (!key()) return Promise.reject(new Error('NO_KEY'));
    if (sdkP) return sdkP;
    sdkP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(key()) + '&libraries=services&autoload=false';
      s.onload = function () { try { g.kakao.maps.load(function () { res(g.kakao); }); } catch (e) { rej(e); } };
      s.onerror = function () { sdkP = null; rej(new Error('SDK_LOAD')); };
      document.head.appendChild(s);
    });
    return sdkP;
  }
  function kw(k, ps, word, opt) {
    return new Promise(function (res) {
      ps.keywordSearch(word, function (data, status) { res(status === k.maps.services.Status.OK ? data : []); }, opt || {});
    });
  }
  function base(k, ps, branch, address) {
    var tries = [];
    if (branch) {
      var b = String(branch).replace(/지사$/, '');
      tries.push(function () { return kw(k, ps, '한국도로공사 ' + b + '지사').then(function (d) { return d.filter(function (p) { return /지사/.test(p.place_name); })[0] || null; }); });
    }
    if (address) {
      tries.push(function () {
        return new Promise(function (res) {
          new k.maps.services.Geocoder().addressSearch(address, function (d, st) {
            res(st === k.maps.services.Status.OK && d[0] ? { place_name: address, x: d[0].x, y: d[0].y } : null);
          });
        });
      });
    }
    var i = 0;
    function next() { if (i >= tries.length) return Promise.resolve(null); return tries[i++]().then(function (r) { return r || next(); }); }
    return next();
  }
  function fmtDist(m) { m = +m || 0; return m >= 1000 ? (Math.round(m / 100) / 10) + 'km' : m + 'm'; }

  var Near = {
    KINDS: KINDS,
    hasKey: function () { return !!key(); },
    /* 결과: { base: {name}, fire: [{name, phone, dist}], ... } */
    find: function (branch, address) {
      return load().then(function (k) {
        var ps = new k.maps.services.Places();
        return base(k, ps, branch, address).then(function (b) {
          if (!b) throw new Error('NO_BASE');
          var loc = new k.maps.LatLng(+b.y, +b.x);
          var opt = { location: loc, radius: 20000, sort: k.maps.services.SortBy.DISTANCE };
          var out = { base: { name: b.place_name } };
          return Promise.all(Object.keys(KINDS).map(function (kind) {
            var K = KINDS[kind], words = K.words.slice(), found = [];
            function nextWord() {
              if (!words.length || found.length >= 3) return Promise.resolve();
              return kw(k, ps, words.shift(), opt).then(function (d) {
                d.filter(K.ok).forEach(function (p) {
                  if (found.length < 3 && !found.some(function (f) { return f.name === p.place_name; }))
                    found.push({ name: p.place_name, phone: p.phone || '', dist: fmtDist(p.distance) });
                });
                return nextWord();
              });
            }
            return nextWord().then(function () { out[kind] = found; });
          })).then(function () { return out; });
        });
      });
    },
    /* 키가 없을 때: 카카오맵 검색 페이지 링크 (무료, 키 필요 없음) */
    mapLink: function (kind, branch, address) {
      var area = '';
      if (address) { var t = String(address).split(/\s+/); area = t.slice(0, 2).join(' '); }
      else if (branch) area = String(branch).replace(/지사$/, '');
      return 'https://map.kakao.com/link/search/' + encodeURIComponent((area ? area + ' ' : '') + KINDS[kind].words[0]);
    }
  };
  g.Near = Near;
})(window);
