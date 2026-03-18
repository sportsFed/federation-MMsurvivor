import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { calculateSurvivorScore } from '@/lib/scoring';

export async function POST(request: Request) {
  try {
    const entriesSnapshot = await getDocs(collection(db, 'entries'));
    
    for (const entryDoc of entriesSnapshot.docs) {
      const data = entryDoc.data();
      let newTotal = 0;
      
      // Re-sum all survivor picks based on Seed x Multiplier
      data.survivorPicks?.forEach((pick: any) => {
        newTotal += calculateSurvivorScore(pick.seed, pick.round);
      });

      // Include any already-awarded finalFourPoints (set by score-final-four endpoint)
      newTotal += data.finalFourPoints ?? 0;

      await updateDoc(doc(db, 'entries', entryDoc.id), { totalPoints: newTotal });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
