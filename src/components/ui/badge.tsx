import * as React from 'react';
import { cn } from '@/lib/utils';

function Badge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
