export interface RespostasAnamnese {
  // Bloco 1: Histórico Clínico
  pressao_alta: 'sim' | 'nao';
  doenca_pele_tratamento: string;
  acidente_recente: 'sim' | 'nao';
  detalhes_acidente?: string;
  cirurgia_recente: 'sim' | 'nao';
  qual_cirurgia?: string;
  tempo_cirurgia?: string;
  alergias: string;
  creme_facial_uso: string;
  gestante_ou_amamentando: 'sim' | 'nao';
  epilepsia_ou_claustrofobia: 'sim' | 'nao';

  // Bloco 2: Medicamentos e Sensibilidade
  uso_roacutan_6meses: 'sim' | 'nao';
  uso_acidos_atualmente: 'sim' | 'nao';
  antibioticos_antiinflamatorios: 'sim' | 'nao';

  // Bloco 3: Hábitos e Reação ao Sol
  pratica_atividade_fisica: 'sim' | 'nao';
  exposicao_sol_frequente: 'sim' | 'nao';
  se_alimentou_antes: 'sim' | 'nao';
  horario_alimentacao?: string;
  reacao_sol_fitzpatrick: 'sempre_queima' | 'queima_pouco_bronzeia' | 'queima_moderado_bronzeia_gradual' | 'raramente_queima';

  // Bloco 4: Termo
  termo_aceite: boolean;
}
