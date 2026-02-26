import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black text-gray-900 dark:text-white transition-colors">
      <div className="text-center space-y-6">
        <h2 className="text-8xl font-bold text-blue-500">404</h2>
        <p className="text-2xl font-semibold">Page Not Found</p>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
