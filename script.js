// script.js - mobile improvements, NO solid heart layer (particles-only heart + halo)
window.requestAnimationFrame =
    window.__requestAnimationFrame ||
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        (function () {
            return function (callback, element) {
                var lastTime = element.__lastTime;
                if (lastTime === undefined) {
                    lastTime = 0;
                }
                var currTime = Date.now();
                var timeToCall = Math.max(1, 33 - (currTime - lastTime));
                window.setTimeout(callback, timeToCall);
                element.__lastTime = currTime + timeToCall;
            };
        })();

window.isDevice = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(((navigator.userAgent || navigator.vendor || window.opera)).toLowerCase()));
var loaded = false;

var init = function () {
    if (loaded) return;
    loaded = true;

    var mobile = window.isDevice;

    var canvas = document.getElementById('heart');
    if (!canvas) { console.error('Không tìm thấy canvas id="heart"'); return; }
    var ctx = canvas.getContext('2d');

    // fullscreen canvas basics
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.margin = '0';
    canvas.style.padding = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var width = 0, height = 0;

    function resizeCanvas() {
        dpr = Math.max(1, window.devicePixelRatio || 1);
        var cssW = Math.max(1, Math.round(window.innerWidth));
        var cssH = Math.max(1, Math.round(window.innerHeight));
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        width = cssW;
        height = cssH;
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, width, height);

        rebuildHeartPoints();
        createParticles();
        createStars();
        createIntroDust();
        createHalo();
    }
    window.addEventListener('resize', resizeCanvas);

    // heart shape math (existing)
    var heartPosition = function (rad) {
        return [Math.pow(Math.sin(rad), 3), -(15 * Math.cos(rad) - 5 * Math.cos(2 * rad) - 2 * Math.cos(3 * rad) - Math.cos(4 * rad))];
    };
    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    // Adjusted for nicer mobile heart:
    var dr = mobile ? 0.18 : 0.1; // denser sampling on mobile for a smoother outline
    var pointsOrigin = [];
    var heartPointsCount = 0;
    // Increase mobile scale so it doesn't look too small
    var mobileScale = 0.46; // was ~0.32; bumped to make heart larger on phones
    var desktopScale = 0.26;
    var syFactor = 0.062;

    function rebuildHeartPoints() {
        pointsOrigin = [];
        var base = Math.min(width || window.innerWidth, height || window.innerHeight);
        var baseScale = (mobile ? mobileScale : desktopScale) * base;
        var s1 = baseScale;
        var s2 = s1 * (150 / 210);
        var s3 = s1 * (90 / 210);
        for (var i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), s1, s1 * syFactor, 0, 0));
        for (i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), s2, s2 * syFactor, 0, 0));
        for (i = 0; i < Math.PI * 2; i += dr) pointsOrigin.push(scaleAndTranslate(heartPosition(i), s3, s3 * syFactor, 0, 0));
        heartPointsCount = pointsOrigin.length;
    }

    // PARTICLES: store color components (so we can modulate alpha during crossfade)
    var particles = [];
    var traceCount = mobile ? 30 : 50; // keep traces reasonably dense on mobile
    function createParticles() {
        particles = [];
        var rand = Math.random;
        var cx = width/2, cy = height/2 - Math.min(width, height) * (mobile ? 0.08 : 0.05);
        for (var i = 0; i < heartPointsCount; i++) {
            // initialize particles closer to heart center so the heart looks full early
            var x = cx + (rand() - 0.5) * Math.min(120, Math.min(width,height)*0.12);
            var y = cy + (rand() - 0.5) * Math.min(120, Math.min(width,height)*0.12);
            var hueJitter = Math.round(rand() * 10) - 5;
            var sat = 78 + Math.round(rand() * 12);
            var light = 40 + Math.round(rand() * 8);
            var alpha = 0.86 + rand() * 0.12;
            var obj = {
                vx: 0, vy: 0, R: 2, speed: rand() + 5,
                q: ~~(rand() * heartPointsCount),
                D: 2 * (i % 2) - 1,
                force: 0.2 * rand() + 0.7,
                color: { h: (0 + hueJitter), s: sat, l: light, a: alpha },
                trace: []
            };
            for (var k = 0; k < traceCount; k++) obj.trace[k] = { x: x, y: y };
            particles[i] = obj;
        }
    }

    // STARS (background) – sao nhỏ, thưa vừa phải
    var stars = [];
    function createStars() {
        stars = [];
        var area = Math.max(1, width * height);

        // Ít sao hơn một chút, tùy theo kích thước màn
        var num = Math.round(area / 50000);
        num = Math.min(60, Math.max(28, num)); // không quá ít cũng không quá nhiều

        var rand = Math.random;
        for (var i = 0; i < num; i++) {
            var sx = Math.round(rand() * width);
            var sy = Math.round(rand() * height);

            // Sao nhỏ xíu
            var r = 0.35 + rand() * 0.8;

            // Ánh sáng dịu, không chói
            var a = 0.28 + rand() * 0.4;

            // Nháy nhẹ nhàng
            var tw = 0.005 + rand() * 0.018;

            stars.push({
                x: sx,
                y: sy,
                r: r,
                a: a,
                tw: tw,
                phase: rand() * Math.PI * 2
            });
        }
    }

    function drawStars(alphaMultiplier) {
        alphaMultiplier = (alphaMultiplier === undefined) ? 1 : alphaMultiplier;
        for (var i = 0; i < stars.length; i++) {
            // tích hợp gia tốc do shockwave (nếu có)
            if (stars[i].kick) {
                stars[i].x += (stars[i].vx || 0);
                stars[i].y += (stars[i].vy || 0);
                stars[i].vx *= 0.985;
                stars[i].vy *= 0.985;
                // giảm dần sau khi ra xa
                if (Math.abs(stars[i].vx) + Math.abs(stars[i].vy) < 0.05) stars[i].kick = 0;
            }
            var s = stars[i];
            s.phase += s.tw;
            var alpha = s.a * (0.85 + 0.15 * Math.sin(s.phase)) * alphaMultiplier;
            if (s.r >= 1.2) {
                ctx.beginPath();
                ctx.globalAlpha = Math.max(0, alpha * 0.33);
                ctx.fillStyle = "white";
                ctx.arc(s.x, s.y, s.r * 2.0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = "white";
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // INTRO DUST / nebula
    var introDust = [];
    function createIntroDust() {
        introDust = [];
        var rand = Math.random;
        var n = Math.min(22, Math.max(8, Math.round((width * height) / 120000)));
        for (var i = 0; i < n; i++) {
            var x = rand() * width;
            var y = rand() * height;
            var sx = (rand() - 0.5) * (1 + (mobile ? 0.4 : 1.0));
            var sy = (rand() - 0.5) * (0.3 + (mobile ? 0.2 : 0.5));
            var rad = 18 + rand() * 80;
            var a = 0.015 + rand() * 0.08;
            introDust.push({ x: x, y: y, vx: sx * 0.2, vy: sy * 0.2, r: rad, a: a, phase: rand() * Math.PI * 2 });
        }
    }
    function drawIntroDust(progress) {
        for (var i = 0; i < introDust.length; i++) {
            var d = introDust[i];
            d.x += d.vx * (0.6 + progress * 1.4);
            d.y += d.vy * (0.6 + progress * 1.4);
            d.phase += 0.003;
            var localAlpha = d.a * (0.2 + 0.8 * progress) * (0.6 + 0.4 * Math.sin(d.phase));
            ctx.globalAlpha = Math.max(0, localAlpha * 0.45);
            ctx.beginPath();
            ctx.fillStyle = "rgba(255,200,240,1)";
            ctx.arc(d.x, d.y, d.r * (0.6 + 0.6 * progress), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = Math.max(0, localAlpha);
            ctx.beginPath();
            ctx.fillStyle = "rgba(255,220,255,1)";
            ctx.arc(d.x, d.y, d.r * 0.25 * (0.6 + progress), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            if (d.x < -200) d.x = width + 200;
            if (d.x > width + 200) d.x = -200;
            if (d.y < -200) d.y = height + 200;
            if (d.y > height + 200) d.y = -200;
        }
    }

    // ---------------- HALO / RING EFFECT ----------------
    var halo = {
        rings: [],
        spawnRate: mobile ? 1200 : 900, // ms between rings
        lastSpawn: 0,
        maxR: Math.max(200, Math.min(width, height) * 0.6),
        ringSpeed: mobile ? 1.8 : 2.6, // pixels per frame base (will scale)
        ringWidth: mobile ? 2.2 : 3.2
    };
    
    // ---------------- SHOCKWAVE (visible ring + impulse + erase) ----------------
    // Sóng tròn phát từ tâm, có ring phát sáng rõ ràng + lực đẩy mạnh ra ngoài
    var shockwave = {
        active: false,
        start: 0,
        duration: 900,   // lâu hơn để thấy rõ
        maxR: 0,
        pushed: false
    };
    function startShockwave(ts) {
        shockwave.active = true;
        shockwave.pushed = false;
        shockwave.start = ts || performance.now();
        shockwave.maxR = Math.sqrt(width*width + height*height) * 1.1;
    }
    function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

    function drawShockwave(now) {
        if (!shockwave.active) return;
        var elapsed = (now || performance.now()) - shockwave.start;
        var t = Math.min(1, elapsed / shockwave.duration);
        var e = easeOutCubic(t);
        var cx = width/2;
        var cy = height/2 - Math.min(width, height) * (mobile ? 0.08 : 0.05);
        var r = 24 + (shockwave.maxR - 24) * e;

        // 1) Bloom flash đầu sóng để "nổ sáng"
        if (elapsed < 240) {
            var bt = elapsed / 240;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            var bg = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(80, Math.min(width, height)*0.22));
            bg.addColorStop(0, 'rgba(255,255,255,' + (0.9*(1-bt)) + ')');
            bg.addColorStop(0.45, 'rgba(255,190,220,' + (0.55*(1-bt)) + ')');
            bg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(60, r*0.6), 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        // 2) Visible shock ring (double rim)
        var thickness = Math.max(2, Math.min(width, height)*0.014 * (1.2 - e));
        var glow = thickness * 4;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = thickness;
        ctx.shadowBlur = glow;
        ctx.shadowColor = 'rgba(255,180,220,0.95)';
        var grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        grad.addColorStop(0.0, 'rgba(255,170,210,'+(0.85*(1-t))+')');
        grad.addColorStop(0.5, 'rgba(255,255,255,'+(0.85*(1-t))+')');
        grad.addColorStop(1.0, 'rgba(255,170,210,'+(0.85*(1-t))+')');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.stroke();
        // trailing faint rim
        ctx.lineWidth = Math.max(1, thickness*0.55);
        ctx.shadowBlur = glow*0.6;
        ctx.shadowColor = 'rgba(255,140,200,0.8)';
        ctx.strokeStyle = 'rgba(255,140,200,'+(0.55*(1-t))+')';
        ctx.beginPath();
        ctx.arc(cx, cy, r - thickness*1.3, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();

        // 3) Impulse: đẩy mọi thứ ra ngoài 1 lần
        if (!shockwave.pushed && t > 0.06) {
            shockwave.pushed = true;
            var pushBase = Math.min(width, height) * 0.18;

            // particles (heart)
            try {
                for (var i = 0; i < particles.length; i++) {
                    var u = particles[i];
                    var px = u.trace && u.trace[0] ? u.trace[0].x : (u.x || cx);
                    var py = u.trace && u.trace[0] ? u.trace[0].y : (u.y || cy);
                    var dx = px - cx, dy = py - cy;
                    var len = Math.sqrt(dx*dx + dy*dy) || 1;
                    var mag = pushBase * (0.7 + Math.random()*0.7);
                    u.vx = (u.vx || 0) + (dx/len) * mag;
                    u.vy = (u.vy || 0) + (dy/len) * mag;
                    if (u.trace && u.trace.length) {
                        for (var kk = 1; kk < u.trace.length; kk++) {
                            u.trace[kk].x += (dx/len) * (mag * 0.03 * (kk/u.trace.length));
                            u.trace[kk].y += (dy/len) * (mag * 0.03 * (kk/u.trace.length));
                        }
                    }
                }
            } catch(e) {}

            // halo rings: tăng tốc + thêm ring lớn
            try {
                for (i = 0; i < halo.rings.length; i++) {
                    halo.rings[i].speed = (halo.rings[i].speed || 1) * 2.4;
                    halo.rings[i].alpha = Math.min(1, (halo.rings[i].alpha || 1) * 1.25);
                }
                halo.rings.push({
                    x: cx, y: cy,
                    r: Math.max(12, Math.min(width, height)*0.03),
                    maxR: shockwave.maxR * 1.05,
                    width: Math.max(6, Math.min(width, height) * 0.06),
                    alpha: 0.95,
                    speed: Math.min(width, height) * 0.13,
                    life: 0
                });
            } catch(e) {}


            // intro dust: tăng vận tốc hiện có
            try {
                for (i = 0; i < introDust.length; i++) {
                    var d = introDust[i];
                    var dxx = d.x - cx, dyy = d.y - cy;
                    var ld = Math.sqrt(dxx*dxx + dyy*dyy) || 1;
                    var md = (pushBase*0.5) * (0.7 + Math.random()*0.7);
                    d.vx += (dxx/ld) * md;
                    d.vy += (dyy/ld) * md;
                }
            } catch(e) {}
        }

        // 4) Để "quét sạch" vùng sáng: erase bằng donut mềm tại viền sóng
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, r + thickness*1.4, 0, Math.PI*2);
        ctx.arc(cx, cy, r - thickness*1.4, 0, Math.PI*2, true); // tạo vành khuyên
        ctx.fillStyle = 'rgba(0,0,0,' + (0.28 + 0.4*(1-e)) + ')';
        ctx.fill();
        ctx.restore();

        if (t >= 1) shockwave.active = false;
    }
    function createHalo() {
        halo.rings = [];
        halo.lastSpawn = 0;
        halo.maxR = Math.max(200, Math.min(width, height) * 0.6);
    }
    function spawnRing() {
        var cx = width/2;
        var cy = height/2 - Math.min(width, height) * (mobile ? 0.08 : 0.05);
        var seed = Math.random();
        var ring = {
            x: cx, y: cy,
            r: 8 + seed * 6,
            maxR: halo.maxR * (0.8 + seed * 0.6),
            width: halo.ringWidth * (0.8 + seed * 0.6),
            alpha: 0.85 * (0.6 + seed * 0.7),
            speed: halo.ringSpeed * (0.9 + seed * 0.8),
            life: 0
        };
        halo.rings.push(ring);
    }
    function updateHalo(dt, heartAlpha) {
        halo.lastSpawn += dt;
        if (halo.lastSpawn >= halo.spawnRate) {
            halo.lastSpawn = 0;
            spawnRing();
        }
        for (var i = halo.rings.length - 1; i >= 0; i--) {
            var R = halo.rings[i];
            R.r += R.speed * (dt/16);
            R.life += dt;
            var t = Math.min(1, R.r / R.maxR);
            R.alpha = (1 - t) * R.alpha;
            if (R.r >= R.maxR || R.alpha < 0.02) {
                halo.rings.splice(i, 1);
            }
        }
        for (i = 0; i < halo.rings.length; i++) {
            var rr = halo.rings[i];
            ctx.save();
            ctx.globalAlpha = Math.max(0, rr.alpha * heartAlpha);
            ctx.lineWidth = rr.width;
            ctx.shadowBlur = Math.max(6, rr.width * 2.2);
            ctx.shadowColor = "rgba(255,120,120,0.65)";
            ctx.strokeStyle = "rgba(255,120,120," + Math.min(0.98, 0.6 + 0.2 * (1 - rr.alpha)) + ")";
            ctx.beginPath();
            ctx.arc(rr.x, rr.y, rr.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        var cx = width/2;
        var cy = height/2 - Math.min(width, height) * (mobile ? 0.08 : 0.05);
        var pulse = 1 + 0.06 * Math.sin(Date.now()/220);
        var glowR = Math.min(halo.maxR*0.22, Math.min(width, height)*0.14) * pulse;
        var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR);
        g.addColorStop(0, "rgba(255,100,100," + (0.9 * heartAlpha) + ")");
        g.addColorStop(0.35, "rgba(255,80,80," + (0.28 * heartAlpha) + ")");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }


    // Timeline states


    var introStart = null;
    var introDuration = 3300; // intro full open (ms)
    var crossfadeDuration = 900; // smooth crossfade (ms)
    var introPlaying = true;
    var crossfading = false;
    var crossStart = null;

    // center offset for heart placement (smaller offset so heart sits better on mobile)
    var centerYOffsetFactor = mobile ? 0.08 : 0.05;
    var targetPoints = [];
    var pulse = function (kx, ky) {
        var yOffset = Math.min(width, height) * centerYOffsetFactor;
        for (var i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [];
            targetPoints[i][0] = kx * pointsOrigin[i][0] + width / 2;
            targetPoints[i][1] = ky * pointsOrigin[i][1] + height / 2 - yOffset;
        }
    };

    var config = { traceK: 0.4, timeDelta: 0.01 };
    var time = 0;
    var rand = Math.random;

    // last frame timestamp to compute dt
    var lastTS = performance.now();

    // main loop
    function loop(ts) {
        if (!introStart) introStart = ts || performance.now();
        var elapsedIntro = (ts || performance.now()) - introStart;

        var now = ts || performance.now();
        var dt = now - lastTS;
        lastTS = now;

        // clear fully each frame
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, width, height);

        // --- INTRO STAGE (grow) ---
        if (introPlaying && !crossfading) {
            var p = Math.min(1, elapsedIntro / introDuration);

    var starAlpha = Math.pow(p, 0.78);
            drawStars(starAlpha);
            drawIntroDust(p);

            // central iris reveal
            var cx = width/2;
            var cy = height/2 - Math.min(width, height) * centerYOffsetFactor;
            var maxR = Math.sqrt(width*width + height*height)*0.9;
            var maskR = 20 + (maxR - 20) * Math.pow(p, 0.9);
            var pulseGlow = 1 + 0.08 * Math.sin(elapsedIntro/120);

            var g = ctx.createRadialGradient(cx, cy, Math.max(2, maskR * 0.06), cx, cy, maskR);
            g.addColorStop(0, "rgba(255,240,255," + Math.min(0.95, 0.56 + 0.44*p) + ")");
            g.addColorStop(0.35, "rgba(255,200,240," + Math.min(0.45, 0.22 + 0.4*p) + ")");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, maskR * pulseGlow, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';

            if (elapsedIntro >= introDuration) {
                // start crossfade
                crossfading = true;
                crossStart = ts || performance.now();

                // create particles/have halo, but start shockwave FIRST so it clears intro visuals
                createParticles();
                halo.lastSpawn = 0;

                // start the shockwave from the heart center so it wipes intro highlights
                startShockwave(crossStart);
            }

            window.requestAnimationFrame(loop, canvas);
            return;
        }

        // --- CROSSFADING (intro -> heart) ---
        if (crossfading) {
            var elapsed = (ts || performance.now()) - crossStart;
            var t = Math.min(1, elapsed / crossfadeDuration); // 0..1 progress of fade
            // reduce intro elements smoothly
            drawStars(1 - t);
            drawIntroDust(1 - t);

            // soft overlay
            ctx.fillStyle = "rgba(0,0,0," + (0.12 * t) + ")";
            ctx.fillRect(0, 0, width, height);
            
            // compute heartAlpha for all heart-related drawing
            var heartAlpha = t;
            // small pulse so heart breathes while appearing
            var n = -Math.cos(time);
            pulse((1 + n) * .5, (1 + n) * .5);
            time += ((Math.sin(time)) < 0 ? 9 : (n > 0.8) ? .2 : 1) * config.timeDelta;

            // update particles physics (draw with scaled alpha)
            for (var ii = particles.length - 1; ii >= 0; ii--) {
                var u = particles[ii];
                var q = targetPoints[u.q] || [width/2, height/2];
                var dx = u.trace[0].x - q[0];
                var dy = u.trace[0].y - q[1];
                var length = Math.sqrt(dx*dx + dy*dy) || 1;
                if (10 > length) {
                    if (0.95 < rand()) {
                        u.q = ~~(rand() * heartPointsCount);
                    } else {
                        if (0.99 < rand()) u.D *= -1;
                        u.q += u.D;
                        u.q %= heartPointsCount;
                        if (0 > u.q) u.q += heartPointsCount;
                    }
                }
                u.vx += -dx/length * u.speed;
                u.vy += -dy/length * u.speed;
                u.trace[0].x += u.vx;
                u.trace[0].y += u.vy;
                u.vx *= u.force;
                u.vy *= u.force;
                for (var k = 0; k < u.trace.length - 1;) {
                    var T = u.trace[k];
                    var N = u.trace[++k];
                    N.x -= config.traceK * (N.x - T.x);
                    N.y -= config.traceK * (N.y - T.y);
                }
                var col = u.color;
                var drawAlpha = col.a * heartAlpha;
                ctx.fillStyle = "hsla(" + col.h + "," + col.s + "%," + col.l + "%," + drawAlpha + ")";
                for (k = 0; k < u.trace.length; k++) ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
            }

            // halo rings spawn and draw with heartAlpha
            updateHalo(dt, heartAlpha);

            drawShockwave(now);

            if (t >= 1) {
                crossfading = false;
                introPlaying = false;
                time = 0;
            }

            window.requestAnimationFrame(loop, canvas);
            return;
        }

        // --- MAIN HEART PHASE (intro fully gone) ---
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, 0, width, height);

        drawStars(1);

        var n = -Math.cos(time);
        pulse((1 + n) * .5, (1 + n) * .5);
        time += ((Math.sin(time)) < 0 ? 9 : (n > 0.8) ? .2 : 1) * config.timeDelta;

        // update and draw particles normally (full alpha)
        for (ii = particles.length - 1; ii >= 0; ii--) {
            u = particles[ii];
            q = targetPoints[u.q];
            var dx2 = u.trace[0].x - q[0];
            var dy2 = u.trace[0].y - q[1];
            var len2 = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
            if (10 > len2) {
                if (0.95 < rand()) {
                    u.q = ~~(rand() * heartPointsCount);
                } else {
                    if (0.99 < rand()) u.D *= -1;
                    u.q += u.D;
                    u.q %= heartPointsCount;
                    if (0 > u.q) u.q += heartPointsCount;
                }
            }
            u.vx += -dx2/len2 * u.speed;
            u.vy += -dy2/len2 * u.speed;
            u.trace[0].x += u.vx;
            u.trace[0].y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;
            for (k = 0; k < u.trace.length - 1;) {
                T = u.trace[k];
                N = u.trace[++k];
                N.x -= config.traceK * (N.x - T.x);
                N.y -= config.traceK * (N.y - T.y);
            }
            col = u.color;
            ctx.fillStyle = "hsla(" + col.h + "," + col.s + "%," + col.l + "%," + col.a + ")";
            for (k = 0; k < u.trace.length; k++) ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
        }

        // draw halo rings and glow with full heart alpha
        updateHalo(dt, 1);

        window.requestAnimationFrame(loop, canvas);
    }

    // init everything
    resizeCanvas();
// start loop
    lastTS = performance.now();
    window.requestAnimationFrame(loop, canvas);
};

var s = document.readyState;
if (s === 'complete' || s === 'loaded' || s === 'interactive') init();
else document.addEventListener('DOMContentLoaded', init, false);
