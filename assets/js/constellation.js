(function () {
  const canvas = document.getElementById('constellation');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const PARTICLE_COUNT = 88;
  const CONNECT_DIST   = 160;
  const MOUSE_DIST     = 180;
  const MOUSE_LINE     = 140;
  const SPEED          = 0.35;

  const palette = ['rgba(99,102,241,', 'rgba(6,182,212,', 'rgba(168,85,247,'];

  let W, H, particles = [];
  let mouse = { x: -9999, y: -9999 };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x   = Math.random() * W;
    this.y   = Math.random() * H;
    this.vx  = (Math.random() - 0.5) * SPEED;
    this.vy  = (Math.random() - 0.5) * SPEED;
    this.ovx = this.vx;
    this.ovy = this.vy;
    this.r   = Math.random() * 1.5 + 0.5;
    this.color = palette[Math.floor(Math.random() * palette.length)];
  }

  Particle.prototype.update = function () {
    var dx = this.x - mouse.x, dy = this.y - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOUSE_DIST && dist > 0) {
      var strength = (1 - dist / MOUSE_DIST) * 0.55;
      this.vx += (dx / dist) * strength;
      this.vy += (dy / dist) * strength;
    }

    this.vx += (this.ovx - this.vx) * 0.035;
    this.vy += (this.ovy - this.vy) * 0.035;

    var spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 1.4) { this.vx = (this.vx / spd) * 1.4; this.vy = (this.vy / spd) * 1.4; }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -10)    this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    if (this.y < -10)    this.y = H + 10;
    if (this.y > H + 10) this.y = -10;
  };

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, function () { return new Particle(); });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i], b = particles[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST) {
          ctx.beginPath();
          ctx.strokeStyle = a.color + (1 - d / CONNECT_DIST) * 0.28 + ')';
          ctx.lineWidth = 0.7;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    if (mouse.x > 0) {
      particles.forEach(function (p) {
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_LINE) {
          ctx.beginPath();
          ctx.strokeStyle = p.color + (1 - d / MOUSE_LINE) * 0.35 + ')';
          ctx.lineWidth = 0.8;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    }

    particles.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + '0.75)';
      ctx.fill();
    });
  }

  var rafId;
  function loop() {
    particles.forEach(function (p) { p.update(); });
    draw();
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(rafId); } else { loop(); }
  });

  window.addEventListener('resize', init);
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });

  init();
  loop();
})();
