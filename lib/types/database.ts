/**
 * Tipos do banco — GERADO AUTOMATICAMENTE. Não edite à mão.
 *
 * Fonte: supabase/migrations/. Regenerar com `npm run db:types:local`
 * (offline) ou `npm run db:types` (a partir do projeto Supabase linkado).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          id: string;
          org_id: string;
          titulo: string;
          descricao: string | null;
          tipo: "retorno" | "visita" | "reuniao" | "tarefa" | "lembrete" | "manutencao_preventiva";
          cliente_id: string | null;
          atendimento_id: string | null;
          pendencia_id: string | null;
          responsavel_id: string | null;
          inicio: string;
          fim: string | null;
          dia_inteiro: boolean;
          local: string | null;
          status: "agendado" | "confirmado" | "realizado" | "cancelado" | "remarcado";
          lembrete_minutos: number | null;
          recorrencia: string | null;
          resultado: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          titulo: string;
          descricao?: string | null;
          tipo?: "retorno" | "visita" | "reuniao" | "tarefa" | "lembrete" | "manutencao_preventiva";
          cliente_id?: string | null;
          atendimento_id?: string | null;
          pendencia_id?: string | null;
          responsavel_id?: string | null;
          inicio: string;
          fim?: string | null;
          dia_inteiro?: boolean;
          local?: string | null;
          status?: "agendado" | "confirmado" | "realizado" | "cancelado" | "remarcado";
          lembrete_minutos?: number | null;
          recorrencia?: string | null;
          resultado?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          titulo?: string;
          descricao?: string | null;
          tipo?: "retorno" | "visita" | "reuniao" | "tarefa" | "lembrete" | "manutencao_preventiva";
          cliente_id?: string | null;
          atendimento_id?: string | null;
          pendencia_id?: string | null;
          responsavel_id?: string | null;
          inicio?: string;
          fim?: string | null;
          dia_inteiro?: boolean;
          local?: string | null;
          status?: "agendado" | "confirmado" | "realizado" | "cancelado" | "remarcado";
          lembrete_minutos?: number | null;
          recorrencia?: string | null;
          resultado?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_atendimento_id_fkey";
            columns: ["atendimento_id"];
            isOneToOne: false;
            referencedRelation: "atendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_eventos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_eventos_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_eventos_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_eventos_pendencia_id_fkey";
            columns: ["pendencia_id"];
            isOneToOne: false;
            referencedRelation: "pendencias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agenda_eventos_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      atendimento_anexos: {
        Row: {
          id: string;
          org_id: string;
          atendimento_id: string;
          caminho: string;
          nome_original: string;
          tipo_mime: string;
          tamanho_bytes: number;
          enviado_por: string | null;
          removido_em: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          atendimento_id: string;
          caminho: string;
          nome_original: string;
          tipo_mime: string;
          tamanho_bytes: number;
          enviado_por?: string | null;
          removido_em?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          atendimento_id?: string;
          caminho?: string;
          nome_original?: string;
          tipo_mime?: string;
          tamanho_bytes?: number;
          enviado_por?: string | null;
          removido_em?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "atendimento_anexos_atendimento_id_fkey";
            columns: ["atendimento_id"];
            isOneToOne: false;
            referencedRelation: "atendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimento_anexos_enviado_por_fkey";
            columns: ["enviado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimento_anexos_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      atendimento_interacoes: {
        Row: {
          id: string;
          org_id: string;
          atendimento_id: string;
          autor_id: string | null;
          tipo: "nota" | "ligacao" | "email" | "whatsapp" | "acesso_remoto" | "visita" | "mudanca_status" | "anexo" | "sistema";
          conteudo: string | null;
          status_anterior: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          status_novo: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          tempo_gasto_minutos: number;
          anexos: Json;
          visivel_cliente: boolean;
          ocorrido_em: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          atendimento_id: string;
          autor_id?: string | null;
          tipo?: "nota" | "ligacao" | "email" | "whatsapp" | "acesso_remoto" | "visita" | "mudanca_status" | "anexo" | "sistema";
          conteudo?: string | null;
          status_anterior?: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          status_novo?: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          tempo_gasto_minutos?: number;
          anexos?: Json;
          visivel_cliente?: boolean;
          ocorrido_em?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          atendimento_id?: string;
          autor_id?: string | null;
          tipo?: "nota" | "ligacao" | "email" | "whatsapp" | "acesso_remoto" | "visita" | "mudanca_status" | "anexo" | "sistema";
          conteudo?: string | null;
          status_anterior?: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          status_novo?: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          tempo_gasto_minutos?: number;
          anexos?: Json;
          visivel_cliente?: boolean;
          ocorrido_em?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "atendimento_interacoes_atendimento_id_fkey";
            columns: ["atendimento_id"];
            isOneToOne: false;
            referencedRelation: "atendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimento_interacoes_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimento_interacoes_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      atendimentos: {
        Row: {
          id: string;
          org_id: string;
          numero: string;
          cliente_id: string;
          filial_id: string | null;
          contato_id: string | null;
          sistema_id: string | null;
          categoria_id: string | null;
          subcategoria_id: string | null;
          responsavel_id: string | null;
          titulo: string;
          descricao: string | null;
          canal: "telefone" | "whatsapp" | "email" | "presencial" | "acesso_remoto" | "chat" | "interno";
          tipo: "duvida" | "erro" | "treinamento" | "implantacao" | "melhoria" | "manutencao" | "consultoria";
          status: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado";
          prioridade: "baixa" | "media" | "alta" | "urgente";
          solucao: string | null;
          causa_raiz: string | null;
          aguardando_o_que: string | null;
          iniciado_em: string;
          finalizado_em: string | null;
          tempo_gasto_minutos: number;
          faturavel: boolean;
          valor: number | null;
          tags: string[];
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          busca: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          numero?: string;
          cliente_id: string;
          filial_id?: string | null;
          contato_id?: string | null;
          sistema_id?: string | null;
          categoria_id?: string | null;
          subcategoria_id?: string | null;
          responsavel_id?: string | null;
          titulo: string;
          descricao?: string | null;
          canal?: "telefone" | "whatsapp" | "email" | "presencial" | "acesso_remoto" | "chat" | "interno";
          tipo?: "duvida" | "erro" | "treinamento" | "implantacao" | "melhoria" | "manutencao" | "consultoria";
          status?: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado";
          prioridade?: "baixa" | "media" | "alta" | "urgente";
          solucao?: string | null;
          causa_raiz?: string | null;
          aguardando_o_que?: string | null;
          iniciado_em?: string;
          finalizado_em?: string | null;
          tempo_gasto_minutos?: number;
          faturavel?: boolean;
          valor?: number | null;
          tags?: string[];
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          numero?: string;
          cliente_id?: string;
          filial_id?: string | null;
          contato_id?: string | null;
          sistema_id?: string | null;
          categoria_id?: string | null;
          subcategoria_id?: string | null;
          responsavel_id?: string | null;
          titulo?: string;
          descricao?: string | null;
          canal?: "telefone" | "whatsapp" | "email" | "presencial" | "acesso_remoto" | "chat" | "interno";
          tipo?: "duvida" | "erro" | "treinamento" | "implantacao" | "melhoria" | "manutencao" | "consultoria";
          status?: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado";
          prioridade?: "baixa" | "media" | "alta" | "urgente";
          solucao?: string | null;
          causa_raiz?: string | null;
          aguardando_o_que?: string | null;
          iniciado_em?: string;
          finalizado_em?: string | null;
          tempo_gasto_minutos?: number;
          faturavel?: boolean;
          valor?: number | null;
          tags?: string[];
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "atendimentos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_contato_id_fkey";
            columns: ["contato_id"];
            isOneToOne: false;
            referencedRelation: "cliente_contatos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_filial_id_fkey";
            columns: ["filial_id"];
            isOneToOne: false;
            referencedRelation: "filiais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_sistema_id_fkey";
            columns: ["sistema_id"];
            isOneToOne: false;
            referencedRelation: "sistemas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_subcategoria_id_fkey";
            columns: ["subcategoria_id"];
            isOneToOne: false;
            referencedRelation: "subcategorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "atendimentos_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          org_id: string | null;
          actor_id: string | null;
          tabela: string;
          registro_id: string | null;
          acao: "INSERT" | "UPDATE" | "DELETE";
          dados_antes: Json | null;
          dados_depois: Json | null;
          campos_alterados: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          org_id?: string | null;
          actor_id?: string | null;
          tabela: string;
          registro_id?: string | null;
          acao: "INSERT" | "UPDATE" | "DELETE";
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          campos_alterados?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string | null;
          actor_id?: string | null;
          tabela?: string;
          registro_id?: string | null;
          acao?: "INSERT" | "UPDATE" | "DELETE";
          dados_antes?: Json | null;
          dados_depois?: Json | null;
          campos_alterados?: string[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          org_id: string;
          nome: string;
          cor: string;
          icone: string | null;
          ordem: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          nome: string;
          cor?: string;
          icone?: string | null;
          ordem?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          nome?: string;
          cor?: string;
          icone?: string | null;
          ordem?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_contatos: {
        Row: {
          id: string;
          org_id: string;
          cliente_id: string;
          filial_id: string | null;
          nome: string;
          cargo: string | null;
          setor: string | null;
          email: string | null;
          telefone: string | null;
          whatsapp: string | null;
          principal: boolean;
          observacoes: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cliente_id: string;
          filial_id?: string | null;
          nome: string;
          cargo?: string | null;
          setor?: string | null;
          email?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          principal?: boolean;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          cliente_id?: string;
          filial_id?: string | null;
          nome?: string;
          cargo?: string | null;
          setor?: string | null;
          email?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          principal?: boolean;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: true;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_contatos_filial_id_fkey";
            columns: ["filial_id"];
            isOneToOne: false;
            referencedRelation: "filiais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_contatos_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          id: string;
          org_id: string;
          codigo: string | null;
          razao_social: string;
          nome_fantasia: string | null;
          tipo: "PJ" | "PF";
          documento: string | null;
          status: "ativo" | "inativo" | "prospect";
          segmento: string | null;
          cep: string | null;
          logradouro: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          cidade: string | null;
          uf: string | null;
          email: string | null;
          telefone: string | null;
          site: string | null;
          contrato_tipo: "avulso" | "mensal" | "pacote_horas";
          horas_contratadas: number | null;
          observacoes: string | null;
          tags: string[];
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          codigo?: string | null;
          razao_social: string;
          nome_fantasia?: string | null;
          tipo?: "PJ" | "PF";
          documento?: string | null;
          status?: "ativo" | "inativo" | "prospect";
          segmento?: string | null;
          cep?: string | null;
          logradouro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          email?: string | null;
          telefone?: string | null;
          site?: string | null;
          contrato_tipo?: "avulso" | "mensal" | "pacote_horas";
          horas_contratadas?: number | null;
          observacoes?: string | null;
          tags?: string[];
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          codigo?: string | null;
          razao_social?: string;
          nome_fantasia?: string | null;
          tipo?: "PJ" | "PF";
          documento?: string | null;
          status?: "ativo" | "inativo" | "prospect";
          segmento?: string | null;
          cep?: string | null;
          logradouro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          email?: string | null;
          telefone?: string | null;
          site?: string | null;
          contrato_tipo?: "avulso" | "mensal" | "pacote_horas";
          horas_contratadas?: number | null;
          observacoes?: string | null;
          tags?: string[];
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes_sistemas: {
        Row: {
          id: string;
          org_id: string;
          cliente_id: string;
          sistema_id: string;
          filial_id: string | null;
          versao_instalada: string | null;
          data_implantacao: string | null;
          ambiente: "producao" | "homologacao" | "teste";
          licencas: number | null;
          dados_acesso: Json;
          observacoes: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cliente_id: string;
          sistema_id: string;
          filial_id?: string | null;
          versao_instalada?: string | null;
          data_implantacao?: string | null;
          ambiente?: "producao" | "homologacao" | "teste";
          licencas?: number | null;
          dados_acesso?: Json;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          cliente_id?: string;
          sistema_id?: string;
          filial_id?: string | null;
          versao_instalada?: string | null;
          data_implantacao?: string | null;
          ambiente?: "producao" | "homologacao" | "teste";
          licencas?: number | null;
          dados_acesso?: Json;
          observacoes?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_sistemas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_sistemas_filial_id_fkey";
            columns: ["filial_id"];
            isOneToOne: false;
            referencedRelation: "filiais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_sistemas_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_sistemas_sistema_id_fkey";
            columns: ["sistema_id"];
            isOneToOne: false;
            referencedRelation: "sistemas";
            referencedColumns: ["id"];
          },
        ];
      };
      filiais: {
        Row: {
          id: string;
          org_id: string;
          cliente_id: string;
          nome: string;
          codigo: string | null;
          cep: string | null;
          logradouro: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          cidade: string | null;
          uf: string | null;
          telefone: string | null;
          responsavel: string | null;
          matriz: boolean;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cliente_id: string;
          nome: string;
          codigo?: string | null;
          cep?: string | null;
          logradouro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          telefone?: string | null;
          responsavel?: string | null;
          matriz?: boolean;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          cliente_id?: string;
          nome?: string;
          codigo?: string | null;
          cep?: string | null;
          logradouro?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          uf?: string | null;
          telefone?: string | null;
          responsavel?: string | null;
          matriz?: boolean;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "filiais_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: true;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "filiais_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      organizacoes: {
        Row: {
          id: string;
          nome: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pendencias: {
        Row: {
          id: string;
          org_id: string;
          atendimento_id: string | null;
          cliente_id: string | null;
          titulo: string;
          descricao: string | null;
          responsavel_tipo: "eu" | "cliente" | "terceiro";
          responsavel_id: string | null;
          terceiro_nome: string | null;
          prazo: string | null;
          prioridade: "baixa" | "media" | "alta" | "urgente";
          status: "aberta" | "em_andamento" | "concluida" | "cancelada";
          concluida_em: string | null;
          concluida_por: string | null;
          resultado: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          atendimento_id?: string | null;
          cliente_id?: string | null;
          titulo: string;
          descricao?: string | null;
          responsavel_tipo?: "eu" | "cliente" | "terceiro";
          responsavel_id?: string | null;
          terceiro_nome?: string | null;
          prazo?: string | null;
          prioridade?: "baixa" | "media" | "alta" | "urgente";
          status?: "aberta" | "em_andamento" | "concluida" | "cancelada";
          concluida_em?: string | null;
          concluida_por?: string | null;
          resultado?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          atendimento_id?: string | null;
          cliente_id?: string | null;
          titulo?: string;
          descricao?: string | null;
          responsavel_tipo?: "eu" | "cliente" | "terceiro";
          responsavel_id?: string | null;
          terceiro_nome?: string | null;
          prazo?: string | null;
          prioridade?: "baixa" | "media" | "alta" | "urgente";
          status?: "aberta" | "em_andamento" | "concluida" | "cancelada";
          concluida_em?: string | null;
          concluida_por?: string | null;
          resultado?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pendencias_atendimento_id_fkey";
            columns: ["atendimento_id"];
            isOneToOne: false;
            referencedRelation: "atendimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pendencias_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pendencias_concluida_por_fkey";
            columns: ["concluida_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pendencias_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pendencias_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pendencias_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          nome: string;
          email: string;
          telefone: string | null;
          avatar_url: string | null;
          role: "owner" | "tecnico" | "visualizador";
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "tecnico" | "visualizador";
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          nome?: string;
          email?: string;
          telefone?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "tecnico" | "visualizador";
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      sistemas: {
        Row: {
          id: string;
          org_id: string;
          nome: string;
          fabricante: string | null;
          versao_atual: string | null;
          tipo: "erp" | "fiscal" | "sistema_proprio" | "infraestrutura" | "outro";
          descricao: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          nome: string;
          fabricante?: string | null;
          versao_atual?: string | null;
          tipo?: "erp" | "fiscal" | "sistema_proprio" | "infraestrutura" | "outro";
          descricao?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          nome?: string;
          fabricante?: string | null;
          versao_atual?: string | null;
          tipo?: "erp" | "fiscal" | "sistema_proprio" | "infraestrutura" | "outro";
          descricao?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sistemas_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      subcategorias: {
        Row: {
          id: string;
          org_id: string;
          categoria_id: string;
          nome: string;
          ordem: number;
          sla_horas: number | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          categoria_id: string;
          nome: string;
          ordem?: number;
          sla_horas?: number | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          categoria_id?: string;
          nome?: string;
          ordem?: number;
          sla_horas?: number | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subcategorias_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subcategorias_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacoes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      atendimentos_lista: {
        Row: {
          id: string | null;
          org_id: string | null;
          numero: string | null;
          titulo: string | null;
          status: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado" | null;
          prioridade: "baixa" | "media" | "alta" | "urgente" | null;
          canal: "telefone" | "whatsapp" | "email" | "presencial" | "acesso_remoto" | "chat" | "interno" | null;
          tipo: "duvida" | "erro" | "treinamento" | "implantacao" | "melhoria" | "manutencao" | "consultoria" | null;
          tempo_gasto_minutos: number | null;
          faturavel: boolean | null;
          iniciado_em: string | null;
          finalizado_em: string | null;
          created_at: string | null;
          updated_at: string | null;
          cliente_id: string | null;
          cliente_nome: string | null;
          categoria_id: string | null;
          categoria_nome: string | null;
          categoria_cor: string | null;
          sistema_id: string | null;
          sistema_nome: string | null;
          responsavel_id: string | null;
          responsavel_nome: string | null;
          pendencias_abertas: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      acao_auditoria: "INSERT" | "UPDATE" | "DELETE";
      ambiente_sistema: "producao" | "homologacao" | "teste";
      canal_atendimento: "telefone" | "whatsapp" | "email" | "presencial" | "acesso_remoto" | "chat" | "interno";
      prioridade: "baixa" | "media" | "alta" | "urgente";
      responsavel_pendencia: "eu" | "cliente" | "terceiro";
      role_usuario: "owner" | "tecnico" | "visualizador";
      status_atendimento: "aberto" | "em_andamento" | "aguardando_cliente" | "aguardando_terceiro" | "agendado" | "resolvido" | "cancelado";
      status_cliente: "ativo" | "inativo" | "prospect";
      status_evento: "agendado" | "confirmado" | "realizado" | "cancelado" | "remarcado";
      status_pendencia: "aberta" | "em_andamento" | "concluida" | "cancelada";
      tipo_atendimento: "duvida" | "erro" | "treinamento" | "implantacao" | "melhoria" | "manutencao" | "consultoria";
      tipo_contrato: "avulso" | "mensal" | "pacote_horas";
      tipo_evento: "retorno" | "visita" | "reuniao" | "tarefa" | "lembrete" | "manutencao_preventiva";
      tipo_interacao: "nota" | "ligacao" | "email" | "whatsapp" | "acesso_remoto" | "visita" | "mudanca_status" | "anexo" | "sistema";
      tipo_pessoa: "PJ" | "PF";
      tipo_sistema: "erp" | "fiscal" | "sistema_proprio" | "infraestrutura" | "outro";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tabelas<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserir<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Atualizar<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
