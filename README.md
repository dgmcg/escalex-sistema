# Escalex — Núcleo (Escalas Médicas + Gestão CTAI)

Scaffold inicial: frontend estático (GitHub Pages) + backend Apps Script (API) + Google Sheets (banco).

## O que já está pronto
- `SCHEMA.md` — desenho completo das abas do Google Sheets.
- `apps-script/` — backend: `Code.gs` (roteador), `Auth.gs` (login/troca de senha/reset), `Plantao.gs` (registro/atualização), `Utils.gs` (hash, Drive, leitura/escrita genérica de abas).
- `index.html` + `login.js` — tela de login.
- `trocar-senha.html` — troca obrigatória no primeiro acesso.
- `plantao.html` + `plantao.js` + `signature.js` — formulário completo: especialidades dinâmicas, foto (câmera/galeria), assinatura em canvas, geolocalização, campos automáticos não editáveis.
- `assets/css/style.css` — identidade visual (navy + dourado do brasão, tipografia Fraunces/Inter).

## O que falta para rodar de ponta a ponta (próxima sessão)
1. **Criar a planilha "Escalex_DB"** com as abas descritas em `SCHEMA.md` (posso gerar isso pronto via Apps Script `onOpen`/script de setup, ou te entrego um .xlsx pra importar).
2. **Criar o projeto Apps Script**, colar os 4 arquivos `.gs`, substituir `SHEET_ID` e `DRIVE_ROOT_FOLDER_ID` em `Utils.gs`.
3. **Publicar como Web App** (Implantar → Nova implantação → Executar como "Eu", Acesso "Qualquer pessoa") e colar a URL `.../exec` em `assets/js/api.js` (`API_URL`).
4. **Cadastrar manualmente 1-2 unidades e usuários de teste** direto na planilha (o CRUD via tela do módulo CTAI ainda não foi construído — por ora, cadastro é manual na planilha para validar o fluxo do app).
5. **Publicar no GitHub Pages** (branch `main` ou `gh-pages`, pasta raiz) e testar no Android real: login → preencher plantão → foto → assinatura → geolocalização → salvar.
6. **Gerar os ícones do PWA** (`assets/img/icon-192.png` e `icon-512.png`) — posso criar a partir do ícone do calendário já usado no login.

## Ainda não construído (próximas fases)
- Módulo **Gestão CTAI** (tela web de fiscalização, CRUD de unidades/usuários/especialidades, validação total/com ressalva, relatórios, gráficos).
- Verificação preditiva de similaridade de assinatura (heurística — não é biometria forense).
- Alerta automático de plantão não preenchido.
- Aba "Arquivo" de plantões encerrados dentro do próprio app.
- Módulos Dashboards, Gestão Documental e Gestão Geral do Sistema.

## Decisões já tomadas (conforme conversa)
- Substitui totalmente o sistema anterior em AppSheet/Power BI.
- Piloto inicial com 1-2 unidades antes de expandir.
- Dashboard com refresh de 20-30s (sem necessidade de real-time instantâneo).
- Teste em Android real assim que o piloto estiver publicado.
