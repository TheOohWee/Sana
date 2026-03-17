import Link from 'next/link';
import { Card } from './ui/Card';
import { Users, ChevronRight } from 'lucide-react';

interface PartyCardProps {
  id: string;
  name: string;
  description?: string;
  purpose?: string;
  memberCount: number;
}

export function PartyCard({ id, name, description, purpose, memberCount }: PartyCardProps) {
  return (
    <Link href={`/party/${id}`}>
      <Card hover className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate">{name}</h3>
          {(purpose || description) && (
            <p className="text-sm text-text-muted truncate mt-0.5">
              {purpose || description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
            <Users className="h-3.5 w-3.5" />
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-text-muted shrink-0 ml-3" />
      </Card>
    </Link>
  );
}
