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
      
      <h1 style={{ fontSize: '4rem', margin: '0', fontStyle: 'italic' }}>The Federation</h1>
      <p style={{ letterSpacing: '0.3em', color: '#dc2626', marginBottom: '40px' }}>EST. 2015</p>
      
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
