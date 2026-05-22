import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redireciona o visitante da página inicial direto para a rota de agendamentos
  redirect('/agendar');
}
