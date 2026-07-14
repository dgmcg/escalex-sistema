const gestor = EscalexSession.obter();
if (!gestor) window.location.href = 'index.html';

async function carregarUnidades() {
  const resp = await EscalexAPI.get('unidades');
  const container = document.getElementById('listaUnidades');

  if (!resp.ok) {
    container.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
    return;
  }

  const ativas = resp.data.filter(function (u) { return u.ativo === true; });

  if (ativas.length === 0) {
    container.innerHTML = '<div class="hint">Nenhuma unidade cadastrada ainda.</div>';
    return;
  }

  container.innerHTML = ativas.map(function (u) {
    return `
      <div class="unidade-item" onclick="window.location.href='unidade.html?id=${u.id_unidade}'">
        <div>
          <div class="nome">${u.nome}</div>
          <div class="tipo">${u.tipo}</div>
        </div>
        <div style="color: var(--ink-soft);">→</div>
      </div>
    `;
  }).join('');
}

document.getElementById('btnNovaUnidade').addEventListener('click', function () {
  const form = document.getElementById('formNovaUnidade');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btnSalvarUnidade').addEventListener('click', async function () {
  const nome = document.getElementById('novoNome').value.trim();
  const tipo = document.getElementById('novoTipo').value;
  const alertBox = document.getElementById('alertBox');

  if (!nome) {
    alertBox.innerHTML = '<div class="alert alert-error">Informe o nome da unidade.</div>';
    return;
  }

  const resp = await EscalexAPI.post('salvarUnidade', { dados: { nome, tipo } });
  if (!resp.ok) {
    alertBox.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
    return;
  }

  document.getElementById('novoNome').value = '';
  document.getElementById('formNovaUnidade').style.display = 'none';
  alertBox.innerHTML = '<div class="alert alert-success">Unidade criada.</div>';
  carregarUnidades();
});

carregarUnidades();

let alertasAtivosAtual = true;

async function carregarConfigGlobal() {
  const resp = await EscalexAPI.get('configSistema');
  const textoStatus = document.getElementById('statusAlertasTexto');
  const botao = document.getElementById('btnToggleAlertas');

  if (!resp.ok) {
    textoStatus.textContent = 'Não foi possível carregar essa configuração.';
    botao.style.display = 'none';
    return;
  }

  alertasAtivosAtual = resp.data.alertasAtivos;
  atualizarUiConfigGlobal();
}

function atualizarUiConfigGlobal() {
  const textoStatus = document.getElementById('statusAlertasTexto');
  const botao = document.getElementById('btnToggleAlertas');
  const card = document.getElementById('cardConfigGlobal');

  if (alertasAtivosAtual) {
    textoStatus.innerHTML = '🟢 Ativados — usuários recebem lembrete por e-mail quando esquecem de registrar.';
    botao.textContent = 'Desativar';
    card.style.borderLeft = '4px solid var(--success)';
  } else {
    textoStatus.innerHTML = '⚪ Desativados — ninguém recebe e-mail de lembrete no momento.';
    botao.textContent = 'Ativar';
    card.style.borderLeft = '4px solid var(--ink-soft)';
  }
}

document.getElementById('btnToggleAlertas').addEventListener('click', async function () {
  const botao = this;
  const novoValor = !alertasAtivosAtual;

  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = 'Salvando…';

  try {
    const resp = await EscalexAPI.post('salvarConfigSistema', { dados: { alertasAtivos: novoValor } });
    if (!resp.ok) {
      document.getElementById('alertBox').innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
      return;
    }
    alertasAtivosAtual = novoValor;
    atualizarUiConfigGlobal();
  } finally {
    botao.disabled = false;
    if (botao.textContent === 'Salvando…') botao.textContent = textoOriginal;
  }
});

carregarConfigGlobal();
