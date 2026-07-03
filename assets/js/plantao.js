let contexto = null;
let signaturePad = null;
let geolocalizacaoAtual = null;
let fotoBase64Nova = null;
let usarFotoAnterior = false;

const usuario = EscalexSession.obter();
if (!usuario) window.location.href = 'index.html';

async function iniciar() {
  signaturePad = iniciarSignaturePad('signaturePad');
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000 * 30);
  capturarGeolocalizacao();

  const resp = await EscalexAPI.get('contextoFormulario', { id_usuario: usuario.id_usuario });
  document.getElementById('loadingScreen').style.display = 'none';

  if (!resp.ok) {
    mostrarAlerta(resp.erro, 'error');
    return;
  }

  contexto = resp.data;
  montarTela();
}

function atualizarRelogio() {
  const agora = new Date();
  document.getElementById('dataHoraAtual').textContent = agora.toLocaleString('pt-BR');
  document.getElementById('roDataHora').textContent = agora.toLocaleString('pt-BR');
}

function capturarGeolocalizacao() {
  const dot = document.getElementById('geoDot');
  const texto = document.getElementById('geoTexto');

  if (!navigator.geolocation) {
    dot.className = 'geo-dot';
    texto.textContent = 'Geolocalização não suportada neste navegador.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      geolocalizacaoAtual = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
      dot.className = 'geo-dot ok';
      texto.textContent = 'Localização capturada.';
    },
    function () {
      dot.className = 'geo-dot';
      texto.textContent = 'Não foi possível obter a localização. Verifique a permissão de GPS.';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function montarTela() {
  document.getElementById('unidadeNome').textContent = contexto.unidadeNomeExibicao || contexto.unidade;
  document.getElementById('roNome').textContent = contexto.usuario.nome_completo;
  document.getElementById('roMatricula').textContent =
    [contexto.usuario.matricula, contexto.usuario.registro_conselho].filter(Boolean).join(' · ');

  const badge = document.getElementById('badgeTurno');
  badge.textContent = contexto.turno === 'diurno' ? 'Plantão diurno' : 'Plantão noturno';
  badge.className = 'badge badge-' + contexto.turno;

  const anterior = contexto.plantaoVigente;
  const quantidadesAnteriores = anterior ? JSON.parse(anterior.quantidades_json || '{}') : {};

  const lista = document.getElementById('listaEspecialidades');
  lista.innerHTML = '';
  contexto.especialidades.forEach(function (esp) {
    const valorAnterior = quantidadesAnteriores[esp.id_especialidade];
    const row = document.createElement('div');
    row.className = 'qty-row';
    row.innerHTML = `
      <label for="qtd_${esp.id_especialidade}">
        ${esp.nome_especialidade}
        ${valorAnterior !== undefined ? `<div class="hint previous">Último registro: ${valorAnterior}</div>` : ''}
      </label>
      <input type="number" min="0" step="1" inputmode="numeric"
             id="qtd_${esp.id_especialidade}" data-id="${esp.id_especialidade}"
             value="${valorAnterior !== undefined ? '' : 0}" required>
    `;
    lista.appendChild(row);
  });

  if (anterior) {
    document.getElementById('observacao').placeholder =
      anterior.observacao ? `Último registro: "${anterior.observacao}"` : 'Alguma informação relevante sobre este plantão?';

    if (anterior.foto_escala_url) {
      document.getElementById('fotoAnteriorBloco').style.display = 'block';
      document.getElementById('fotoNovaBloco').style.display = 'none';
      document.getElementById('fotoAnteriorImg').src = anterior.foto_escala_url;
    }
  }
}

document.getElementById('btnValidarFoto').addEventListener('click', function () {
  usarFotoAnterior = true;
  mostrarAlerta('Foto anterior confirmada como válida.', 'success');
});

document.getElementById('btnNovaFoto').addEventListener('click', function () {
  usarFotoAnterior = false;
  document.getElementById('fotoAnteriorBloco').style.display = 'none';
  document.getElementById('fotoNovaBloco').style.display = 'block';
});

document.getElementById('inputFoto').addEventListener('change', function (ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    fotoBase64Nova = reader.result;
    const preview = document.getElementById('previewFoto');
    preview.src = fotoBase64Nova;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

document.getElementById('btnLimparAssinatura').addEventListener('click', function () {
  signaturePad.limpar();
});

document.getElementById('formPlantao').addEventListener('submit', async function (ev) {
  ev.preventDefault();

  if (signaturePad.estaVazio()) {
    mostrarAlerta('É necessário assinar antes de salvar.', 'error');
    return;
  }
  if (!usarFotoAnterior && !fotoBase64Nova && !(contexto.plantaoVigente && contexto.plantaoVigente.foto_escala_url)) {
    mostrarAlerta('É necessário anexar a foto da escala.', 'error');
    return;
  }
  if (!geolocalizacaoAtual) {
    mostrarAlerta('Aguardando localização — verifique se o GPS está ativo e tente novamente.', 'error');
    return;
  }

  const quantidades = {};
  document.querySelectorAll('#listaEspecialidades input[type=number]').forEach(function (input) {
    quantidades[input.dataset.id] = Number(input.value);
  });

  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const resp = await EscalexAPI.post('registrarPlantao', {
      dados: {
        id_usuario: usuario.id_usuario,
        id_registro_anterior: contexto.plantaoVigente ? contexto.plantaoVigente.id_plantao : null,
        turnoEnviado: contexto.turno,
        quantidades: quantidades,
        observacao: document.getElementById('observacao').value,
        foto_validada: usarFotoAnterior,
        foto_escala_url_anterior: contexto.plantaoVigente ? contexto.plantaoVigente.foto_escala_url : null,
        foto_escala_base64: usarFotoAnterior ? null : fotoBase64Nova,
        assinatura_base64: signaturePad.paraBase64(),
        geolocalizacao: geolocalizacaoAtual
      }
    });

    if (!resp.ok) {
      mostrarAlerta(resp.erro, 'error');
      return;
    }

    mostrarAlerta('Plantão registrado com sucesso!', 'success');
    setTimeout(function () { window.location.reload(); }, 1200);
  } catch (err) {
    mostrarAlerta('Falha de conexão ao salvar. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar registro do plantão';
  }
});

function mostrarAlerta(msg, tipo) {
  const box = document.getElementById('alertBox');
  box.innerHTML = `<div class="alert alert-${tipo}">${msg}</div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

iniciar();
