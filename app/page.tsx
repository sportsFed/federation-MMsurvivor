import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center' }}>
      
      {/* Explicitly setting the width here ensures it doesn't take up the whole screen */}
      <img 
        src="/Fed-Logo-Full.png" 
        alt="The Federation" 
        style={{ width: '250px', marginBottom: '20px' }} 
      />
      
      // Inside your return statement:
<h1 style={{ color: 'white', fontSize: '4rem', fontFamily: 'var(--font-bebas)' }}>
  MARCH MADNESS SURVIVOR
</h1>
<p style={{ color: '#dc2626', letterSpacing: '0.4em', fontSize: '1.5rem' }}>
  2026
</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Link href="/login" style={{ backgroundColor: '#dc2626', color: 'white', padding: '15px 40px', borderRadius: '12px', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
          ENTER TOURNAMENT
        </Link>
        <Link href="/standings" style={{ color: '#94a3b8', textDecoration: 'none' }}>
          View Standings
        </Link>
      </div>
    </div>
  );
}
