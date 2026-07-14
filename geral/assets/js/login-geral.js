document.getElementById('formLoginGeral').addEventListener('submit', async function (ev) {
  ev.preventDefault();
  const username = document.getElementById('username').value.trim().toLowerCase();
  const senha = document.getElementById('senha').value;
  const btn = document.getElementById('btnEntrar');
  const alertBox = document.getElementById('alertBox');

  alertBox.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const resp = await EscalexAPI.post('login', { username, senha, tipo: 'gestor' });
    if (!resp.ok) {
      alertBox.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
      return;
    }
    EscalexSession.salvar(resp.data.usuario, 'geral');
    window.location.href = 'usuarios-dashboard.html';
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">Falha de conexão.</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
