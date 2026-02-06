'use client';

import { Suspense } from 'react';
import { PlaygroundPro } from '@/components/playground-v2';

export default function PlaygroundV2Page() {
  return (
    <Suspense fallback={null}>
      <PlaygroundPro />
    </Suspense>
  );
}
