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
    document.getElementById('blocoTurnoUnico').style.display = 'none';
    carregarTendencia();
  });
});

// mostra o seletor de turno só quando "De" e "Até" forem o mesmo dia
function atualizarVisibilidadeTurnoUnico() {
  const dataInicio = document.getElementById('dataInicioPersonalizado').value;
  const dataFim = document.getElementById('dataFimPersonalizado').value;
  const bloco = document.getElementById('blocoTurnoUnico');
  bloco.style.display = (dataInicio && dataFim && dataInicio === dataFim) ? 'block' : 'none';
  if (bloco.style.display === 'none') document.getElementById('turnoUnico').value = '';
}
document.getElementById('dataInicioPersonalizado').addEventListener('change', atualizarVisibilidadeTurnoUnico);
document.getElementById('dataFimPersonalizado').addEventListener('change', atualizarVisibilidadeTurnoUnico);

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
    if (dataInicio === dataFim) {
      const turno = document.getElementById('turnoUnico').value;
      if (turno) params.turno = turno;
    }
  }

  const resp = await EscalexAPI.get('dashboardTendencia', params);
  if (!resp.ok) {
    container.innerHTML = `<div class="empty-state">${resp.erro}</div>`;
    return;
  }

  if (resp.data.modo === 'resumo') {
    renderizarGraficoResumo(resp.data, container);
  } else {
    renderizarGraficoPorEspecialidade(resp.data, container);
  }
}

const CORES_TENDENCIA = { verde: '#2f9e64', laranja: '#d9822b', vermelho: '#c94545', previsto: '#5b6773' };
const COR_FUNDO_DIURNO = 'rgba(232,172,31,0.06)';
const COR_FUNDO_NOTURNO = 'rgba(46,92,134,0.10)';

/* ============ MODO "especialidade": linha detalhada (até 4 plantões) ============ */

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
        </div>
      `;
    }).join('');
}

/**
 * Gráfico de degrau por especialidade: fundo diferenciado por turno (diurno
 * mais claro, noturno mais escuro), divisória + ícone de sol/lua na troca de
 * turno, linha do previsto acompanhando o gráfico inteiro, quantidade como
 * rótulo de dados, e horários com anti-sobreposição.
 */
function gerarGraficoEspecialidadeSVG(esp, intervaloInicio, intervaloFim, marcosTurno, multiDia) {
  const largura = 900, altura = 112, margemBaixo = 38, margemTopo = 20;
  const inicioMs = new Date(intervaloInicio).getTime();
  const fimMs = new Date(intervaloFim).getTime();
  const totalMs = fimMs - inicioMs || 1;

  const maxY = Math.max(
    Math.max.apply(null, esp.segmentos.map(function (s) { return s.previsto; }).concat([0])),
    Math.max.apply(null, esp.segmentos.map(function (s) { return s.quantidade; }).concat([0])),
    1
  );
  const escalaX = t => ((new Date(t).getTime() - inicioMs) / totalMs) * largura;
  const escalaY = q => (altura - margemBaixo) - (q / maxY) * (altura - margemBaixo - margemTopo);
  const formatarHora = t => multiDia
    ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const yBaseEixo = altura - margemBaixo;
  const yLabelLinha0 = altura - 20;
  const yLabelLinha1 = altura - 6;

  // fundo por turno (bandas alternadas, noturno mais escuro)
  let fundos = '';
  (marcosTurno || []).forEach(function (marco) {
    const x1 = Math.max(0, escalaX(marco.inicio));
    const x2 = Math.min(largura, escalaX(marco.fim));
    if (x2 <= x1) return;
    const cor = marco.turno === 'diurno' ? COR_FUNDO_DIURNO : COR_FUNDO_NOTURNO;
    fundos += `<rect x="${x1}" y="${margemTopo - 10}" width="${x2 - x1}" height="${yBaseEixo - margemTopo + 10}" fill="${cor}"></rect>`;
  });

  let linhas = '';
  let linhaPrevisto = '';
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

    // linha do previsto, acompanhando o mesmo trecho (tracejada)
    const yPrevisto = escalaY(seg.previsto);
    linhaPrevisto += `<line x1="${x1}" y1="${yPrevisto}" x2="${x2}" y2="${yPrevisto}" stroke="${CORES_TENDENCIA.previsto}" stroke-width="1.3" stroke-dasharray="3,3"></line>`;
    if (i === 0 || seg.previsto !== esp.segmentos[i - 1].previsto) {
      linhaPrevisto += `<text x="${x1 + 3}" y="${yPrevisto - 3}" font-size="8.5" fill="${CORES_TENDENCIA.previsto}" text-anchor="start">prev. ${seg.previsto}</text>`;
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
    if (x <= 2 || x >= largura - 2) return;
    const corTurno = marco.turno === 'diurno' ? '#e8ac1f' : '#2e5c86';
    divisoriasTurno += `<line x1="${x}" y1="${margemTopo - 8}" x2="${x}" y2="${yBaseEixo}" stroke="${corTurno}" stroke-width="1.2" stroke-dasharray="4,3"></line>`;
    divisoriasTurno += `<text x="${x}" y="${margemTopo - 10}" font-size="8.5" font-weight="700" fill="${corTurno}" text-anchor="middle">${marco.turno === 'diurno' ? '☀️ diurno' : '🌙 noturno'}</text>`;
  });

  const marcacoesTempo = posicionarRotulosSemSobreposicao_(candidatosHorario, yLabelLinha0, yLabelLinha1);
  const linhaEixoBase = `<line x1="0" y1="${yBaseEixo}" x2="${largura}" y2="${yBaseEixo}" stroke="#e1e6ec" stroke-width="1"></line>`;

  return `
    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:${altura}px; display:block;">
      ${fundos}
      ${linhaEixoBase}
      ${divisoriasTurno}
      ${linhaPrevisto}
      ${linhas}
      ${marcacoesTempo}
    </svg>
  `;
}

/**
 * Recebe rótulos candidatos (x, texto, anchor) e distribui em 2 "linhas"
 * alternadas sempre que a largura estimada do texto invadiria o vizinho —
 * evita um horário colar em cima do outro.
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

/* ============ MODO "resumo": 1 valor por turno/dia (mais de 4 plantões) ============ */

function renderizarGraficoResumo(data, container) {
  if (!data.especialidades || data.especialidades.length === 0) {
    container.innerHTML = '<div class="empty-state">Ainda não há registros nesse período.</div>';
    return;
  }

  const cabecalho = data.escopo === 'unidade'
    ? data.unidade.nome
    : 'Todas as unidades — soma das especialidades em comum';

  container.innerHTML = `<div style="margin-bottom:8px; font-weight:600; color:var(--navy-700); font-size:0.85rem;">${cabecalho}</div>` +
    `<p class="hint" style="margin-top:0;">Período longo — mostrando o último valor registrado em cada plantão, em vez da variação por horário.</p>` +
    data.especialidades.map(function (esp) {
      return `
        <div style="margin-bottom:26px;">
          <div style="font-size:0.88rem; font-weight:600; margin-bottom:4px;">${esp.nome}</div>
          ${gerarGraficoResumoSVG(esp)}
        </div>
      `;
    }).join('');
}

/**
 * Um valor por turno/dia (barras), com fundo/ícone diferenciando diurno de
 * noturno, e o previsto marcado como um tracinho na altura certa de cada barra.
 */
function gerarGraficoResumoSVG(esp) {
  const pontos = esp.pontos;
  const largura = 900, altura = 130, margemBaixo = 34, margemTopo = 20, margemLados = 6;
  const areaLargura = largura - margemLados * 2;
  const larguraColuna = areaLargura / pontos.length;
  const larguraBarra = Math.min(larguraColuna * 0.5, 34);

  const maxY = Math.max(
    Math.max.apply(null, pontos.map(function (p) { return p.previsto; }).concat([0])),
    Math.max.apply(null, pontos.map(function (p) { return p.quantidade; }).concat([0])),
    1
  );
  const yBase = altura - margemBaixo;
  const escalaY = q => yBase - (q / maxY) * (yBase - margemTopo);

  let svgConteudo = '';

  pontos.forEach(function (p, i) {
    const xColuna = margemLados + i * larguraColuna;
    const xCentro = xColuna + larguraColuna / 2;
    const corFundo = p.turno === 'diurno' ? COR_FUNDO_DIURNO : COR_FUNDO_NOTURNO;
    svgConteudo += `<rect x="${xColuna}" y="${margemTopo - 10}" width="${larguraColuna}" height="${yBase - margemTopo + 10}" fill="${corFundo}"></rect>`;

    if (i > 0) {
      svgConteudo += `<line x1="${xColuna}" y1="${margemTopo - 10}" x2="${xColuna}" y2="${yBase}" stroke="#e1e6ec" stroke-width="1"></line>`;
    }

    const corBarra = p.quantidade >= p.previsto ? CORES_TENDENCIA.verde : CORES_TENDENCIA.vermelho;
    const yBarraTopo = escalaY(p.quantidade);
    const xBarra = xCentro - larguraBarra / 2;
    svgConteudo += `<rect x="${xBarra}" y="${yBarraTopo}" width="${larguraBarra}" height="${yBase - yBarraTopo}" rx="3" fill="${corBarra}"></rect>`;
    svgConteudo += `<text x="${xCentro}" y="${yBarraTopo - 6}" font-size="10" font-weight="700" fill="${corBarra}" text-anchor="middle">${p.quantidade}</text>`;

    // tracinho do previsto na altura certa
    const yPrevisto = escalaY(p.previsto);
    svgConteudo += `<line x1="${xBarra - 4}" y1="${yPrevisto}" x2="${xBarra + larguraBarra + 4}" y2="${yPrevisto}" stroke="${CORES_TENDENCIA.previsto}" stroke-width="1.5" stroke-dasharray="2,2"></line>`;

    // rótulo embaixo: data + ícone de turno
    const dataCurta = p.data.slice(8, 10) + '/' + p.data.slice(5, 7);
    svgConteudo += `<text x="${xCentro}" y="${altura - 20}" font-size="9" fill="#5b6773" text-anchor="middle">${dataCurta}</text>`;
    svgConteudo += `<text x="${xCentro}" y="${altura - 7}" font-size="10" text-anchor="middle">${p.turno === 'diurno' ? '☀️' : '🌙'}</text>`;
  });

  const linhaEixoBase = `<line x1="0" y1="${yBase}" x2="${largura}" y2="${yBase}" stroke="#e1e6ec" stroke-width="1"></line>`;

  return `
    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:${altura}px; display:block;">
      ${svgConteudo}
      ${linhaEixoBase}
    </svg>
  `;
}

// --- inicialização e auto-refresh ---
carregarTempoReal();
carregarTendencia();
setInterval(carregarTempoReal, 25000);
