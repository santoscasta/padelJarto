import { NewTournamentForm } from './NewTournamentForm';
import { CardTitle, CardHeader } from '@/components/ui/Card';

export default function NewTournamentPage() {
  return (
    <section className="space-y-4">
      <CardHeader><CardTitle>Nuevo torneo</CardTitle></CardHeader>
      <NewTournamentForm />
    </section>
  );
}
