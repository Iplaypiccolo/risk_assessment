/* 첨부 그림 편집기: 돌리기 + 원하는 크기로 자르기 (틀의 모서리를 끌어서 조절) */
(function (g) {
  'use strict';
  var OUT_MAX = 2000;
  function loadImage(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }
  /* 돌린 그림을 캔버스로 */
  function rotated(im, rot) {
    var w = im.naturalWidth, h = im.naturalHeight, sw = rot % 180 ? h : w, sh = rot % 180 ? w : h;
    var cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, sw, sh);
    cx.translate(sw / 2, sh / 2); cx.rotate(rot * Math.PI / 180); cx.drawImage(im, -w / 2, -h / 2);
    return cv;
  }
  /* 파일 → 화면에 맞게 줄인 그림(dataURL). 휴대폰 사진의 방향은 브라우저가 맞춰 줌 */
  function fromFile(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      loadImage(url).then(function (im) {
        var s = Math.min(1, OUT_MAX / Math.max(im.naturalWidth, im.naturalHeight));
        var cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.88));
      }).catch(function (e) { URL.revokeObjectURL(url); rej(e); });
    });
  }

  function open(src, title) {
    return loadImage(src).then(function (im) {
      return new Promise(function (resolve) {
        var modal = document.getElementById('modal');
        modal.innerHTML = '<div class="crop ie">' +
          '<div class="crop-msg">' + (title || '그림 편집') + '<small>노란 틀의 모서리를 끌어서 남길 부분을 정하세요</small></div>' +
          '<div class="crop-stage" id="ieStage"><canvas id="ieCv"></canvas></div>' +
          '<div class="crop-zoom"><button class="btn btn-ghost" id="ieL">↺ 왼쪽으로</button><button class="btn btn-ghost" id="ieR">↻ 오른쪽으로</button><button class="btn btn-ghost" id="ieAll">⤢ 전체</button></div>' +
          '<div class="crop-actions"><button class="btn btn-ghost" id="ieCancel">취소</button><button class="btn btn-primary" id="ieOk">이대로 넣기</button></div></div>';
        modal.hidden = false; document.body.classList.add('noscroll');
        var stage = document.getElementById('ieStage'), cv = document.getElementById('ieCv'), cx = cv.getContext('2d');
        var dpr = Math.min(2, g.devicePixelRatio || 1), rot = 0, base = rotated(im, 0);
        var W, H, s, ox, oy, r;   // r: 자를 틀 (그림 좌표)
        function fit() {
          W = stage.clientWidth; H = stage.clientHeight;
          cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
          s = Math.min((W - 36) / base.width, (H - 36) / base.height);
          ox = (W - base.width * s) / 2; oy = (H - base.height * s) / 2;
          draw();
        }
        function all() { r = { x: 0, y: 0, w: base.width, h: base.height }; }
        function draw() {
          cx.setTransform(dpr, 0, 0, dpr, 0, 0);
          cx.fillStyle = '#222'; cx.fillRect(0, 0, W, H);
          cx.drawImage(base, ox, oy, base.width * s, base.height * s);
          var x = ox + r.x * s, y = oy + r.y * s, w = r.w * s, h = r.h * s;
          cx.fillStyle = 'rgba(0,0,0,0.55)';
          cx.fillRect(ox, oy, base.width * s, y - oy); cx.fillRect(ox, y + h, base.width * s, oy + base.height * s - y - h);
          cx.fillRect(ox, y, x - ox, h); cx.fillRect(x + w, y, ox + base.width * s - x - w, h);
          cx.strokeStyle = '#FFD400'; cx.lineWidth = 3; cx.strokeRect(x, y, w, h);
          cx.fillStyle = '#FFD400';
          [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (p) { cx.fillRect(p[0] - 9, p[1] - 9, 18, 18); });
        }
        var drag = null;
        function pos(e) { var b = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e; return { x: (t.clientX - b.left - ox) / s, y: (t.clientY - b.top - oy) / s }; }
        function down(e) {
          var p = pos(e), tol = 26 / s, hit = null;
          [['nw', r.x, r.y], ['ne', r.x + r.w, r.y], ['sw', r.x, r.y + r.h], ['se', r.x + r.w, r.y + r.h]].forEach(function (c) { if (!hit && Math.abs(p.x - c[1]) < tol && Math.abs(p.y - c[2]) < tol) hit = c[0]; });
          if (!hit && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) hit = 'move';
          if (!hit) return;
          drag = { k: hit, p: p, r: { x: r.x, y: r.y, w: r.w, h: r.h } }; e.preventDefault();
        }
        function move(e) {
          if (!drag) return; e.preventDefault();
          var p = pos(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y, o = drag.r, min = 40 / s;
          var x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
          if (drag.k === 'move') { x1 += dx; x2 += dx; y1 += dy; y2 += dy; var mx = x1 < 0 ? -x1 : x2 > base.width ? base.width - x2 : 0, my = y1 < 0 ? -y1 : y2 > base.height ? base.height - y2 : 0; x1 += mx; x2 += mx; y1 += my; y2 += my; }
          else {
            if (drag.k[1] === 'w') x1 = Math.max(0, Math.min(x2 - min, o.x + dx)); else x2 = Math.min(base.width, Math.max(x1 + min, o.x + o.w + dx));
            if (drag.k[0] === 'n') y1 = Math.max(0, Math.min(y2 - min, o.y + dy)); else y2 = Math.min(base.height, Math.max(y1 + min, o.y + o.h + dy));
          }
          r = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; draw();
        }
        function up() { drag = null; }
        cv.addEventListener('mousedown', down); g.addEventListener('mousemove', move); g.addEventListener('mouseup', up);
        cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
        function turn(d) { rot = (rot + d + 360) % 360; base = rotated(im, rot); all(); fit(); }
        document.getElementById('ieL').onclick = function () { turn(-90); };
        document.getElementById('ieR').onclick = function () { turn(90); };
        document.getElementById('ieAll').onclick = function () { all(); draw(); };
        function finish(val) {
          g.removeEventListener('mousemove', move); g.removeEventListener('mouseup', up); g.removeEventListener('resize', fit);
          modal.hidden = true; modal.innerHTML = ''; document.body.classList.remove('noscroll'); resolve(val);
        }
        document.getElementById('ieCancel').onclick = function () { finish(null); };
        document.getElementById('ieOk').onclick = function () {
          var k = Math.min(1, OUT_MAX / Math.max(r.w, r.h));
          var out = document.createElement('canvas'); out.width = Math.max(1, Math.round(r.w * k)); out.height = Math.max(1, Math.round(r.h * k));
          var ox2 = out.getContext('2d'); ox2.fillStyle = '#fff'; ox2.fillRect(0, 0, out.width, out.height);
          ox2.drawImage(base, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height);
          finish(out.toDataURL('image/jpeg', 0.88));
        };
        g.addEventListener('resize', fit);
        all(); requestAnimationFrame(fit);
      });
    });
  }
  g.ImgEdit = { open: open, fromFile: fromFile };
})(window);
