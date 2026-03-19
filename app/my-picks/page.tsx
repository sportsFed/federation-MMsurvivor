  const handleProjectionPick = async (
    team: string,
    frameworkGameId: string,
    round: string,
    region: string | null
  ) => {
    if (!userId || !userEntry) {
      showMessage('You must be logged in to submit a pick.');
      return;
    }
    // Check game lock for R32 skeleton game
    const skeletonGame = games.find((g: any) => g.id === frameworkGameId);
    const projGameTime = skeletonGame?.gameTime ?? null;
    if (projGameTime && new Date() >= new Date(projGameTime)) {
      showMessage('This game has already started — pick is locked.');
      return;
    }
    if (alreadyPickedTeams.includes(team)) {
      showMessage(`You already used ${team} in a pick.`, 4000);
      return;
    }

    const skeletonGT = skeletonGame?.gameTime ?? null;
    let dateKey: string;
    if (skeletonGT) {
      const skeletonDateKey = getEasternDateKey(skeletonGT);
      const satDateKey = getEasternDateKey(SAT_ISO);
      const sunDateKey = getEasternDateKey(SUN_ISO);
      dateKey = skeletonDateKey === satDateKey ? '__sat__' : skeletonDateKey === sunDateKey ? '__sun__' : '__proj__';
    } else {
      dateKey = '__proj__';
    }