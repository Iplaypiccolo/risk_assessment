/* 사진 자동 맞춤 + 자르기 편집기 */
(function (g) {
  'use strict';
  var MAX = 1600; // 원본 보관 크기(긴 변)

  function loadImage(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
  }
  /* 파일 → 크기를 줄인 원본(dataURL). 휴대폰 사진의 회전 정보는 브라우저가 반영합니다. */
  function normalize(file) {
    var make = function (src, w, h) {
      var s = Math.min(1, MAX / Math.max(w, h));
      var cv = document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.drawImage(src, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.85);
    };
    if (g.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bm) { var d = make(bm, bm.width, bm.height); if (bm.close) bm.close(); return d; })
        .catch(function () { return viaImg(); });
    }
    return viaImg();
    function viaImg() {
      return new Promise(function (res, rej) {
        var url = URL.createObjectURL(file);
        loadImage(url).then(function (im) { var d = make(im, im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(url); res(d); }).catch(rej);
      });
    }
  }
  function cropTo(im, aspect, rect) {
    var outW = aspect >= 1.5 ? 1600 : 1200, outH = Math.round(outW / aspect);
    var cv = document.createElement('canvas'); cv.width = outW; cv.height = outH;
    var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, outW, outH);
    cx.drawImage(im, rect.x, rect.y, rect.w, rect.h, 0, 0, outW, outH);
    return cv.toDataURL('image/jpeg', 0.85);
  }
  function centerRect(w, h, aspect) {
    if (w / h > aspect) { var cw = h * aspect; return { x: (w - cw) / 2, y: 0, w: cw, h: h }; }
    var ch = w / aspect; return { x: 0, y: (h - ch) / 2, w: w, h: ch };
  }

  /* 편집 화면: 틀(경계선) 안에 들어갈 부분을 손가락/버튼으로 맞춤 */
  function editor(im, aspect, message) {
    return new Promise(function (resolve) {
      var modal = document.getElementById('modal');
      modal.innerHTML =
        '<div class="crop">' +
        '<div class="crop-msg">' + message + '</div>' +
        '<div class="crop-stage" id="cropStage"><canvas id="cropCv"></canvas></div>' +
        '<div class="crop-zoom"><button class="btn btn-ghost" id="zOut">－ 작게</button><button class="btn btn-ghost" id="zIn">＋ 크게</button></div>' +
        '<div class="crop-actions"><button class="btn btn-ghost" id="cCancel">취소</button><button class="btn btn-primary" id="cOk">이대로 넣기</button></div>' +
        '</div>';
      modal.hidden = false; document.body.classList.add('noscroll');
      var stage = document.getElementById('cropStage'), cv = document.getElementById('cropCv'), cx = cv.getContext('2d');
      var W, H, fx, fy, fw, fh, scale, minScale, ox, oy, dpr = Math.min(2, g.devicePixelRatio || 1);
      function layout() {
        W = stage.clientWidth; H = stage.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
        var pad = 18;
        fw = W - pad * 2; fh = fw / aspect;
        if (fh > H - pad * 2) { fh = H - pad * 2; fw = fh * aspect; }
        fx = (W - fw) / 2; fy = (H - fh) / 2;
        minScale = Math.max(fw / im.naturalWidth, fh / im.naturalHeight);
        if (!scale) { scale = minScale; ox = fx + (fw - im.naturalWidth * scale) / 2; oy = fy + (fh - im.naturalHeight * scale) / 2; }
        clamp(); draw();
      }
      function clamp() {
        if (scale < minScale) scale = minScale;
        if (scale > minScale * 5) scale = minScale * 5;
        var iw = im.naturalWidth * scale, ih = im.naturalHeight * scale;
        if (ox > fx) ox = fx; if (oy > fy) oy = fy;
        if (ox + iw < fx + fw) ox = fx + fw - iw; if (oy + ih < fy + fh) oy = fy + fh - ih;
      }
      function draw() {
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx.fillStyle = '#222'; cx.fillRect(0, 0, W, H);
        cx.drawImage(im, ox, oy, im.naturalWidth * scale, im.naturalHeight * scale);
        cx.fillStyle = 'rgba(0,0,0,0.6)';
        cx.fillRect(0, 0, W, fy); cx.fillRect(0, fy + fh, W, H - fy - fh); cx.fillRect(0, fy, fx, fh); cx.fillRect(fx + fw, fy, W - fx - fw, fh);
        cx.strokeStyle = '#FFD400'; cx.lineWidth = 3; cx.setLineDash([]); cx.strokeRect(fx, fy, fw, fh);
        cx.strokeStyle = 'rgba(255,255,255,0.5)'; cx.lineWidth = 1;
        for (var i = 1; i < 3; i++) { cx.beginPath(); cx.moveTo(fx + fw * i / 3, fy); cx.lineTo(fx + fw * i / 3, fy + fh); cx.stroke(); cx.beginPath(); cx.moveTo(fx, fy + fh * i / 3); cx.lineTo(fx + fw, fy + fh * i / 3); cx.stroke(); }
      }
      function zoom(f, cxp, cyp) {
        cxp = cxp == null ? fx + fw / 2 : cxp; cyp = cyp == null ? fy + fh / 2 : cyp;
        var ns = Math.max(minScale, Math.min(minScale * 5, scale * f)); var k = ns / scale;
        ox = cxp - (cxp - ox) * k; oy = cyp - (cyp - oy) * k; scale = ns; clamp(); draw();
      }
      var pts = {}, last = null;
      cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = null; });
      cv.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        var prev = pts[e.pointerId]; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length === 1) { ox += e.clientX - prev.x; oy += e.clientY - prev.y; clamp(); draw(); }
        else if (ids.length >= 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
          var r = cv.getBoundingClientRect();
          if (last) zoom(d / last, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
          last = d;
        }
      });
      var up = function (e) { delete pts[e.pointerId]; last = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
      document.getElementById('zIn').onclick = function () { zoom(1.2); };
      document.getElementById('zOut').onclick = function () { zoom(1 / 1.2); };
      function close(v) { modal.hidden = true; modal.innerHTML = ''; document.body.classList.remove('noscroll'); g.removeEventListener('resize', onR); resolve(v); }
      document.getElementById('cCancel').onclick = function () { close(null); };
      document.getElementById('cOk').onclick = function () {
        var rect = { x: (fx - ox) / scale, y: (fy - oy) / scale, w: fw / scale, h: fh / scale };
        close(cropTo(im, aspect, rect));
      };
      var onR = function () { var keep = { s: scale / minScale }; layout(); };
      g.addEventListener('resize', onR);
      requestAnimationFrame(layout);
    });
  }

  var Photo = {
    /* 새 사진: 비율이 거의 같으면 자동으로 맞추고, 다르면 편집 화면을 띄움 */
    fromFile: function (file, aspect) {
      return normalize(file).then(function (orig) {
        return loadImage(orig).then(function (im) {
          var r = (im.naturalWidth / im.naturalHeight) / aspect;
          if (Math.abs(r - 1) <= 0.04) return { orig: orig, crop: cropTo(im, aspect, centerRect(im.naturalWidth, im.naturalHeight, aspect)) };
          return editor(im, aspect, '사진 모양이 칸과 달라요.<br><b>노란 선 안</b>에 보일 부분을 손가락으로 움직여 맞춘 뒤<br>「이대로 넣기」를 누르세요.').then(function (crop) {
            return crop ? { orig: orig, crop: crop } : null;
          });
        });
      });
    },
    recrop: function (orig, aspect) {
      return loadImage(orig).then(function (im) { return editor(im, aspect, '<b>노란 선 안</b>에 보일 부분을 손가락으로 움직여 맞춘 뒤<br>「이대로 넣기」를 누르세요.'); });
    }
  };
  g.Photo = Photo;
})(window);
