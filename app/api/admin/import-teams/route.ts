import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { clearCollection } from '@/lib/firestoreUtils';

// 2026 March Madness 68-team field
const TEAMS_2026 = [
  // East Region
  { name: 'Duke', seed: 1, regionalSeed: 1, region: 'East', nationalSeed: 1, isEliminated: false },
  { name: 'UConn', seed: 2, regionalSeed: 2, region: 'East', nationalSeed: 6, isEliminated: false },
  { name: 'Michigan St.', seed: 3, regionalSeed: 3, region: 'East', nationalSeed: 9, isEliminated: false },
  { name: 'Kansas', seed: 4, regionalSeed: 4, region: 'East', nationalSeed: 15, isEliminated: false },
  { name: "St. John's (NY)", seed: 5, regionalSeed: 5, region: 'East', nationalSeed: 18, isEliminated: false },
  { name: 'Louisville', seed: 6, regionalSeed: 6, region: 'East', nationalSeed: 23, isEliminated: false },
  { name: 'UCLA', seed: 7, regionalSeed: 7, region: 'East', nationalSeed: 28, isEliminated: false },
  { name: 'Ohio St.', seed: 8, regionalSeed: 8, region: 'East', nationalSeed: 31, isEliminated: false },
  { name: 'TCU', seed: 9, regionalSeed: 9, region: 'East', nationalSeed: 34, isEliminated: false },
  { name: 'UCF', seed: 10, regionalSeed: 10, region: 'East', nationalSeed: 38, isEliminated: false },
  { name: 'South Florida', seed: 11, regionalSeed: 11, region: 'East', nationalSeed: 46, isEliminated: false },
  { name: 'UNI', seed: 12, regionalSeed: 12, region: 'East', nationalSeed: 49, isEliminated: false },
  { name: 'California Baptist', seed: 13, regionalSeed: 13, region: 'East', nationalSeed: 51, isEliminated: false },
  { name: 'North Dakota St.', seed: 14, regionalSeed: 14, region: 'East', nationalSeed: 55, isEliminated: false },
  { name: 'Furman', seed: 15, regionalSeed: 15, region: 'East', nationalSeed: 61, isEliminated: false },
  { name: 'Siena/UMBC', seed: 16, regionalSeed: 16, region: 'East', nationalSeed: 63, isEliminated: false },

  // West Region
  { name: 'Arizona', seed: 1, regionalSeed: 1, region: 'West', nationalSeed: 2, isEliminated: false },
  { name: 'Purdue', seed: 2, regionalSeed: 2, region: 'West', nationalSeed: 8, isEliminated: false },
  { name: 'Gonzaga', seed: 3, regionalSeed: 3, region: 'West', nationalSeed: 11, isEliminated: false },
  { name: 'Arkansas', seed: 4, regionalSeed: 4, region: 'West', nationalSeed: 16, isEliminated: false },
  { name: 'Wisconsin', seed: 5, regionalSeed: 5, region: 'West', nationalSeed: 20, isEliminated: false },
  { name: 'BYU', seed: 6, regionalSeed: 6, region: 'West', nationalSeed: 24, isEliminated: false },
  { name: 'Miami (FL)', seed: 7, regionalSeed: 7, region: 'West', nationalSeed: 27, isEliminated: false },
  { name: 'Villanova', seed: 8, regionalSeed: 8, region: 'West', nationalSeed: 30, isEliminated: false },
  { name: 'Utah St.', seed: 9, regionalSeed: 9, region: 'West', nationalSeed: 33, isEliminated: false },
  { name: 'Missouri', seed: 10, regionalSeed: 10, region: 'West', nationalSeed: 39, isEliminated: false },
  { name: 'NC State/Texas', seed: 11, regionalSeed: 11, region: 'West', nationalSeed: 41, isEliminated: false },
  { name: 'High Point', seed: 12, regionalSeed: 12, region: 'West', nationalSeed: 50, isEliminated: false },
  { name: 'Hawaii', seed: 13, regionalSeed: 13, region: 'West', nationalSeed: 54, isEliminated: false },
  { name: 'Kennesaw St.', seed: 14, regionalSeed: 14, region: 'West', nationalSeed: 58, isEliminated: false },
  { name: 'Queens (NC)', seed: 15, regionalSeed: 15, region: 'West', nationalSeed: 62, isEliminated: false },
  { name: 'LIU', seed: 16, regionalSeed: 16, region: 'West', nationalSeed: 64, isEliminated: false },

  // South Region
  { name: 'Florida', seed: 1, regionalSeed: 1, region: 'South', nationalSeed: 4, isEliminated: false },
  { name: 'Houston', seed: 2, regionalSeed: 2, region: 'South', nationalSeed: 5, isEliminated: false },
  { name: 'Illinois', seed: 3, regionalSeed: 3, region: 'South', nationalSeed: 10, isEliminated: false },
  { name: 'Nebraska', seed: 4, regionalSeed: 4, region: 'South', nationalSeed: 13, isEliminated: false },
  { name: 'Vanderbilt', seed: 5, regionalSeed: 5, region: 'South', nationalSeed: 17, isEliminated: false },
  { name: 'North Carolina', seed: 6, regionalSeed: 6, region: 'South', nationalSeed: 22, isEliminated: false },
  { name: "Saint Mary's (CA)", seed: 7, regionalSeed: 7, region: 'South', nationalSeed: 26, isEliminated: false },
  { name: 'Clemson', seed: 8, regionalSeed: 8, region: 'South', nationalSeed: 29, isEliminated: false },
  { name: 'Iowa', seed: 9, regionalSeed: 9, region: 'South', nationalSeed: 36, isEliminated: false },
  { name: 'Texas A&M', seed: 10, regionalSeed: 10, region: 'South', nationalSeed: 40, isEliminated: false },
  { name: 'VCU', seed: 11, regionalSeed: 11, region: 'South', nationalSeed: 45, isEliminated: false },
  { name: 'McNeese', seed: 12, regionalSeed: 12, region: 'South', nationalSeed: 47, isEliminated: false },
  { name: 'Troy', seed: 13, regionalSeed: 13, region: 'South', nationalSeed: 53, isEliminated: false },
  { name: 'Penn', seed: 14, regionalSeed: 14, region: 'South', nationalSeed: 56, isEliminated: false },
  { name: 'Idaho', seed: 15, regionalSeed: 15, region: 'South', nationalSeed: 60, isEliminated: false },
  { name: 'Lehigh/Prairie View', seed: 16, regionalSeed: 16, region: 'South', nationalSeed: 67, isEliminated: false },

  // Midwest Region
  { name: 'Michigan', seed: 1, regionalSeed: 1, region: 'Midwest', nationalSeed: 3, isEliminated: false },
  { name: 'Iowa St.', seed: 2, regionalSeed: 2, region: 'Midwest', nationalSeed: 7, isEliminated: false },
  { name: 'Virginia', seed: 3, regionalSeed: 3, region: 'Midwest', nationalSeed: 12, isEliminated: false },
  { name: 'Alabama', seed: 4, regionalSeed: 4, region: 'Midwest', nationalSeed: 14, isEliminated: false },
  { name: 'Texas Tech', seed: 5, regionalSeed: 5, region: 'Midwest', nationalSeed: 19, isEliminated: false },
  { name: 'Tennessee', seed: 6, regionalSeed: 6, region: 'Midwest', nationalSeed: 21, isEliminated: false },
  { name: 'Kentucky', seed: 7, regionalSeed: 7, region: 'Midwest', nationalSeed: 25, isEliminated: false },
  { name: 'Georgia', seed: 8, regionalSeed: 8, region: 'Midwest', nationalSeed: 32, isEliminated: false },
  { name: 'Saint Louis', seed: 9, regionalSeed: 9, region: 'Midwest', nationalSeed: 35, isEliminated: false },
  { name: 'Santa Clara', seed: 10, regionalSeed: 10, region: 'Midwest', nationalSeed: 37, isEliminated: false },
  { name: 'SMU/Miami (OH)', seed: 11, regionalSeed: 11, region: 'Midwest', nationalSeed: 43, isEliminated: false },
  { name: 'Akron', seed: 12, regionalSeed: 12, region: 'Midwest', nationalSeed: 48, isEliminated: false },
  { name: 'Hofstra', seed: 13, regionalSeed: 13, region: 'Midwest', nationalSeed: 52, isEliminated: false },
  { name: 'Wright St.', seed: 14, regionalSeed: 14, region: 'Midwest', nationalSeed: 57, isEliminated: false },
  { name: 'Tennessee St.', seed: 15, regionalSeed: 15, region: 'Midwest', nationalSeed: 59, isEliminated: false },
  { name: 'Howard/UMBC', seed: 16, regionalSeed: 16, region: 'Midwest', nationalSeed: 65, isEliminated: false },
];

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Accept a custom teams array from the request body, or fall back to built-in list
    const teamsToImport: typeof TEAMS_2026 = body.teams ?? TEAMS_2026;

    // Clear existing teams first to make this operation idempotent
    await clearCollection('teams');

    const batch = db.batch();
    const teamsRef = db.collection('teams');

    for (const team of teamsToImport) {
      const newDoc = teamsRef.doc();
      batch.set(newDoc, team);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Reset and imported ${teamsToImport.length} teams successfully.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
