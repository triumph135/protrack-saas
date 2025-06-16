import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { TenantProvider } from '@/components/providers/TenantProvider'
import { AppStateProvider } from '@/components/providers/AppStateProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Project Tracking System',
  description: 'Project tracking and management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <TenantProvider>
            <AppStateProvider>
              {children}
            </AppStateProvider>
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 