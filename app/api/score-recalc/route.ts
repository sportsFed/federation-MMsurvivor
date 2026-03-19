import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { calculateSurvivorScore } from '@/lib/scoring';

export async function POST(request: Request) {
  try {
    const entriesSnapshot = await getDocs(collection(db, 'entries'));
    
    for (const entryDoc of entriesSnapshot.docs) {
      const data = entryDoc.data();
      let survivorPts = 0;
      
      // Re-sum only winning picks (losses contribute via consolationPoints, not survivorPts)
      data.survivorPicks?.forEach((pick: any) => {
        if (pick.result === 'win') {
          survivorPts += calculateSurvivorScore(pick.seed, pick.round);
        }
      });

      const consolationPts = data.consolationPoints ?? 0;
      const finalFourPts = data.finalFourPoints ?? 0;
      const newTotal = parseFloat((survivorPts + consolationPts + finalFourPts).toFixed(1));

      await updateDoc(doc(db, 'entries', entryDoc.id), { totalPoints: newTotal });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
