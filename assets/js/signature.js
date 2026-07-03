// Escalex — pad de assinatura simples em canvas (sem libs externas)
function iniciarSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let desenhando = false;
  let temTraço = false;

  function ajustarTamanho() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#16283d';
  }
  ajustarTamanho();
  window.addEventListener('resize', ajustarTamanho);

  function pos(ev) {
    const rect = canvas.getBoundingClientRect();
    const ponto = ev.touches ? ev.touches[0] : ev;
    return { x: ponto.clientX - rect.left, y: ponto.clientY - rect.top };
  }

  function iniciar(ev) {
    ev.preventDefault();
    desenhando = true;
    temTraço = true;
    const p = pos(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function mover(ev) {
    if (!desenhando) return;
    ev.preventDefault();
    const p = pos(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function finalizar() { desenhando = false; }

  canvas.addEventListener('mousedown', iniciar);
  canvas.addEventListener('mousemove', mover);
  canvas.addEventListener('mouseup', finalizar);
  canvas.addEventListener('mouseleave', finalizar);
  canvas.addEventListener('touchstart', iniciar, { passive: false });
  canvas.addEventListener('touchmove', mover, { passive: false });
  canvas.addEventListener('touchend', finalizar);

  return {
    limpar() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      temTraço = false;
    },
    estaVazio() { return !temTraço; },
    paraBase64() { return canvas.toDataURL('image/png'); }
  };
}
