// Debug page to check which Supabase instance is being used
// Navigate to /debug-env to see this page

export default function DebugEnv() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Decode the JWT to see the timestamp
  let keyInfo = 'Unable to decode';
  if (supabaseKey) {
    try {
      const parts = supabaseKey.split('.');
      const payload = JSON.parse(atob(parts[1]));
      const issuedAt = new Date(payload.iat * 1000);
      const expiresAt = new Date(payload.exp * 1000);

      keyInfo = `
        Issued: ${issuedAt.toISOString()}
        Expires: ${expiresAt.toISOString()}
        Project Ref: ${payload.ref}
      `;
    } catch (e) {
      keyInfo = 'Error decoding JWT';
    }
  }

  const isCorrectDatabase = supabaseUrl === 'https://sdvbjhtgzhkphkkpwekd.supabase.co';
  const hasNewKey = supabaseKey?.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdmJqaHRnemhrcGhra3B3ZWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA4MTMsImV4cCI6MjA4MDc4NjgxM30');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Environment Debug Info</h1>

        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Supabase URL</h2>
            <code className="text-sm break-all">{supabaseUrl || 'Not set'}</code>
            <div className={`mt-2 px-3 py-1 rounded inline-block ${isCorrectDatabase ? 'bg-green-600' : 'bg-red-600'}`}>
              {isCorrectDatabase ? '✓ Correct (New Database)' : '✗ Wrong Database'}
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">API Key Info</h2>
            <pre className="text-xs whitespace-pre-wrap bg-gray-900 p-3 rounded">{keyInfo}</pre>
            <div className={`mt-2 px-3 py-1 rounded inline-block ${hasNewKey ? 'bg-green-600' : 'bg-red-600'}`}>
              {hasNewKey ? '✓ Correct (New Key - iat:1765210813)' : '✗ Wrong Key (Old Key - iat:1735575654)'}
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">What This Means</h2>
            {isCorrectDatabase && hasNewKey ? (
              <div className="text-green-400">
                <p className="font-bold">✓ Everything is correct!</p>
                <p>Your site is connected to the new database. You should be able to create a new account.</p>
              </div>
            ) : (
              <div className="text-red-400">
                <p className="font-bold">✗ Environment variables are incorrect</p>
                <p className="mt-2">Your live site is still using the OLD Supabase credentials.</p>
                <p className="mt-2">You need to update the environment variables in Lovable dashboard:</p>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Go to Lovable dashboard → Settings → Environment Variables</li>
                  <li>Update VITE_SUPABASE_URL to: https://sdvbjhtgzhkphkkpwekd.supabase.co</li>
                  <li>Update VITE_SUPABASE_PUBLISHABLE_KEY to the new key (starts with eyJhbGci... iat:1765210813)</li>
                  <li>Save and wait for redeploy</li>
                </ul>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Expected Values</h2>
            <div className="space-y-2 text-sm">
              <div>
                <strong>URL:</strong>
                <code className="block bg-gray-900 p-2 rounded mt-1">https://sdvbjhtgzhkphkkpwekd.supabase.co</code>
              </div>
              <div>
                <strong>Key (should contain iat:1765210813):</strong>
                <code className="block bg-gray-900 p-2 rounded mt-1 break-all text-xs">
                  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdmJqaHRnemhrcGhra3B3ZWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA4MTMsImV4cCI6MjA4MDc4NjgxM30.pZ_PcRMOqPjJJevMpgC5vto2iuKpwzwgWKxKXeS7dis
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
