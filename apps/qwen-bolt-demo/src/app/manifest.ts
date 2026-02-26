import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Qwen Coder - AI Code Studio',
    short_name: 'Qwen Coder',
    description: 'Create stunning apps & websites by chatting with AI',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#2563EB',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
