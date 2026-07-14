let dadosAtuais = null;
let periodoAtivo = '24h';

async function carregarTempoReal() {
  const resp = await EscalexAPI.get('dashboardTempoReal');
  if (!resp.ok) {
    document.getElementById('gridUnidades').innerHTML = `<div class="empty-state">${resp.erro}</div>`;
    return;
  }

  dadosAtuais = resp.data;
  popularFiltroUnidade();
  document.getElementById('ultimaAtualizacao').textContent =
    'Atualizado às ' + new Date(dadosAtuais.atualizadoEm).toLocaleTimeString('pt-BR') + ' — atualiza sozinho a cada 25s';
  renderizarGrid();
}

function popularFiltroUnidade() {
  const select = document.getElementById('filtroUnidade');
  const valorAtual = select.value;
  if (select.dataset.populado === 'true') return; // só popula uma vez, pra não perder a seleção do usuário

  dadosAtuais.unidades
    .slice()
    .sort(function (a, b) { return a.nome.localeCompare(b.nome); })
    .forEach(function (u) {
      const opt = document.createElement('option');
      opt.value = u.id_unidade;
      opt.textContent = u.nome;
      select.appendChild(opt);
    });
  select.value = valorAtual;
  select.dataset.populado = 'true';
}

function renderizarGrid() {
  const filtroUnidade = document.getElementById('filtroUnidade').value;
  const filtroStatus = document.getElementById('filtroStatus').value;
  const grid = document.getElementById('gridUnidades');

  let unidades = dadosAtuais.unidades;
  if (filtroUnidade) unidades = unidades.filter(function (u) { return u.id_unidade === filtroUnidade; });

  if (filtroStatus) {
    unidades = unidades
      .map(function (u) {
        return Object.assign({}, u, { especialidades: u.especialidades.filter(function (e) { return e.status === filtroStatus; }) });
      })
      .filter(function (u) { return u.especialidades.length > 0; });
  }

  if (unidades.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhuma unidade corresponde a esse filtro no momento.</div>';
    return;
  }

  const STATUS_LABEL = { completo: 'no previsto', excedente: 'excedente', faltante: 'faltando', sem_registro: 'sem registro' };

  grid.innerHTML = unidades.map(function (u) {
    const especialidadesHtml = u.especialidades.map(function (e) {
      const valor = e.registrado === null ? '—' : e.registrado;
      return `
        <div class="esp-linha">
          <span>${e.nome}</span>
          <span class="esp-valor ${e.status}">${valor} / ${e.previsto} <span style="font-weight:400; font-size:0.75rem;">(${STATUS_LABEL[e.status]})</span></span>
        </div>
      `;
    }).join('') || '<div class="hint">Nenhuma especialidade configurada.</div>';

    return `
      <div class="unidade-card">
        <div class="cabecalho-u">
          <h3>${u.nome}</h3>
          <span class="badge badge-${u.turno}">${u.turno === 'diurno' ? 'Diurno' : 'Noturno'}</span>
        </div>
        ${!u.temRegistro ? '<div class="sem-registro-aviso">⚠️ Nenhum registro neste turno ainda</div>' : ''}
        ${especialidadesHtml}
      </div>
    `;
  }).join('');
}

document.getElementById('filtroUnidade').addEventListener('change', renderizarGrid);
document.getElementById('filtroStatus').addEventListener('change', renderizarGrid);

document.getElementById('btnExportarCsv').addEventListener('click', function () {
  if (!dadosAtuais) return;
  const linhas = [['Unidade', 'Turno', 'Especialidade', 'Previsto', 'Registrado', 'Status']];
  dadosAtuais.unidades.forEach(function (u) {
    u.especialidades.forEach(function (e) {
      linhas.push([u.nome, u.turno, e.nome, e.previsto, e.registrado === null ? '' : e.registrado, e.status]);
    });
  });
  const csv = linhas.map(function (l) { return l.map(function (v) { return `"${String(v).replace(/"/g, '""')}"`; }).join(';'); }).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `escalex_tempo_real_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
  a.click();
});

// --- tendência ---
document.querySelectorAll('.periodo-tabs button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.periodo-tabs button').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    periodoAtivo = btn.dataset.periodo;
    carregarTendencia();
  });
});

async function carregarTendencia() {
  const container = document.getElementById('graficoTendencia');
  container.innerHTML = 'Carregando…';

  const resp = await EscalexAPI.get('dashboardTendencia', { periodo: periodoAtivo });
  if (!resp.ok) {
    container.innerHTML = `<div class="empty-state">${resp.erro}</div>`;
    return;
  }

  const pontosValidos = resp.data.pontos.filter(function (p) { return p.percentual !== null; });
  if (pontosValidos.length === 0) {
    container.innerHTML = '<div class="empty-state">Ainda não há dados suficientes nesse período.</div>';
    return;
  }

  container.innerHTML = gerarGraficoTendenciaSVG(resp.data.pontos);
}

function gerarGraficoTendenciaSVG(pontos) {
  const largura = 900, altura = 180, margemBaixo = 30, margemTopo = 16, margemLados = 10;
  const areaLargura = largura - margemLados * 2;

  const validos = pontos.map(function (p, i) { return { i: i, percentual: p.percentual, rotulo: p.rotulo }; }).filter(function (p) { return p.percentual !== null; });
  const escalaX = i => margemLados + (i / Math.max(pontos.length - 1, 1)) * areaLargura;
  const escalaY = pct => (altura - margemBaixo) - (pct / 100) * (altura - margemBaixo - margemTopo);

  let path = '';
  validos.forEach(function (p, idx) {
    const comando = idx === 0 ? 'M' : 'L';
    path += `${comando}${escalaX(p.i).toFixed(1)},${escalaY(p.percentual).toFixed(1)} `;
  });

  const pontosSvg = validos.map(function (p) {
    const cor = p.percentual >= 85 ? CORES_TENDENCIA.verde : (p.percentual >= 50 ? CORES_TENDENCIA.laranja : CORES_TENDENCIA.vermelho);
    return `<circle cx="${escalaX(p.i).toFixed(1)}" cy="${escalaY(p.percentual).toFixed(1)}" r="3.5" fill="${cor}"></circle>`;
  }).join('');

  // rótulos do eixo X: no máximo ~8, distribuídos, pra não empilhar texto
  const passo = Math.max(1, Math.ceil(pontos.length / 8));
  let rotulosX = '';
  pontos.forEach(function (p, i) {
    if (i % passo !== 0 && i !== pontos.length - 1) return;
    rotulosX += `<text x="${escalaX(i).toFixed(1)}" y="${altura - 8}" font-size="10" fill="#5b6773" text-anchor="middle">${p.rotulo}</text>`;
  });

  const linhasGuia = [0, 50, 85, 100].map(function (pct) {
    return `<line x1="${margemLados}" y1="${escalaY(pct)}" x2="${largura - margemLados}" y2="${escalaY(pct)}" stroke="#eef1f4" stroke-width="1"></line>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:${altura}px; display:block;">
      ${linhasGuia}
      <path d="${path.trim()}" fill="none" stroke="#4f8fc4" stroke-width="2"></path>
      ${pontosSvg}
      ${rotulosX}
    </svg>
  `;
}

const CORES_TENDENCIA = { verde: '#2f9e64', laranja: '#d9822b', vermelho: '#c94545' };

// --- inicialização e auto-refresh ---
carregarTempoReal();
carregarTendencia();
setInterval(carregarTempoReal, 25000);
