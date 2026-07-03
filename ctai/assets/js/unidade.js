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

  if (resp.data.plantoes.length === 0) {
    container.innerHTML = '<div class="hint">Nenhum plantão registrado nesta data.</div>';
    return;
  }

  container.innerHTML = resp.data.plantoes.map(renderizarPlantaoCard).join('');
}

function renderizarPlantaoCard(p) {
  const comparacaoHtml = p.comparacao.map(function (c) {
    const labelStatus = { igual: 'igual ao previsto', faltante: 'abaixo do previsto', excedente: 'acima do previsto' }[c.status];
    return `
      <div class="comparacao-item">
        <span>${c.especialidade}</span>
        <span class="status-${c.status}">${c.registrado} / ${c.previsto ?? '—'} (${labelStatus})</span>
      </div>
    `;
  }).join('');

  const obsHtml = p.observacao ? `<div class="obs-usuario">💬 ${p.observacao}</div>` : '';

  const fotosHtml = `
    <div class="fotos-mini">
      ${p.foto_escala_url ? `<a href="${p.foto_escala_url}" target="_blank">Ver foto da escala</a>` : ''}
      ${p.assinatura_url ? `<a href="${p.assinatura_url}" target="_blank">Ver assinatura</a>` : ''}
      ${p.geolocalizacao ? `<a href="https://www.google.com/maps?q=${p.geolocalizacao}" target="_blank">Ver localização</a>` : ''}
    </div>
  `;

  const acoesHtml = p.fiscalizado
    ? `<div class="ja-fiscalizado">✓ Já fiscalizado (${p.tipo_validacao === 'total' ? 'validação total' : 'com ressalva'})</div>`
    : `
      <div class="val-actions">
        <button class="btn-total" onclick="validar('${p.id_plantao}', 'total')">Validar total</button>
        <button class="btn-ressalva" onclick="validar('${p.id_plantao}', 'com_ressalva')">Validar com ressalva</button>
      </div>
    `;

  return `
    <div class="plantao-card">
      <div class="cabecalho">
        <span class="badge badge-${p.turno}">${p.turno === 'diurno' ? 'Diurno' : 'Noturno'}</span>
        <span class="hint" style="margin:0;">${new Date(p.registrado_em).toLocaleString('pt-BR')}</span>
      </div>
      ${comparacaoHtml}
      ${obsHtml}
      ${fotosHtml}
      ${acoesHtml}
    </div>
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
  mostrarAlerta('Registro validado.', 'success');
  carregarFiscalizacao();
}

carregarDetalhe();
carregarFiscalizacao();
