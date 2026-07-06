const gestor = EscalexSession.obter();
if (!gestor) window.location.href = 'index.html';

const params = new URLSearchParams(window.location.search);
const idUnidade = params.get('id');
if (!idUnidade) window.location.href = 'unidades.html';

let detalheAtual = null;

// --- abas ---
document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

function mostrarAlerta(msg, tipo) {
  document.getElementById('alertBox').innerHTML = `<div class="alert alert-${tipo}">${msg}</div>`;
}

// --- carregar detalhe da unidade (config) ---
async function carregarDetalhe() {
  const resp = await EscalexAPI.get('unidadeDetalhe', { id_unidade: idUnidade });
  if (!resp.ok) {
    mostrarAlerta(resp.erro, 'error');
    return;
  }
  detalheAtual = resp.data;
  document.getElementById('nomeUnidadeTopo').textContent = detalheAtual.unidade.nome;
  renderizarEspecialidades();
  renderizarUsuarios();
}

function renderizarEspecialidades() {
  const container = document.getElementById('listaEspecialidadesConfig');
  const ativas = detalheAtual.especialidades.filter(e => e.ativo === true);

  if (ativas.length === 0) {
    container.innerHTML = '<div class="hint">Nenhuma especialidade configurada ainda.</div>';
    return;
  }

  container.innerHTML = ativas.map(function (e) {
    return `
      <div class="esp-row">
        <div class="nome">${e.nome_especialidade}</div>
        <div>
          <div class="hint" style="margin:0;">Diurno</div>
          <input type="number" min="0" value="${e.qtd_prevista_diurno}" data-id="${e.id_especialidade}" data-campo="qtd_prevista_diurno" class="esp-input">
        </div>
        <div>
          <div class="hint" style="margin:0;">Noturno</div>
          <input type="number" min="0" value="${e.qtd_prevista_noturno}" data-id="${e.id_especialidade}" data-campo="qtd_prevista_noturno" class="esp-input">
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.esp-input').forEach(function (input) {
    input.addEventListener('change', async function () {
      const especialidade = detalheAtual.especialidades.find(e => e.id_especialidade === input.dataset.id);
      const dados = {
        id_especialidade: especialidade.id_especialidade,
        nome_especialidade: especialidade.nome_especialidade,
        qtd_prevista_diurno: especialidade.qtd_prevista_diurno,
        qtd_prevista_noturno: especialidade.qtd_prevista_noturno
      };
      dados[input.dataset.campo] = Number(input.value);

      const resp = await EscalexAPI.post('salvarEspecialidade', { dados });
      if (resp.ok) mostrarAlerta('Quantitativo atualizado.', 'success');
      else mostrarAlerta(resp.erro, 'error');
    });
  });
}

function renderizarUsuarios() {
  const container = document.getElementById('listaUsuariosConfig');
  const ativos = detalheAtual.usuarios.filter(u => u.ativo === true);

  if (ativos.length === 0) {
    container.innerHTML = '<div class="hint">Nenhum usuário cadastrado ainda.</div>';
    return;
  }

  container.innerHTML = ativos.map(function (u) {
    return `
      <div class="usuario-row">
        <div class="nome">${u.nome_completo}</div>
        <div class="meta">@${u.username} · ${u.funcao || 'sem função definida'} ${u.matricula ? '· mat. ' + u.matricula : ''}</div>
        <button onclick="resetarSenha('${u.id_usuario}')">Redefinir senha para 123</button>
      </div>
    `;
  }).join('');
}

async function resetarSenha(idUsuario) {
  const resp = await EscalexAPI.post('resetarSenhaUsuario', { id_usuario: idUsuario });
  mostrarAlerta(resp.ok ? 'Senha redefinida para 123.' : resp.erro, resp.ok ? 'success' : 'error');
}

document.getElementById('btnAddEspecialidade').addEventListener('click', async function () {
  const nome = document.getElementById('novaEspNome').value.trim();
  if (!nome) { mostrarAlerta('Informe o nome da especialidade.', 'error'); return; }

  const resp = await EscalexAPI.post('salvarEspecialidade', {
    dados: {
      id_unidade: idUnidade,
      nome_especialidade: nome,
      qtd_prevista_diurno: Number(document.getElementById('novaEspDiurno').value),
      qtd_prevista_noturno: Number(document.getElementById('novaEspNoturno').value)
    }
  });

  if (!resp.ok) { mostrarAlerta(resp.erro, 'error'); return; }
  document.getElementById('novaEspNome').value = '';
  mostrarAlerta('Especialidade adicionada.', 'success');
  carregarDetalhe();
});

document.getElementById('btnAddUsuario').addEventListener('click', async function () {
  const nome = document.getElementById('novoUsrNome').value.trim();
  if (!nome) { mostrarAlerta('Informe o nome do usuário.', 'error'); return; }

  const resp = await EscalexAPI.post('criarUsuarioApp', {
    dados: {
      id_unidade: idUnidade,
      nome_completo: nome,
      matricula: document.getElementById('novoUsrMatricula').value,
      registro_conselho: document.getElementById('novoUsrConselho').value,
      funcao: document.getElementById('novoUsrFuncao').value
    }
  });

  if (!resp.ok) { mostrarAlerta(resp.erro, 'error'); return; }
  mostrarAlerta(`Usuário criado: ${resp.data.username} (senha inicial: 123)`, 'success');
  document.getElementById('novoUsrNome').value = '';
  document.getElementById('novoUsrMatricula').value = '';
  document.getElementById('novoUsrConselho').value = '';
  document.getElementById('novoUsrFuncao').value = '';
  carregarDetalhe();
});

// --- fiscalização ---
const inputData = document.getElementById('dataFiscalizacao');
inputData.value = new Date().toISOString().slice(0, 10);
inputData.addEventListener('change', carregarFiscalizacao);

async function carregarFiscalizacao() {
  const container = document.getElementById('listaPlantoes');
  container.innerHTML = 'Carregando plantões…';

  const resp = await EscalexAPI.get('plantoesFiscalizacao', { id_unidade: idUnidade, data: inputData.value });
  if (!resp.ok) {
    container.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
    return;
  }

  container.innerHTML = resp.data.turnos.map(renderizarTurnoCard).join('');
}

const STATUS_ICONE = { verde: '✓', laranja: '⚠️', vermelho: '✗' };
const STATUS_LABEL = { verde: 'Verificado', laranja: 'Atenção', vermelho: 'Incompleto' };

function renderizarTurnoCard(t) {
  const tituloTurno = t.turno === 'diurno' ? 'Diurno (07h–19h)' : 'Noturno (19h–07h)';

  if (!t.temRegistro && !t.emAndamento) {
    return `
      <div class="plantao-card">
        <div class="cabecalho">
          <span class="badge badge-${t.turno}">${tituloTurno}</span>
          <span class="status-vermelho">✗ Nenhum registro — turno encerrado sem preenchimento</span>
        </div>
      </div>
    `;
  }

  const especialidadesHtml = t.especialidades.map(function (esp) {
    return `
      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <strong style="font-size:0.88rem;">${esp.nome}</strong>
          <span class="status-${esp.statusCor}" style="font-weight:700; font-size:0.82rem;">
            ${STATUS_ICONE[esp.statusCor]} ${esp.percentual.toFixed(2).replace('.', ',')}% — ${STATUS_LABEL[esp.statusCor]}
          </span>
        </div>
        ${gerarGraficoSVG(esp, t.intervaloInicio, t.intervaloFim)}
        <div class="hint" style="margin-top:2px;">Previsto: ${esp.previsto}</div>
      </div>
    `;
  }).join('');

  const observacoesHtml = t.observacoes.length
    ? t.observacoes.map(function (o) {
        return `<div class="obs-usuario">💬 ${o.texto} <span class="hint" style="margin:0;">(${new Date(o.registrado_em).toLocaleString('pt-BR')})</span></div>`;
      }).join('')
    : '';

  const fotosHtml = `
    <div class="fotos-mini">
      ${t.fotoUrl ? `<a href="${t.fotoUrl}" target="_blank">Ver foto da escala</a>` : ''}
      ${t.assinaturaUrl ? `<a href="${t.assinaturaUrl}" target="_blank">Ver assinatura</a>` : ''}
      ${t.geolocalizacao ? `<a href="https://www.google.com/maps?q=${t.geolocalizacao}" target="_blank">Ver localização</a>` : ''}
    </div>
  `;

  let acoesHtml;
  if (t.emAndamento) {
    acoesHtml = `<div class="hint" style="margin-top:10px;">🔴 Turno em andamento — validação disponível após o encerramento.</div>`;
  } else if (t.fiscalizado) {
    acoesHtml = `<div class="ja-fiscalizado">✓ Já fiscalizado (${t.tipoValidacao === 'total' ? 'validação total' : 'com ressalva'})</div>`;
  } else {
    acoesHtml = `
      <div class="val-actions">
        <button class="btn-total" onclick="validar('${t.ultimoIdPlantao}', 'total')">Validar plantão — total</button>
        <button class="btn-ressalva" onclick="validar('${t.ultimoIdPlantao}', 'com_ressalva')">Validar com ressalva</button>
      </div>
    `;
  }

  return `
    <div class="plantao-card">
      <div class="cabecalho">
        <span class="badge badge-${t.turno}">${tituloTurno}</span>
        ${t.emAndamento ? '<span class="hint" style="margin:0;">em andamento</span>' : ''}
      </div>
      ${especialidadesHtml}
      ${observacoesHtml}
      ${fotosHtml}
      ${acoesHtml}
    </div>
  `;
}

const CORES_STATUS = { verde: '#2f9e64', laranja: '#d9822b', vermelho: '#c94545' };

/**
 * Gera um gráfico de linha (tipo degrau) em SVG puro, sem libs externas,
 * mostrando a quantidade de profissionais presentes ao longo do turno,
 * colorido por segmento (verde = dentro do previsto, vermelho = abaixo).
 */
function gerarGraficoSVG(esp, intervaloInicio, intervaloFim) {
  const largura = 300, altura = 88, margemBaixo = 20, margemTopo = 16;
  const inicioMs = new Date(intervaloInicio).getTime();
  const fimMs = new Date(intervaloFim).getTime();
  const totalMs = fimMs - inicioMs || 1;

  const maxY = Math.max(esp.previsto, ...esp.segmentos.map(s => s.quantidade), 1);
  const escalaX = t => ((new Date(t).getTime() - inicioMs) / totalMs) * largura;
  const escalaY = q => (altura - margemBaixo) - (q / maxY) * (altura - margemBaixo - margemTopo);
  const formatarHora = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let linhas = '';
  let marcacoesTempo = '';
  const yBaseEixo = altura - margemBaixo;
  const yTextoEixo = altura - 4;

  esp.segmentos.forEach(function (seg, i) {
    const x1 = escalaX(seg.inicio), x2 = escalaX(seg.fim), y = escalaY(seg.quantidade);
    const cor = seg.compliant ? CORES_STATUS.verde : CORES_STATUS.vermelho;
    linhas += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${cor}" stroke-width="2.5" stroke-linecap="round"></line>`;

    // rótulo numérico no meio do segmento, só se o segmento tiver largura mínima pra caber o texto
    if (x2 - x1 > 18) {
      const xMeio = (x1 + x2) / 2;
      const acimaDaLinha = y > margemTopo + 8; // se a linha está muito no topo, desenha o número embaixo dela em vez de em cima
      const yTexto = acimaDaLinha ? y - 6 : y + 12;
      linhas += `<text x="${xMeio}" y="${yTexto}" font-size="10" font-weight="700" fill="${cor}" text-anchor="middle">${seg.quantidade}</text>`;
    }

    if (i < esp.segmentos.length - 1) {
      const proximo = esp.segmentos[i + 1];
      const yProx = escalaY(proximo.quantidade);
      linhas += `<line x1="${x2}" y1="${y}" x2="${x2}" y2="${yProx}" stroke="#c7cdd4" stroke-width="1.5"></line>`;
      // marca o horário exato da mudança (transição entre segmentos)
      marcacoesTempo += `<line x1="${x2}" y1="${yBaseEixo}" x2="${x2}" y2="${yBaseEixo + 3}" stroke="#9aa5b1" stroke-width="1"></line>`;
      marcacoesTempo += `<text x="${x2}" y="${yTextoEixo}" font-size="9" fill="#5b6773" text-anchor="middle">${formatarHora(seg.fim)}</text>`;
    }
  });

  // horário de início e de fim do turno, sempre nas pontas
  marcacoesTempo += `<text x="2" y="${yTextoEixo}" font-size="9" fill="#5b6773" text-anchor="start">${formatarHora(intervaloInicio)}</text>`;
  marcacoesTempo += `<text x="${largura - 2}" y="${yTextoEixo}" font-size="9" fill="#5b6773" text-anchor="end">${formatarHora(intervaloFim)}</text>`;

  const yPrevisto = escalaY(esp.previsto);
  const linhaPrevisto = `<line x1="0" y1="${yPrevisto}" x2="${largura}" y2="${yPrevisto}" stroke="#9aa5b1" stroke-width="1" stroke-dasharray="3,3"></line>`;
  const linhaEixoBase = `<line x1="0" y1="${yBaseEixo}" x2="${largura}" y2="${yBaseEixo}" stroke="#e1e6ec" stroke-width="1"></line>`;

  return `
    <svg viewBox="0 0 ${largura} ${altura}" style="width:100%; height:${altura}px; display:block;">
      ${linhaPrevisto}
      ${linhaEixoBase}
      ${linhas}
      ${marcacoesTempo}
    </svg>
  `;
}

async function validar(idPlantao, tipo) {
  let observacaoGestor = '';
  if (tipo === 'com_ressalva') {
    observacaoGestor = prompt('Descreva a discrepância identificada:') || '';
    if (!observacaoGestor) return;
  }

  const resp = await EscalexAPI.post('validarPlantao', {
    dados: { id_plantao: idPlantao, id_gestor: gestor.id_gestor, tipo_validacao: tipo, observacao_gestor: observacaoGestor }
  });

  if (!resp.ok) { mostrarAlerta(resp.erro, 'error'); return; }
  mostrarAlerta('Plantão validado.', 'success');
  carregarFiscalizacao();
}

carregarDetalhe();
carregarFiscalizacao();
