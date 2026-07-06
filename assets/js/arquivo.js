const usuario = EscalexSession.obter();
if (!usuario) window.location.href = 'index.html';

async function carregarArquivo() {
  const container = document.getElementById('listaArquivo');
  const resp = await EscalexAPI.get('arquivoPlantoes', { id_unidade: usuario.id_unidade });

  if (!resp.ok) {
    container.innerHTML = `<div class="alert alert-error">${resp.erro}</div>`;
    return;
  }

  if (resp.data.length === 0) {
    container.innerHTML = '<div class="hint">Nenhum plantão encerrado ainda. Assim que o período de registro de um plantão terminar, ele aparece aqui.</div>';
    return;
  }

  container.innerHTML = resp.data.map(renderizarCardArquivo).join('');

  document.querySelectorAll('.arquivo-card').forEach(function (card) {
    card.addEventListener('click', function () {
      card.querySelector('.arquivo-detalhe').classList.toggle('aberto');
    });
  });
}

function renderizarCardArquivo(p, index) {
  const dataFormatada = new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR');
  const turnoLabel = p.turno === 'diurno' ? 'Diurno' : 'Noturno';

  const fiscalBadge = p.fiscalizado
    ? (p.tipo_validacao === 'total'
        ? '<span class="fiscal-badge total">✓ Fiscalizado — total</span>'
        : '<span class="fiscal-badge ressalva">⚠ Fiscalizado — com ressalva</span>')
    : '<span class="fiscal-badge pendente">Aguardando fiscalização</span>';

  const quantidadesHtml = p.quantidades.map(function (q) {
    return `<div class="qtd-linha"><span>${q.nome}</span><strong>${q.quantidade}</strong></div>`;
  }).join('');

  const observacoesHtml = p.observacoes.length
    ? p.observacoes.map(function (o) {
        return `<div class="obs-usuario">💬 ${o.texto} <span class="hint" style="margin:0;">(${new Date(o.registrado_em).toLocaleString('pt-BR')})</span></div>`;
      }).join('')
    : '<div class="hint">Sem observações.</div>';

  const observacaoGestorHtml = p.observacao_gestor
    ? `<div class="obs-usuario" style="background:#fff4dd;">👤 Observação do gestor: ${p.observacao_gestor}</div>`
    : '';

  const linksHtml = `
    <div class="fotos-mini" style="margin-top:10px;">
      ${p.foto_escala_url ? `<a href="${p.foto_escala_url}" target="_blank">Ver foto da escala</a>` : ''}
      ${p.assinatura_url ? `<a href="${p.assinatura_url}" target="_blank">Ver assinatura</a>` : ''}
      ${p.geolocalizacao ? `<a href="https://www.google.com/maps?q=${p.geolocalizacao}" target="_blank">Ver localização</a>` : ''}
    </div>
  `;

  return `
    <div class="arquivo-card">
      <div class="cabecalho">
        <div>
          <div class="data">${dataFormatada} — ${turnoLabel}</div>
          <div class="hint" style="margin:2px 0 0;">${p.totalAtualizacoes} registro(s) neste plantão · toque para ver detalhes</div>
        </div>
        ${fiscalBadge}
      </div>
      <div class="arquivo-detalhe">
        <div style="margin-bottom:10px;">${quantidadesHtml}</div>
        ${observacoesHtml}
        ${observacaoGestorHtml}
        ${linksHtml}
      </div>
    </div>
  `;
}

carregarArquivo();
