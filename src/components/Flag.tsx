import * as Flags from 'country-flag-icons/react/3x2';
import { getISO } from '../data/teamFlags';

interface Props {
  team: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Flag({ team, className = 'w-6 h-4', style }: Props) {
  const iso = getISO(team);
  const FlagComponent = (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[iso];
  if (!FlagComponent) return <span className={`${className} bg-slate-700 rounded-sm inline-block`} />;
  return (
    <FlagComponent
      className={`${className} rounded-sm object-cover shrink-0`}
      style={{ display: 'inline-block', ...style }}
    />
  );
}
