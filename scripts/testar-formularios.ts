/**
 * Testa os schemas Zod contra o que os formulários realmente enviam.
 *
 * Existe por causa de um bug real: um <select> desabilitado não entra no
 * FormData, e o campo chegava como `undefined` num schema que exigia string —
 * o formulário reprovava por um campo que ele mesmo havia desabilitado. Todo
 * campo opcional precisa aceitar ausente, vazio e nulo.
 *
 *   npm run test:forms
 */
import { atendimentoSchema, conclusaoSchema, interacaoSchema, mudancaStatusSchema } from "../lib/schemas/atendimentos";
import { clienteSchema, contatoSchema, filialSchema } from "../lib/schemas/cadastros";
import { conhecimentoSchema } from "../lib/schemas/conhecimento";
import { criarUsuarioSchema } from "../lib/schemas/equipe";
import { mensagemSchema, pedidoSchema } from "../lib/schemas/meus-atendimentos";

const UUID = "3f1e6b6a-2c4d-4f8a-9a1b-7c2d5e8f0a11";

let passou = 0;
const falhas: string[] = [];

function verificar(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) {
    passou += 1;
    console.log(`  ok   ${nome}`);
  } else {
    falhas.push(nome);
    console.error(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

function aceita(nome: string, schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, dados: unknown) {
  const r = schema.safeParse(dados);
  verificar(
    nome,
    r.success,
    r.success ? "" : r.error!.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join("; "),
  );
  return r;
}

function recusa(nome: string, schema: { safeParse: (v: unknown) => { success: boolean } }, dados: unknown) {
  verificar(nome, !schema.safeParse(dados).success, "o schema aceitou o que deveria recusar");
}

// ─── Atendimento ─────────────────────────────────────────────────────────────

const atendimentoMinimo = {
  cliente_id: UUID,
  titulo: "NF-e rejeitada com erro 539",
  canal: "telefone",
  tipo: "duvida",
  prioridade: "media",
};

// Selects desabilitados não são enviados: subcategoria, filial e contato somem.
const r1 = aceita("atendimento sem os campos desabilitados", atendimentoSchema, atendimentoMinimo);
if (r1.success) {
  const dados = atendimentoSchema.parse(atendimentoMinimo);
  verificar("campo ausente vira null", dados.subcategoria_id === null && dados.filial_id === null);
}

aceita("atendimento com opcionais vazios", atendimentoSchema, {
  ...atendimentoMinimo,
  categoria_id: "",
  subcategoria_id: "",
  filial_id: "",
  contato_id: "",
  sistema_id: "",
  descricao: "",
});

recusa("atendimento sem título", atendimentoSchema, { ...atendimentoMinimo, titulo: "" });
recusa("atendimento sem cliente", atendimentoSchema, { ...atendimentoMinimo, cliente_id: "" });
recusa("atendimento com uuid inválido", atendimentoSchema, {
  ...atendimentoMinimo,
  filial_id: "abc",
});

// ─── Interação ───────────────────────────────────────────────────────────────

aceita("interação sem informar minutos", interacaoSchema, {
  atendimento_id: UUID,
  tipo: "nota",
  conteudo: "Cliente retornou a ligação",
});

const comMinutos = interacaoSchema.safeParse({
  atendimento_id: UUID,
  tipo: "nota",
  conteudo: "Ajuste aplicado",
  tempo_gasto_minutos: "25",
});
verificar(
  "minutos chegam como número",
  comMinutos.success && (comMinutos as { data: { tempo_gasto_minutos: number } }).data.tempo_gasto_minutos === 25,
);

recusa("interação sem conteúdo", interacaoSchema, {
  atendimento_id: UUID,
  tipo: "nota",
  conteudo: "   ",
});

// ─── Mudança de status ───────────────────────────────────────────────────────

aceita("status comum não exige justificativa", mudancaStatusSchema, {
  atendimento_id: UUID,
  status: "em_andamento",
});

recusa("aguardando cliente exige dizer o que se aguarda", mudancaStatusSchema, {
  atendimento_id: UUID,
  status: "aguardando_cliente",
});

aceita("aguardando cliente com justificativa", mudancaStatusSchema, {
  atendimento_id: UUID,
  status: "aguardando_cliente",
  aguardando_o_que: "cliente enviar o XML",
});

// ─── Conclusão ───────────────────────────────────────────────────────────────

recusa("conclusão sem solução", conclusaoSchema, {
  atendimento_id: UUID,
  solucao: "",
  faturavel: false,
});

aceita("conclusão com solução e sem faturável marcado", conclusaoSchema, {
  atendimento_id: UUID,
  solucao: "Reemitida a nota com nova numeração",
  faturavel: false,
});

// ─── Cadastros ───────────────────────────────────────────────────────────────

aceita("cliente só com razão social", clienteSchema, {
  razao_social: "Padaria Estrela",
  tipo: "PJ",
  status: "ativo",
  contrato_tipo: "avulso",
  documento: "",
  uf: "",
  email: "",
  horas_contratadas: "",
  nome_fantasia: "",
  codigo: "",
  segmento: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  telefone: "",
  site: "",
  observacoes: "",
});

recusa("cliente com CNPJ de tamanho errado", clienteSchema, {
  razao_social: "Teste",
  tipo: "PJ",
  status: "ativo",
  contrato_tipo: "avulso",
  documento: "123",
});

aceita("filial sem endereço", filialSchema, {
  cliente_id: UUID,
  nome: "Filial Centro",
  matriz: false,
  ativo: true,
});

aceita("contato sem filial", contatoSchema, {
  cliente_id: UUID,
  filial_id: "",
  nome: "Joana",
  principal: false,
  ativo: true,
});

recusa("contato com e-mail inválido", contatoSchema, {
  cliente_id: UUID,
  filial_id: "",
  nome: "Joana",
  email: "joana@",
  principal: false,
  ativo: true,
});

// Equipe: o select de cliente só existe para o solicitante (nos outros papéis nem é enviado).
const tecnico = aceita("usuário técnico sem o campo cliente", criarUsuarioSchema, {
  nome: "Ana",
  email: "ana@exemplo.com.br",
  role: "tecnico",
});
verificar(
  "técnico não fica ligado a cliente",
  tecnico.success && (tecnico as unknown as { data: { cliente_id: unknown } }).data.cliente_id === null,
);
recusa("solicitante sem cliente", criarUsuarioSchema, {
  nome: "Bruno",
  email: "bruno@padaria.com.br",
  role: "solicitante",
  cliente_id: "",
});
aceita("solicitante com cliente", criarUsuarioSchema, {
  nome: "Bruno",
  email: "bruno@padaria.com.br",
  role: "solicitante",
  cliente_id: UUID,
});
aceita("usuário só da agenda", criarUsuarioSchema, {
  nome: "Carla",
  email: "carla@exemplo.com.br",
  role: "agenda",
});
recusa("ninguém nasce owner pelo formulário", criarUsuarioSchema, {
  nome: "Dora",
  email: "dora@exemplo.com.br",
  role: "owner",
});

// Meus atendimentos (funcionário do cliente)
aceita("pedido com assunto e descrição", pedidoSchema, {
  titulo: "Impressora parada",
  descricao: "A impressora do caixa não imprime desde ontem.",
});
recusa("pedido sem descrição", pedidoSchema, { titulo: "Impressora parada", descricao: "" });
recusa("mensagem vazia", mensagemSchema, { atendimento_id: UUID, conteudo: "   " });

// Base de conhecimento
aceita("comando só com o essencial", conhecimentoSchema, {
  tipo: "select",
  titulo: "Estoque negativo",
  descricao: "Lista produtos com saldo menor que zero",
  comando: "select * from estoque where saldo < 0",
});
recusa("item sem sessão", conhecimentoSchema, { titulo: "Estoque negativo", descricao: "Lista produtos", comando: "select 1" });
recusa("comando sem SQL", conhecimentoSchema, { tipo: "select", titulo: "Estoque negativo", descricao: "Lista produtos", comando: "  " });
aceita("comando sem descrição", conhecimentoSchema, { tipo: "select", titulo: "Estoque negativo", comando: "select 1" });

console.log(`\n${passou} verificações passaram, ${falhas.length} falharam`);
if (falhas.length > 0) process.exit(1);
