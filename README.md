Escalex — Núcleo (Escalas Médicas + Gestão CTAI)
Scaffold inicial: frontend estático (GitHub Pages) + backend Apps Script (API) + Google Sheets (banco).
O que já está pronto
`SCHEMA.md` — desenho completo das abas do Google Sheets.
`apps-script/` — backend: `Code.gs` (roteador), `Auth.gs` (login/troca de senha/reset/criação de usuário e gestor), `Plantao.gs` (registro/atualização), `Gestao.gs` (CRUD de unidade/especialidade + fiscalização), `Utils.gs` (hash, Drive, leitura/escrita genérica de abas), `Seed.gs` (dados de teste).
`index.html` + `login.js` — tela de login do app.
`trocar-senha.html` — troca obrigatória no primeiro acesso.
`plantao.html` + `plantao.js` + `signature.js` — formulário completo: especialidades dinâmicas, foto (câmera e galeria separadas), assinatura em canvas, geolocalização com mapa visual (Leaflet), campos automáticos não editáveis.
`assets/css/style.css` — identidade visual (navy + dourado do brasão, tipografia Fraunces/Inter).
`ctai/` — módulo Gestão CTAI (web, separado do app):
`index.html` + `login-ctai.js` — login do gestor.
`unidades.html` + `unidades.js` — tela inicial: lista de unidades + criação rápida.
`unidade.html` + `unidade.js` — tela de unidade com 2 abas: Fiscalização (plantões do dia, comparação previsto x registrado com destaque de excedente/faltante, observação do usuário em realce, links pra foto/assinatura/mapa, validação total ou com ressalva) e Configurações (especialidades + quantitativo previsto, cadastro de usuários do app, reset de senha).
Como testar o módulo CTAI
No editor do Apps Script, rode de novo `seedDadosTeste` (agora ele também cria um gestor de teste — confira o username no log, senha `123`).
Suba a pasta `ctai/` inteira pro mesmo repositório GitHub (ela referencia `../assets/...`, então precisa ficar dentro da pasta `escalex`, no mesmo nível de `index.html`).
Acesse `seudominio.github.io/escalex-sistema/ctai/` no navegador, faça login com o gestor de teste.
Clique na unidade criada pelo seed → aba Configurações pra conferir especialidades/usuários → aba Fiscalização pra ver o plantão que você registrou no app comparado com o previsto.
O que falta para rodar de ponta a ponta (próxima sessão)
Criar a planilha "Escalex_DB" com as abas descritas em `SCHEMA.md` (posso gerar isso pronto via Apps Script `onOpen`/script de setup, ou te entrego um .xlsx pra importar).
Criar o projeto Apps Script, colar os 4 arquivos `.gs`, substituir `SHEET_ID` e `DRIVE_ROOT_FOLDER_ID` em `Utils.gs`.
Publicar como Web App (Implantar → Nova implantação → Executar como "Eu", Acesso "Qualquer pessoa") e colar a URL `.../exec` em `assets/js/api.js` (`API_URL`).
Cadastrar manualmente 1-2 unidades e usuários de teste direto na planilha (o CRUD via tela do módulo CTAI ainda não foi construído — por ora, cadastro é manual na planilha para validar o fluxo do app).
Publicar no GitHub Pages (branch `main` ou `gh-pages`, pasta raiz) e testar no Android real: login → preencher plantão → foto → assinatura → geolocalização → salvar.
Gerar os ícones do PWA (`assets/img/icon-192.png` e `icon-512.png`) — posso criar a partir do ícone do calendário já usado no login.
Ainda não construído (próximas fases)
Deleção/inativação de unidades e usuários pela interface (hoje só criação/edição).
Verificação preditiva de similaridade de assinatura (heurística — não é biometria forense).
Alerta automático de plantão não preenchido.
Emissão de relatórios (PDF/planilha) e gráficos no CTAI.
Aba "Arquivo" de plantões encerrados dentro do próprio app.
Módulos Projetos (sazonalidade) na interface — já existe no schema/backend, falta tela.
Módulos Dashboards, Gestão Documental e Gestão Geral do Sistema.
Decisões já tomadas (conforme conversa)
Substitui totalmente o sistema anterior em AppSheet/Power BI.
Piloto inicial com 1-2 unidades antes de expandir.
Dashboard com refresh de 20-30s (sem necessidade de real-time instantâneo).
Teste em Android real assim que o piloto estiver publicado.
