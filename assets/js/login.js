document.getElementById('formLogin').addEventListener('submit', async function (ev) {
  ev.preventDefault();

  const username = document.getElementById('username').value.trim().toLowerCase();
  const senha = document.getElementById('senha').value;
  const btn = document.getElementById('btnEntrar');
  const alertBox = document.getElementById('alertBox');

  alertBox.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const resp = await EscalexAPI.post('login', { username, senha, tipo: 'usuario' });

    if (!resp.ok) {
      alertBox.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
      return;
    }

    EscalexSession.salvar(resp.data.usuario);

    if (resp.data.precisaTrocarSenha) {
      window.location.href = 'trocar-senha.html';
    } else {
      window.location.href = 'plantao.html';
    }
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">Falha de conexão. Verifique sua internet e tente novamente.</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
