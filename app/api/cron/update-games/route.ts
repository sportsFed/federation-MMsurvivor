import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp'; // Ensure this path is correct
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { calculateSurvivorScore } from '@/lib/scoring';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch live scores from ESPN
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard');
    const data = await res.json();
    const games = data.events;

    // 2. Process finished games
    for (const game of games) {
      if (game.status.type.completed) {
        const winner = game.competitions[0].competitors.find((c: any) => c.winner).team.displayName;
        const round = "Round of 64"; // This would be dynamic based on date

        // 3. Update Database (Example logic)
        // In a real run, you'd query 'entries' who picked this winner and add points
        console.log(`Game Final: ${winner} won.`);
      }
    }

    return NextResponse.json({ success: true, processed: games.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Scoring update failed" }, { status: 500 });
  }
}
