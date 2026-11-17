// Boot and simulation loop: fixed 60 Hz simulation, audio, bots, rounds, bomb objective, and rendering.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createBots } from './bots.js';
import { createRounds } from './rounds.js';
import { createObjective } from './objective.js';
import { createHud } from './hud.js';
import { audio } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.canvas), 22, 55);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);

const world = createWorld(scene);
const bots = createBots(scene);
const weapon = createWeapon(camera);
const rounds = createRounds();
const objective = createObjective(scene, world.bombSites);
const hud = createHud();
const player = createPlayer(world.colliders);

const raycaster = new THREE.Raycaster();
raycaster.far = 90;
const shootables = world.shootables.concat(bots.hitMeshes);
const direction = new THREE.Vector3();

const body = player.state;
const markerHoldMs = shot ? 4000 : 90;
let elapsed = 0;
let frozen = false;
let started = false;
let accumulator = 0;
let lastTime = performance.now();

hud.setAmmo(weapon.state.mag, weapon.state.reserve);
hud.setStats(rounds.money, rounds.roundNumber, rounds.roundTimer, rounds.teamScore, rounds.enemyScore);

hud.onPlay(() => {
  if (shot) return;
  audio.init();
  input.requestLock();
});

hud.onBuy((weaponKey) => {
  const wSpec = weapon.WEAPONS[weaponKey];
  if (wSpec && rounds.money >= wSpec.cost) {
    if (weapon.buy(weaponKey)) {
      rounds.spendMoney(wSpec.cost);
      hud.setAmmo(weapon.state.mag, weapon.state.reserve);
      audio.playReload();
    }
  }
});

function onAction(actionType, value) {
  if (actionType === 'weapon') {
    if (weapon.select(value)) {
      hud.setAmmo(weapon.state.mag, weapon.state.reserve);
    }
  } else if (actionType === 'buy') {
    if (document.pointerLockElement) document.exitPointerLock();
    hud.showOverlay('buy');
  } else if (actionType === 'plant') {
    // Check if inside site A or B
    for (const [sName, sData] of Object.entries(world.bombSites)) {
      if (body.position.distanceTo(sData.center) <= sData.radius) {
        if (objective.status === 'idle') {
          objective.startPlant(sName, body.position);
          audio.playBeep(true);
        } else if (objective.status === 'planted') {
          objective.startDefuse();
          audio.playBeep(false);
        }
      }
    }
  }
}

const input = createInput(renderer.domElement, onLockChange, onAction);

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    hud.hideOverlay();
  } else {
    hud.showOverlay(started ? 'paused' : 'start');
  }
}

function syncCamera() {
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
}

function shoot() {
  if (!weapon.ready()) return false;
  if (!weapon.takeRound()) return false;
  
  audio.playShot(weapon.spec.type);
  const spread = shot ? 0 : weapon.spread(player.groundSpeed());
  camera.getWorldDirection(direction);
  direction.x += (random() * 2 - 1) * spread;
  direction.y += (random() * 2 - 1) * spread;
  direction.z += (random() * 2 - 1) * spread;
  direction.normalize();

  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);
  const hit = raycaster.intersectObjects(shootables, false)[0];
  if (hit && hit.object.userData.target) {
    const isHead = hit.object.userData.part === 'head';
    const dmg = isHead ? weapon.spec.damageHead : weapon.spec.damageBody;
    const killed = bots.damage(hit.object, dmg);
    if (killed) {
      rounds.addMoney(300);
      audio.playHit(true);
    } else {
      audio.playHit(false);
    }
    hud.hitMarker(killed, markerHoldMs);

    if (bots.remainingEnemies() === 0) {
      rounds.winRound('elimination');
      hud.showOverlay('end', 'All enemies eliminated! Round won.');
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }
  weapon.pullTrigger();
  player.recoil(0.009 + random() * 0.004, (random() * 2 - 1) * 0.004);
  hud.setAmmo(weapon.state.mag, weapon.state.reserve);
  return true;
}

function step(dt) {
  elapsed += dt;
  player.step(dt, input.state.keys);
  weapon.step(dt);
  bots.step(dt, elapsed, body.position);
  rounds.step(dt, (reason) => {
    rounds.loseRound(reason);
    hud.showOverlay('end', 'Round lost.');
    if (document.pointerLockElement) document.exitPointerLock();
  });
  objective.step(dt, body.position, () => {
    audio.playExplosion();
    rounds.loseRound('explosion');
    hud.showOverlay('end', 'Bomb exploded! Round lost.');
    if (document.pointerLockElement) document.exitPointerLock();
  }, () => {
    rounds.winRound('defusal');
    hud.showOverlay('end', 'Bomb defused! Round won.');
    if (document.pointerLockElement) document.exitPointerLock();
  });

  hud.setStats(rounds.money, rounds.roundNumber, rounds.roundTimer, rounds.teamScore, rounds.enemyScore);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);
    if (input.state.firing && rounds.phase === 'active') shoot();
    if (input.state.keys.has('KeyR') && weapon.reload()) {
      audio.playReload();
    }
    accumulator += dt;
    while (accumulator >= FIXED_STEP) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  }
  syncCamera();
  renderer.render(scene, camera);

  if (shot) {
    frozen = true;
    setTimeout(() => {
      renderer.render(scene, camera);
      window.__shotReady = true;
    }, 120);
  }
}

if (shot) {
  // Setup deterministic shot state
  if (shot === 'play') {
    body.position.set(0, 0, 4);
    body.yaw = 0.2;
    body.pitch = -0.1;
    hud.hideOverlay();
  } else if (shot === 'end') {
    body.position.set(8, 0, -8);
    body.yaw = -1.5;
    body.pitch = 0.1;
    hud.showOverlay('end', 'All enemies eliminated! Round won.');
  }
  syncCamera();
}

requestAnimationFrame(frame);
