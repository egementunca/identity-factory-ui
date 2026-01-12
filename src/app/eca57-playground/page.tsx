'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import ECA57Playground from '@/components/ECA57Playground';

export default function ECA57PlaygroundPage() {
  return (
    <div className="min-h-screen bg-circuit-gradient overflow-hidden">
      <Navigation />
      <div className="p-5 w-full max-w-none h-[calc(100vh-60px)] box-border">
        <div className="h-full overflow-hidden">
          <ECA57Playground />
        </div>
      </div>
    </div>
  );
}
