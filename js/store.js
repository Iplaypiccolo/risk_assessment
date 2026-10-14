/* 이 기기의 브라우저 안에만 저장합니다 (IndexedDB). 어디에도 전송되지 않습니다. */
(function (g) {
  'use strict';
  var DB_NAME = 'riskAssessDB', STORE = 'companies', dbp = null, memory = {};

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      try {
        var rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore(STORE, { keyPath: 'id' }); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      if (!db) return fn(null);
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, mode), st = t.objectStore(STORE), out;
        var r = fn(st);
        if (r && 'onsuccess' in r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }
  var Store = {
    all: function () {
      return tx('readonly', function (st) { return st ? st.getAll() : null; }).then(function (r) {
        if (!r) r = Object.keys(memory).map(function (k) { return memory[k]; });
        return r.filter(function (c) { return String(c.id).indexOf('__') !== 0; }).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      });
    },
    get: function (id) { return tx('readonly', function (st) { return st ? st.get(id) : null; }).then(function (r) { return r || memory[id] || null; }); },
    put: function (c) { c.updatedAt = Date.now(); memory[c.id] = c; return tx('readwrite', function (st) { return st ? st.put(c) : null; }); },
    del: function (id) { delete memory[id]; return tx('readwrite', function (st) { return st ? st.delete(id) : null; }); }
  };
  var Settings = {
    get: function (k, d) { try { var v = localStorage.getItem('ra_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ra_' + k, JSON.stringify(v)); } catch (e) { /* 무시 */ } }
  };
  g.Store = Store; g.Settings = Settings;
})(window);
