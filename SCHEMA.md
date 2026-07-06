# Escalex — Schema do Banco (Google Sheets)

Planilha única "Escalex_DB", uma aba por entidade. Cada aba tem cabeçalho fixo na linha 1 (não mover/renomear colunas sem atualizar o Apps Script).

## Aba: Unidades
| Coluna | Tipo | Descrição |
|---|---|---|
| id_unidade | string (UUID) | chave primária |
| nome | string | nome da unidade |
| tipo | string | Hospital / UPA / UPAE |
| ativo | boolean | true/false |
| hora_inicio_diurno | string "HH:mm" | ex: "07:00" — padrão se vazio |
| hora_inicio_noturno | string "HH:mm" | ex: "19:00" — padrão se vazio |
| criado_em | datetime | |

## Aba: Especialidades_Unidade
Define quais especialidades cada unidade preenche e a quantidade prevista (oculta do app).
| Coluna | Tipo | Descrição |
|---|---|---|
| id_especialidade | string (UUID) | chave primária |
| id_unidade | string | FK -> Unidades |
| nome_especialidade | string | ex: "Clínica Médica", "Pediatria" |
| qtd_prevista_diurno | number | |
| qtd_prevista_noturno | number | |
| id_projeto | string (opcional) | FK -> Projetos, null se for especialidade padrão |
| ativo | boolean | |

## Aba: Projetos
Ex.: sazonalidade — agrupa especialidades extras que aparecem separadas no formulário do app.
| Coluna | Tipo | Descrição |
|---|---|---|
| id_projeto | string (UUID) | chave primária |
| id_unidade | string | FK -> Unidades |
| nome_projeto | string | |
| data_inicio | date | |
| data_fim | date | |
| ativo | boolean | |

## Aba: Usuarios_App
Usuários do aplicativo Escalas Médicas (cadastrados via CTAI).
| Coluna | Tipo | Descrição |
|---|---|---|
| id_usuario | string (UUID) | chave primária |
| id_unidade | string | FK -> Unidades |
| nome_completo | string | |
| username | string | primeiro_nome.ultimo_nome (minúsculo, único) |
| senha_hash | string | SHA-256 + salt |
| salt | string | |
| primeiro_acesso | boolean | true força troca de senha |
| matricula | string | |
| registro_conselho | string | opcional |
| funcao | string | |
| email_corporativo | string | |
| foto_assinatura_url | string | link Drive da assinatura de referência (cadastro) |
| ativo | boolean | |
| criado_em | datetime | |

## Aba: Usuarios_Gestores
Usuários do módulo CTAI (podem existir vários gestores).
| Coluna | Tipo | Descrição |
|---|---|---|
| id_gestor | string (UUID) | |
| nome_completo | string | |
| username | string | |
| senha_hash | string | |
| salt | string | |
| email_corporativo | string | |
| ativo | boolean | |

## Aba: Plantoes
Registro (e atualização) de plantão. Cada atualização gera nova linha com id_registro_anterior apontando pra anterior — mantém histórico completo em vez de sobrescrever.
| Coluna | Tipo | Descrição |
|---|---|---|
| id_plantao | string (UUID) | chave primária deste registro |
| id_registro_anterior | string (opcional) | preenchido se for atualização |
| id_unidade | string | FK |
| turno | string | diurno / noturno |
| data_referencia | date | data do plantão (não a do registro) |
| id_usuario | string | FK -> Usuarios_App (quem registrou/atualizou) |
| quantidades_json | string (JSON) | { "id_especialidade": quantidade, ... } |
| observacao | string | |
| foto_escala_url | string | link Drive |
| foto_validada | boolean | true se usuário validou a foto anterior sem trocar |
| assinatura_base64 | string | salva como arquivo no Drive, coluna guarda o link |
| assinatura_url | string | |
| geolocalizacao | string | "lat,lng" |
| registrado_em | datetime | |
| status | string | ativo / arquivado |
| fiscalizado | boolean | |
| fiscalizado_por | string | FK -> Usuarios_Gestores |
| fiscalizado_em | datetime | |
| tipo_validacao | string | total / com_ressalva |
| observacao_gestor | string | |

## Aba: Log_Auditoria
| Coluna | Tipo | Descrição |
|---|---|---|
| id_log | string | |
| entidade | string | ex: "Plantoes" |
| id_entidade | string | |
| acao | string | criar/editar/validar/excluir |
| usuario | string | quem fez |
| timestamp | datetime | |
| detalhes_json | string | |

---

### Decisões de design
- **Fotos e assinaturas não ficam em base64 na planilha** — vão para pastas no Google Drive (`/Escalex/Fotos_Escala/{id_unidade}/`, `/Escalex/Assinaturas/{id_unidade}/`), e o Sheets guarda só a URL. Evita estourar limite de célula e deixa leitura/carregamento do painel muito mais rápido.
- **Histórico em vez de sobrescrita**: cada atualização de plantão é uma nova linha, ligada pela `id_registro_anterior`. Isso dá trilha de auditoria automática e resolve a regra de "mostrar o que foi preenchido da última vez" sem precisar de tabela extra.
- **`LockService`** obrigatório em toda escrita na aba `Plantoes` para evitar corrida entre usuários simultâneos.
