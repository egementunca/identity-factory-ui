'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import CircuitPlayground from '@/components/CircuitPlayground';

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-circuit-gradient overflow-hidden">
      <Navigation />
      <div className="p-5 w-full max-w-none h-[calc(100vh-60px)] box-border">
        <div className="h-full overflow-hidden">
          <CircuitPlayground />
        </div>
      </div>
    </div>
  );
}
