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

  renderizarGraficoPorEspecialidade(resp.data, container);
}

function renderizarGraficoPorEspecialidade(data, container) {
  if (!data.especialidades || data.especialidades.length === 0 || !data.intervaloInicio) {
    container.innerHTML = '<div class="empty-state">Ainda não há registros nesse período.</div>';
    return;
  }

  const spanMs = new Date(data.intervaloFim).getTime() - new Date(data.intervaloInicio).getTime();
  const multiDia = spanMs > 24 * 60 * 60 * 1000;
  const cabecalho = data.escopo === 'unidade'
    ? data.unidade.nome
    : 'Todas as unidades — soma das especialidades em comum';

  container.innerHTML = `<div style="margin-bottom:8px; font-weight:600; color:var(--navy-700); font-size:0.85rem;">${cabecalho}</div>` +
    data.especialidades.map(function (esp) {
      return `
        <div style="margin-bottom:22px;">
          <div style="font-size:0.88rem; font-weight:600; margin-bottom:4px;">${esp.nome}</div>
          ${gerarGraficoEspecialidadeSVG(esp, data.intervaloInicio, data.intervaloFim, data.marcosTurno, multiDia)}
          <div class="hint" style="margin-top:2px;">Previsto: ${esp.previsto}</div>
        </div>
      `;
    }).join('');
}

const CORES_TENDENCIA = { verde: '#2f9e64', laranja: '#d9822b', vermelho: '#c94545' };

/**
 * Gráfico de degrau por especialidade (mesmo estilo do CTAI), com o número
 * de profissionais registrados como rótulo de dados em cada trecho, marcos
 * verticais indicando a troca de turno (diurno/noturno), e rótulos de
 * horário mais detalhados (com anti-sobreposição em 2 linhas).
 */
function gerarGraficoEspecialidadeSVG(esp, intervaloInicio, intervaloFim, marcosTurno, multiDia) {
  const largura = 900, altura = 106, margemBaixo = 38, margemTopo = 16;
  const inicioMs = new Date(intervaloInicio).getTime();
  const fimMs = new Date(intervaloFim).getTime();
  const totalMs = fimMs - inicioMs || 1;

  const maxY = Math.max(esp.previsto, ...esp.segmentos.map(function (s) { return s.quantidade; }), 1);
  const escalaX = t => ((new Date(t).getTime() - inicioMs) / totalMs) * largura;
  const escalaY = q => (altura - margemBaixo) - (q / maxY) * (altura - margemBaixo - margemTopo);
  const formatarHora = t => multiDia
    ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const yBaseEixo = altura - margemBaixo;
  const yLabelLinha0 = altura - 20;
  const yLabelLinha1 = altura - 6;

  let linhas = '';
  const candidatosHorario = [{ x: 0, texto: formatarHora(intervaloInicio), anchor: 'start' }];

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
      candidatosHorario.push({ x: x2, texto: formatarHora(seg.fim), anchor: 'middle' });
    }
  });

  candidatosHorario.push({ x: largura, texto: formatarHora(intervaloFim), anchor: 'end' });

  // divisórias verticais de troca de turno (diurno <-> noturno)
  let divisoriasTurno = '';
  (marcosTurno || []).forEach(function (marco) {
    const x = escalaX(marco.inicio);
    if (x <= 2 || x >= largura - 2) return; // não desenha em cima da própria borda
    const corTurno = marco.turno === 'diurno' ? '#e8ac1f' : '#2e5c86';
    divisoriasTurno += `<line x1="${x}" y1="${margemTopo - 4}" x2="${x}" y2="${yBaseEixo}" stroke="${corTurno}" stroke-width="1.2" stroke-dasharray="4,3"></line>`;
    divisoriasTurno += `<text x="${x}" y="${margemTopo - 6}" font-size="8.5" font-weight="700" fill="${corTurno}" text-anchor="middle">${marco.turno === 'diurno' ? '☀️ diurno' : '🌙 noturno'}</text>`;
  });

  const marcacoesTempo = posicionarRotulosSemSobreposicao_(candidatosHorario, yLabelLinha0, yLabelLinha1);
  const linhaEixoBase = `<line x1="0" y1="${yBaseEixo}" x2="${largura}" y2="${yBaseEixo}" stroke="#e1e6ec" stroke-width="1"></line>`;

  return `
    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:${altura}px; display:block;">
      ${linhaEixoBase}
      ${divisoriasTurno}
      ${linhas}
      ${marcacoesTempo}
    </svg>
  `;
}

/**
 * Recebe rótulos candidatos (x, texto, anchor) e distribui em 2 "linhas"
 * alternadas sempre que a largura estimada do texto invadiria o vizinho —
 * evita um horário colar em cima do outro (mesma lógica usada no CTAI).
 */
function posicionarRotulosSemSobreposicao_(candidatos, yLinha0, yLinha1) {
  const LARGURA_CHAR = 5.2;
  const GAP_MINIMO = 4;

  function caixaDoRotulo(c) {
    const largura = c.texto.length * LARGURA_CHAR;
    if (c.anchor === 'start') return [c.x, c.x + largura];
    if (c.anchor === 'end') return [c.x - largura, c.x];
    return [c.x - largura / 2, c.x + largura / 2];
  }

  const ordenados = candidatos.slice().sort(function (a, b) { return a.x - b.x; });
  let fimLinha0 = -Infinity, fimLinha1 = -Infinity, svg = '';

  ordenados.forEach(function (c) {
    const caixa = caixaDoRotulo(c);
    let linha;
    if (caixa[0] >= fimLinha0 + GAP_MINIMO) { linha = 0; fimLinha0 = caixa[1]; }
    else if (caixa[0] >= fimLinha1 + GAP_MINIMO) { linha = 1; fimLinha1 = caixa[1]; }
    else { linha = fimLinha0 <= fimLinha1 ? 0 : 1; if (linha === 0) fimLinha0 = caixa[1]; else fimLinha1 = caixa[1]; }
    const y = linha === 0 ? yLinha0 : yLinha1;
    svg += `<text x="${c.x}" y="${y}" font-size="9" fill="#5b6773" text-anchor="${c.anchor}">${c.texto}</text>`;
  });

  return svg;
}

// --- inicialização e auto-refresh ---
carregarTempoReal();
carregarTendencia();
setInterval(carregarTempoReal, 25000);
