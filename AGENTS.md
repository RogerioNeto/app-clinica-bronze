<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Feita de Bronze — Documentação do Sistema

## Fluxo de Agendamento (src/app/agendar/page.tsx)

1. **Etapa 1**: Cliente preenche nome, apelido, WhatsApp e escolhe unidade
2. **Etapa 2**: Seleciona procedimentos (múltiplos)
3. **Etapa 3**: Escolhe data e horário (com validação de domingos/feriados)
4. **Confirmação**: Sistema verifica se o horário está ocupado:
   - **Livre** → status `AGUARDANDO_SINAL` (pré-aprovado automático)
     - WhatsApp enviado à cliente com: valor do sinal (50%), chave PIX, link da anamnese
   - **Ocupado (encaixe)** → status `AGUARDANDO_APROVACAO`
     - WhatsApp enviado à cliente avisando que está pendente
     - WhatsApp enviado ao admin (se `admin_whatsapp` configurado) notificando horário duplicado

## Fluxo de Administração (src/app/admin/page.tsx)

### Aba "Solicitações da Bio"
- **AGUARDANDO_APROVACAO** → Botões: "Pré-Aprovar", "Recusar", "WhatsApp"
- **AGUARDANDO_SINAL** → Botão: "Confirmar Sinal" (valida anamnese + registra entrada no caixa), "WhatsApp"
- **CONFIRMADO** → Botão: "WhatsApp"
- **CANCELADO** → Nenhuma ação
- **CONCLUÍDO** → Nenhuma ação

### Aba "Consumo e Comanda"
- **Bloqueio de anamnese**: Ao selecionar cliente, sistema verifica se anamnese foi preenchida
  - Sem anamnese → banner vermelho + bloqueio de lançamento de itens
  - Com anamnese → liberado para lançar produtos e fechar conta
- **Fechamento**: Valida anamnese novamente, registra no fluxo de caixa, altera status para CONCLUÍDO

### Aba "Configurações"
- `admin_whatsapp`: Número do admin para receber notificações de horários duplicados

## Login (src/app/login/page.tsx)
- Autenticação via Supabase Auth (email/senha)
- Toggle de visualização de senha (ícone olho)

## Anamnese (src/app/anamnese/page.tsx)
- Formulário de saúde obrigatório antes do atendimento
- Vinculado ao agendamento via URL parameter `?id=`
- Campos: histórico clínico, restrições UV, hábitos
