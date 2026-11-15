import { Link } from 'react-router-dom';
import type { getScenarioModelAlerts } from '../lib/selectors';

export function ScenarioModelAlerts({ alerts, selectCrew }: {
  alerts: ReturnType<typeof getScenarioModelAlerts>;
  selectCrew: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {alerts.map(({ member, signals }) => (
        <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F59E0B]/30 bg-[#0B1020]/70 p-3 text-xs">
          <span className="text-white">
            <strong>{member.name}</strong> · <span className="text-[#F59E0B]">{signals.join(' · ')}</span>
          </span>
          <Link to="/risk" onClick={() => selectCrew(member.id)} className="font-semibold text-[#2DD4BF] hover:underline">
            View model prediction
          </Link>
        </li>
      ))}
    </ul>
  );
}
