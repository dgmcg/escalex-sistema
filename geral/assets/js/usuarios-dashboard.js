const gestorGeral = EscalexSession.obter('geral');
if (!gestorGeral) window.location.href = 'index.html';

function mostrarAlerta(msg, tipo) {
  document.getElementById('alertBox').innerHTML = `<div class="alert alert-${tipo}">${msg}</div>`;
}

async function carregarUsuarios() {
  const container = document.getElementById('listaUsuarios');
  const resp = await EscalexAPI.get('listarUsuariosDashboard');

  if (!resp.ok) {
    container.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
    return;
  }

  if (resp.data.length === 0) {
    container.innerHTML = '<div class="hint">Nenhum usuário do Dashboard cadastrado ainda.</div>';
    return;
  }

  container.innerHTML = resp.data.map(function (u) {
    return `
      <div class="usuario-row">
        <div>
          <div class="nome">${u.nome_completo} ${u.ativo ? '' : '<span class="badge-inativo">Inativo</span>'}</div>
          <div class="meta">@${u.username}</div>
        </div>
        <div class="acoes">
          <button onclick="resetarSenha('${u.id_usuario_dash}')">Resetar senha</button>
          <button onclick="alternarAtivo('${u.id_usuario_dash}', ${!u.ativo})">${u.ativo ? 'Desativar' : 'Reativar'}</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('btnCriarUsuario').addEventListener('click', async function () {
  const botao = this;
  const nome = document.getElementById('novoNome').value.trim();
  const senha = document.getElementById('novaSenha').value.trim();

  if (!nome) { mostrarAlerta('Informe o nome do usuário.', 'error'); return; }

  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = 'Criando…';

  try {
    const resp = await EscalexAPI.post('criarUsuarioDashboard', { dados: { nome_completo: nome, senha: senha || undefined } });
    if (!resp.ok) { mostrarAlerta(resp.erro, 'error'); return; }
    mostrarAlerta(`Usuário criado: ${resp.data.username} (senha: ${senha || '123'})`, 'success');
    document.getElementById('novoNome').value = '';
    document.getElementById('novaSenha').value = '';
    carregarUsuarios();
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
});

async function resetarSenha(id) {
  const resp = await EscalexAPI.post('resetarSenhaUsuarioDashboard', { dados: { id_usuario_dash: id } });
  mostrarAlerta(resp.ok ? 'Senha resetada para "123".' : resp.erro, resp.ok ? 'success' : 'error');
}

async function alternarAtivo(id, novoValor) {
  const resp = await EscalexAPI.post('alternarAtivoUsuarioDashboard', { dados: { id_usuario_dash: id, ativo: novoValor } });
  if (!resp.ok) { mostrarAlerta(resp.erro, 'error'); return; }
  mostrarAlerta(resp.data.mensagem, 'success');
  carregarUsuarios();
}

carregarUsuarios();
