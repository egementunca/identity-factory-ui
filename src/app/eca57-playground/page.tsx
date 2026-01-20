'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ECA57PlaygroundPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/playground-v2');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <p>Redirecting to new playground...</p>
    </div>
  );
}
