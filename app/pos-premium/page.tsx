'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function POSPremiumPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ventas');
  }, [router]);

  return null;
}
