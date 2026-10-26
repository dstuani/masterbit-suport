-- ─────────────────────────────────────────────────────────────────────────────
-- Dois papéis de acesso restrito (as regras vêm na migration seguinte):
--
--   solicitante  funcionário de um cliente: abre atendimentos para esse cliente e
--                acompanha só os que ele mesmo abriu, podendo escrever mensagens.
--   agenda       só a agenda: vê todos os eventos, cria e remarca; nunca cancela,
--                nunca marca como realizado e nunca exclui.
--
-- Arquivo separado de propósito: um valor novo de enum não pode ser usado na
-- mesma transação em que foi criado.
-- ─────────────────────────────────────────────────────────────────────────────

alter type role_usuario add value if not exists 'solicitante';
alter type role_usuario add value if not exists 'agenda';
