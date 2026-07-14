// Escalex — cliente da API (Apps Script Web App)
// Troque API_URL pela URL de implantação do seu Web App (.../exec)
const API_URL = 'https://script.google.com/macros/s/AKfycbx81Auc-BuhXyA_PaCJIbgfj8-1IwR25ZLx6QDo3WaVvyAL5VN7nIlYy19EgFlIFRUL/exec';

const EscalexAPI = {
  async get(action, params) {
    const query = new URLSearchParams({ action, ...(params || {}) });
    const res = await fetch(`${API_URL}?${query.toString()}`);
    return res.json();
  },

  async post(action, dados) {
    const res = await fetch(API_URL, {
      method: 'POST',
      // Apps Script Web App não aceita header custom em preflight simples;
      // text/plain evita o preflight CORS e o backend faz JSON.parse manualmente.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...dados })
    });
    return res.json();
  }
};

// --- helpers de sessão local (apenas para manter o usuário logado na sessão do navegador) ---
// "tipo" é opcional — usado pra manter sessões separadas entre módulos
// (ex.: dashboard e ctai abertos em abas diferentes não se sobrescrevem).
const EscalexSession = {
  salvar(usuario, tipo) {
    sessionStorage.setItem('escalex_usuario' + (tipo ? '_' + tipo : ''), JSON.stringify(usuario));
  },
  obter(tipo) {
    const raw = sessionStorage.getItem('escalex_usuario' + (tipo ? '_' + tipo : ''));
    return raw ? JSON.parse(raw) : null;
  },
  limpar(tipo) {
    sessionStorage.removeItem('escalex_usuario' + (tipo ? '_' + tipo : ''));
  }
};
