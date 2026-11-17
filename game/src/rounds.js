// Round flow, economy ($800 start, kill reward, win/loss money), scores.
export function createRounds() {
  let playerMoney = 800;
  let teamScore = 0;
  let enemyScore = 0;
  let roundNumber = 1;
  let phase = 'buy'; // buy, active, ended
  let roundTimer = 115; // 1m55s per round
  let freezeTimer = 10; // 10s buy phase

  return {
    get money() { return playerMoney; },
    get teamScore() { return teamScore; },
    get enemyScore() { return enemyScore; },
    get roundNumber() { return roundNumber; },
    get phase() { return phase; },
    get roundTimer() { return roundTimer; },
    get freezeTimer() { return freezeTimer; },
    addMoney(amount) {
      playerMoney += amount;
    },
    spendMoney(amount) {
      if (playerMoney >= amount) {
        playerMoney -= amount;
        return true;
      }
      return false;
    },
    step(dt, onRoundEnd) {
      if (phase === 'buy') {
        freezeTimer -= dt;
        if (freezeTimer <= 0) {
          phase = 'active';
        }
      } else if (phase === 'active') {
        roundTimer -= dt;
        if (roundTimer <= 0) {
          // Time out -> defenders win
          enemyScore += 1;
          phase = 'ended';
          onRoundEnd('defense');
        }
      }
    },
    winRound(reason) {
      teamScore += 1;
      playerMoney += 3250;
      phase = 'ended';
    },
    loseRound(reason) {
      enemyScore += 1;
      playerMoney += 1400;
      phase = 'ended';
    },
    nextRound() {
      roundNumber += 1;
      phase = 'buy';
      freezeTimer = 10;
      roundTimer = 115;
    },
    reset() {
      playerMoney = 800;
      teamScore = 0;
      enemyScore = 0;
      roundNumber = 1;
      phase = 'buy';
      freezeTimer = 10;
      roundTimer = 115;
    },
  };
}
