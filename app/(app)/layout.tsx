'use client';

import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { Navbar } from '@/components/Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-bg-primary">
          <Navbar />
          <main className="pb-20 sm:pb-8">
            {children}
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
