import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

// 2026 March Madness 68-team field (placeholder — update seeds after Selection Sunday)
const TEAMS_2026 = [
  // East Region
  { name: 'East 1 Seed', seed: 1, region: 'East', nationalSeed: 1, isEliminated: false },
  { name: 'East 2 Seed', seed: 2, region: 'East', nationalSeed: 5, isEliminated: false },
  { name: 'East 3 Seed', seed: 3, region: 'East', nationalSeed: 9, isEliminated: false },
  { name: 'East 4 Seed', seed: 4, region: 'East', nationalSeed: 13, isEliminated: false },
  { name: 'East 5 Seed', seed: 5, region: 'East', nationalSeed: 17, isEliminated: false },
  { name: 'East 6 Seed', seed: 6, region: 'East', nationalSeed: 21, isEliminated: false },
  { name: 'East 7 Seed', seed: 7, region: 'East', nationalSeed: 25, isEliminated: false },
  { name: 'East 8 Seed', seed: 8, region: 'East', nationalSeed: 29, isEliminated: false },
  { name: 'East 9 Seed', seed: 9, region: 'East', nationalSeed: 33, isEliminated: false },
  { name: 'East 10 Seed', seed: 10, region: 'East', nationalSeed: 37, isEliminated: false },
  { name: 'East 11 Seed', seed: 11, region: 'East', nationalSeed: 41, isEliminated: false },
  { name: 'East 12 Seed', seed: 12, region: 'East', nationalSeed: 45, isEliminated: false },
  { name: 'East 13 Seed', seed: 13, region: 'East', nationalSeed: 49, isEliminated: false },
  { name: 'East 14 Seed', seed: 14, region: 'East', nationalSeed: 53, isEliminated: false },
  { name: 'East 15 Seed', seed: 15, region: 'East', nationalSeed: 57, isEliminated: false },
  { name: 'East 16 Seed', seed: 16, region: 'East', nationalSeed: 61, isEliminated: false },
  // West Region
  { name: 'West 1 Seed', seed: 1, region: 'West', nationalSeed: 2, isEliminated: false },
  { name: 'West 2 Seed', seed: 2, region: 'West', nationalSeed: 6, isEliminated: false },
  { name: 'West 3 Seed', seed: 3, region: 'West', nationalSeed: 10, isEliminated: false },
  { name: 'West 4 Seed', seed: 4, region: 'West', nationalSeed: 14, isEliminated: false },
  { name: 'West 5 Seed', seed: 5, region: 'West', nationalSeed: 18, isEliminated: false },
  { name: 'West 6 Seed', seed: 6, region: 'West', nationalSeed: 22, isEliminated: false },
  { name: 'West 7 Seed', seed: 7, region: 'West', nationalSeed: 26, isEliminated: false },
  { name: 'West 8 Seed', seed: 8, region: 'West', nationalSeed: 30, isEliminated: false },
  { name: 'West 9 Seed', seed: 9, region: 'West', nationalSeed: 34, isEliminated: false },
  { name: 'West 10 Seed', seed: 10, region: 'West', nationalSeed: 38, isEliminated: false },
  { name: 'West 11 Seed', seed: 11, region: 'West', nationalSeed: 42, isEliminated: false },
  { name: 'West 12 Seed', seed: 12, region: 'West', nationalSeed: 46, isEliminated: false },
  { name: 'West 13 Seed', seed: 13, region: 'West', nationalSeed: 50, isEliminated: false },
  { name: 'West 14 Seed', seed: 14, region: 'West', nationalSeed: 54, isEliminated: false },
  { name: 'West 15 Seed', seed: 15, region: 'West', nationalSeed: 58, isEliminated: false },
  { name: 'West 16 Seed', seed: 16, region: 'West', nationalSeed: 62, isEliminated: false },
  // South Region
  { name: 'South 1 Seed', seed: 1, region: 'South', nationalSeed: 3, isEliminated: false },
  { name: 'South 2 Seed', seed: 2, region: 'South', nationalSeed: 7, isEliminated: false },
  { name: 'South 3 Seed', seed: 3, region: 'South', nationalSeed: 11, isEliminated: false },
  { name: 'South 4 Seed', seed: 4, region: 'South', nationalSeed: 15, isEliminated: false },
  { name: 'South 5 Seed', seed: 5, region: 'South', nationalSeed: 19, isEliminated: false },
  { name: 'South 6 Seed', seed: 6, region: 'South', nationalSeed: 23, isEliminated: false },
  { name: 'South 7 Seed', seed: 7, region: 'South', nationalSeed: 27, isEliminated: false },
  { name: 'South 8 Seed', seed: 8, region: 'South', nationalSeed: 31, isEliminated: false },
  { name: 'South 9 Seed', seed: 9, region: 'South', nationalSeed: 35, isEliminated: false },
  { name: 'South 10 Seed', seed: 10, region: 'South', nationalSeed: 39, isEliminated: false },
  { name: 'South 11 Seed', seed: 11, region: 'South', nationalSeed: 43, isEliminated: false },
  { name: 'South 12 Seed', seed: 12, region: 'South', nationalSeed: 47, isEliminated: false },
  { name: 'South 13 Seed', seed: 13, region: 'South', nationalSeed: 51, isEliminated: false },
  { name: 'South 14 Seed', seed: 14, region: 'South', nationalSeed: 55, isEliminated: false },
  { name: 'South 15 Seed', seed: 15, region: 'South', nationalSeed: 59, isEliminated: false },
  { name: 'South 16 Seed', seed: 16, region: 'South', nationalSeed: 63, isEliminated: false },
  // Midwest Region
  { name: 'Midwest 1 Seed', seed: 1, region: 'Midwest', nationalSeed: 4, isEliminated: false },
  { name: 'Midwest 2 Seed', seed: 2, region: 'Midwest', nationalSeed: 8, isEliminated: false },
  { name: 'Midwest 3 Seed', seed: 3, region: 'Midwest', nationalSeed: 12, isEliminated: false },
  { name: 'Midwest 4 Seed', seed: 4, region: 'Midwest', nationalSeed: 16, isEliminated: false },
  { name: 'Midwest 5 Seed', seed: 5, region: 'Midwest', nationalSeed: 20, isEliminated: false },
  { name: 'Midwest 6 Seed', seed: 6, region: 'Midwest', nationalSeed: 24, isEliminated: false },
  { name: 'Midwest 7 Seed', seed: 7, region: 'Midwest', nationalSeed: 28, isEliminated: false },
  { name: 'Midwest 8 Seed', seed: 8, region: 'Midwest', nationalSeed: 32, isEliminated: false },
  { name: 'Midwest 9 Seed', seed: 9, region: 'Midwest', nationalSeed: 36, isEliminated: false },
  { name: 'Midwest 10 Seed', seed: 10, region: 'Midwest', nationalSeed: 40, isEliminated: false },
  { name: 'Midwest 11 Seed', seed: 11, region: 'Midwest', nationalSeed: 44, isEliminated: false },
  { name: 'Midwest 12 Seed', seed: 12, region: 'Midwest', nationalSeed: 48, isEliminated: false },
  { name: 'Midwest 13 Seed', seed: 13, region: 'Midwest', nationalSeed: 52, isEliminated: false },
  { name: 'Midwest 14 Seed', seed: 14, region: 'Midwest', nationalSeed: 56, isEliminated: false },
  { name: 'Midwest 15 Seed', seed: 15, region: 'Midwest', nationalSeed: 60, isEliminated: false },
  { name: 'Midwest 16 Seed', seed: 16, region: 'Midwest', nationalSeed: 64, isEliminated: false },
  // First Four (play-in games, seeds 65-68)
  { name: 'First Four Team A', seed: 11, region: 'FirstFour', nationalSeed: 65, isEliminated: false },
  { name: 'First Four Team B', seed: 11, region: 'FirstFour', nationalSeed: 66, isEliminated: false },
  { name: 'First Four Team C', seed: 16, region: 'FirstFour', nationalSeed: 67, isEliminated: false },
  { name: 'First Four Team D', seed: 16, region: 'FirstFour', nationalSeed: 68, isEliminated: false },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.adminPassword !== (process.env.ADMIN_PASSWORD ?? 'chone1234')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Accept a custom teams array from the request body, or fall back to built-in list
    const teamsToImport: typeof TEAMS_2026 = body.teams ?? TEAMS_2026;

    const batch = db.batch();
    const teamsRef = db.collection('teams');

    for (const team of teamsToImport) {
      const newDoc = teamsRef.doc();
      batch.set(newDoc, team);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Imported ${teamsToImport.length} teams successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
