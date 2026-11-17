// The DOM HUD: crosshair, hit marker, ammo, money, rounds, timer, score, and buy menu.
const COPY = {
  start: {
    title: 'Bastion Breach',
    copy: 'Tactical 5v5 FPS. Eliminate enemies or plant/defuse the bomb at Site A or B. Click to play.',
    action: 'Click to play',
  },
  paused: {
    title: 'Bastion Breach',
    copy: 'Paused. Click to resume.',
    action: 'Click to resume',
  },
  buy: {
    title: 'Buy Phase',
    copy: 'Press B or use menu to buy weapons. Click to play.',
    action: 'Resume match',
  },
  end: {
    title: 'Round Over',
    copy: 'Round completed.',
    action: 'Next round',
  },
};

export function createHud() {
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const copy = document.getElementById('overlay-copy');
  const play = document.getElementById('play');
  const ammo = document.getElementById('ammo');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const hudMoney = document.getElementById('hud-money');
  const hudRound = document.getElementById('hud-round');
  const hudTimer = document.getElementById('hud-timer');
  const hudTeamScore = document.getElementById('hud-team-score');
  const hudEnemyScore = document.getElementById('hud-enemy-score');
  const hitmarker = document.getElementById('hitmarker');
  const buyShotgun = document.getElementById('buy-shotgun');
  const buyRifle = document.getElementById('buy-rifle');

  let hitTimer = 0;

  return {
    setAmmo(mag, reserve) {
      ammoMag.textContent = String(mag);
      ammoReserve.textContent = `/ ${reserve}`;
      ammo.classList.toggle('empty', mag === 0);
    },
    setStats(money, round, timerSec, teamScore, enemyScore) {
      hudMoney.textContent = `$${money}`;
      hudRound.textContent = String(round);
      const mins = Math.floor(timerSec / 60);
      const secs = Math.floor(timerSec % 60);
      hudTimer.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      hudTeamScore.textContent = String(teamScore);
      hudEnemyScore.textContent = String(enemyScore);
    },
    hitMarker(killed, holdMs = 90) {
      hitmarker.classList.add('on');
      hitmarker.style.transform = killed ? 'translate(-50%, -50%) rotate(45deg) scale(1.25)' : '';
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => {
        hitmarker.classList.remove('on');
        hitmarker.style.transform = '';
      }, holdMs);
    },
    showOverlay(mode, extra = '') {
      const text = COPY[mode] || COPY.start;
      title.textContent = text.title;
      copy.textContent = extra || text.copy;
      play.textContent = text.action;
      overlay.hidden = false;
    },
    hideOverlay() {
      overlay.hidden = true;
    },
    onPlay(handler) {
      play.addEventListener('click', handler);
    },
    onBuy(handler) {
      if (buyShotgun) buyShotgun.addEventListener('click', () => handler('shotgun'));
      if (buyRifle) buyRifle.addEventListener('click', () => handler('rifle'));
    },
  };
}
