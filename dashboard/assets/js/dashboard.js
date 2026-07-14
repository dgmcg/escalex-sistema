const usuarioDashboard = EscalexSession.obter('dashboard');
if (!usuarioDashboard) window.location.href = 'index.html';

document.getElementById('btnSair').addEventListener('click', function () {
  EscalexSession.limpar('dashboard');
  window.location.href = 'index.html';
});

let dadosAtuais = null;
let periodoAtivo = 'vigente';

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

document.getElementById('filtroUnidade').addEventListener('change', function () {
  renderizarGrid();
  carregarTendencia();
});
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

    const blocoPersonalizado = document.getElementById('blocoPersonalizado');
    if (periodoAtivo === 'personalizado') {
      blocoPersonalizado.classList.add('aberto');
      return; // espera o usuário clicar em "Aplicar"
    }
    blocoPersonalizado.classList.remove('aberto');
    carregarTendencia();
  });
});

document.getElementById('btnAplicarPersonalizado').addEventListener('click', carregarTendencia);

async function carregarTendencia() {
  const container = document.getElementById('graficoTendencia');
  container.innerHTML = 'Carregando…';

  const filtroUnidade = document.getElementById('filtroUnidade').value;
  const params = { periodo: periodoAtivo };
  if (filtroUnidade) params.id_unidade = filtroUnidade;

  if (periodoAtivo === 'personalizado') {
    const dataInicio = document.getElementById('dataInicioPersonalizado').value;
    const dataFim = document.getElementById('dataFimPersonalizado').value;
    if (!dataInicio || !dataFim) {
      container.innerHTML = '<div class="empty-state">Escolha as duas datas e clique em "Aplicar".</div>';
      return;
    }
    if (dataInicio > dataFim) {
      container.innerHTML = '<div class="empty-state">A data "De" precisa ser antes da data "Até".</div>';
      return;
    }
    params.dataInicio = dataInicio;
    params.dataFim = dataFim;
  }

  const resp = await EscalexAPI.get('dashboardTendencia', params);
  if (!resp.ok) {
    container.innerHTML = `<div class="empty-state">${resp.erro}</div>`;
    return;
  }

  if (resp.data.modo === 'especialidade') {
    renderizarGraficoPorEspecialidade(resp.data, container);
  } else {
    renderizarGraficoPercentual(resp.data, container);
  }
}

function renderizarGraficoPercentual(data, container) {
  const pontosValidos = data.pontos.filter(function (p) { return p.percentual !== null; });
  if (pontosValidos.length === 0) {
    container.innerHTML = '<div class="empty-state">Ainda não há dados suficientes nesse período.</div>';
    return;
  }
  container.innerHTML = gerarGraficoTendenciaSVG(data.pontos);
}

function renderizarGraficoPorEspecialidade(data, container) {
  if (!data.especialidades || data.especialidades.length === 0 || !data.intervaloInicio) {
    container.innerHTML = '<div class="empty-state">Ainda não há registros dessa unidade nesse período.</div>';
    return;
  }

  const spanMs = new Date(data.intervaloFim).getTime() - new Date(data.intervaloInicio).getTime();
  const multiDia = spanMs > 24 * 60 * 60 * 1000;

  container.innerHTML = `<div style="margin-bottom:8px; font-weight:600; color:var(--navy-700); font-size:0.85rem;">${data.unidade.nome}</div>` +
    data.especialidades.map(function (esp) {
      return `
        <div style="margin-bottom:18px;">
          <div style="font-size:0.88rem; font-weight:600; margin-bottom:4px;">${esp.nome}</div>
          ${gerarGraficoEspecialidadeSVG(esp, data.intervaloInicio, data.intervaloFim, multiDia)}
          <div class="hint" style="margin-top:2px;">Previsto: ${esp.previsto}</div>
        </div>
      `;
    }).join('');
}

const CORES_TENDENCIA = { verde: '#2f9e64', laranja: '#d9822b', vermelho: '#c94545' };

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
    return `
      <circle cx="${escalaX(p.i).toFixed(1)}" cy="${escalaY(p.percentual).toFixed(1)}" r="3.5" fill="${cor}"></circle>
      <text x="${escalaX(p.i).toFixed(1)}" y="${(escalaY(p.percentual) - 8).toFixed(1)}" font-size="9" font-weight="700" fill="${cor}" text-anchor="middle">${p.percentual.toFixed(0)}%</text>
    `;
  }).join('');

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

/**
 * Gráfico de degrau por especialidade (mesmo estilo do CTAI), com o número
 * de profissionais registrados como rótulo de dados em cada trecho.
 */
function gerarGraficoEspecialidadeSVG(esp, intervaloInicio, intervaloFim, multiDia) {
  const largura = 900, altura = 90, margemBaixo = 22, margemTopo = 16;
  const inicioMs = new Date(intervaloInicio).getTime();
  const fimMs = new Date(intervaloFim).getTime();
  const totalMs = fimMs - inicioMs || 1;

  const maxY = Math.max(esp.previsto, ...esp.segmentos.map(function (s) { return s.quantidade; }), 1);
  const escalaX = t => ((new Date(t).getTime() - inicioMs) / totalMs) * largura;
  const escalaY = q => (altura - margemBaixo) - (q / maxY) * (altura - margemBaixo - margemTopo);
  const formatarRotulo = t => multiDia
    ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const yBaseEixo = altura - margemBaixo;
  let linhas = '';

  esp.segmentos.forEach(function (seg, i) {
    const x1 = escalaX(seg.inicio), x2 = escalaX(seg.fim), y = escalaY(seg.quantidade);
    const cor = seg.compliant ? CORES_TENDENCIA.verde : CORES_TENDENCIA.vermelho;
    linhas += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${cor}" stroke-width="2.5" stroke-linecap="round"></line>`;

    if (x2 - x1 > 22) {
      const xMeio = (x1 + x2) / 2;
      const yTexto = y > margemTopo + 8 ? y - 6 : y + 12;
      linhas += `<text x="${xMeio}" y="${yTexto}" font-size="10" font-weight="700" fill="${cor}" text-anchor="middle">${seg.quantidade}</text>`;
    }

    if (i < esp.segmentos.length - 1) {
      const proximo = esp.segmentos[i + 1];
      linhas += `<line x1="${x2}" y1="${y}" x2="${x2}" y2="${escalaY(proximo.quantidade)}" stroke="#c7cdd4" stroke-width="1.5"></line>`;
    }
  });

  const rotulosX = `
    <text x="2" y="${altura - 6}" font-size="9" fill="#5b6773" text-anchor="start">${formatarRotulo(intervaloInicio)}</text>
    <text x="${largura - 2}" y="${altura - 6}" font-size="9" fill="#5b6773" text-anchor="end">${formatarRotulo(intervaloFim)}</text>
  `;

  const linhaEixoBase = `<line x1="0" y1="${yBaseEixo}" x2="${largura}" y2="${yBaseEixo}" stroke="#e1e6ec" stroke-width="1"></line>`;

  return `
    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:${altura}px; display:block;">
      ${linhaEixoBase}
      ${linhas}
      ${rotulosX}
    </svg>
  `;
}

// --- inicialização e auto-refresh ---
carregarTempoReal();
carregarTendencia();
setInterval(carregarTempoReal, 25000);
