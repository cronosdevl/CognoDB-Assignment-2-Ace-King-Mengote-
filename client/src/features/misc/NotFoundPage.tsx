import { Compass } from 'lucide-react';

import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/states';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-5" />}
      title="This page does not exist"
      description="The link may be out of date, or the record it pointed at has been removed."
      action={<LinkButton to="/">Back to overview</LinkButton>}
      className="mt-16"
    />
  );
}
