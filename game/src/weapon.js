// Multiple weapons (Rifle, Pistol, Shotgun) + Grenade, view models, reloads, and spread.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const WEAPONS = {
  rifle: {
    name: 'Assault Rifle',
    magSize: 30,
    reserve: 90,
    fireGap: 0.096,
    reloadTime: 1.9,
    spreadStill: 0.0022,
    spreadMoving: 0.028,
    damageBody: 34,
    damageHead: 100,
    cost: 0,
    type: 'rifle',
  },
  pistol: {
    name: 'Tactical Pistol',
    magSize: 12,
    reserve: 36,
    fireGap: 0.18,
    reloadTime: 1.2,
    spreadStill: 0.001,
    spreadMoving: 0.015,
    damageBody: 22,
    damageHead: 65,
    cost: 0,
    type: 'pistol',
  },
  shotgun: {
    name: 'Combat Shotgun',
    magSize: 8,
    reserve: 24,
    fireGap: 0.55,
    reloadTime: 2.2,
    spreadStill: 0.02,
    spreadMoving: 0.06,
    damageBody: 75,
    damageHead: 150,
    cost: 2000,
    type: 'shotgun',
  },
};

export function createWeapon(camera) {
  const gripMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.4, metalness: 0.3 });

  const model = new THREE.Group();
  
  // Create mesh parts for different weapons
  const rifleParts = (() => {
    const group = new THREE.Group();
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), bodyMat);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.4), gripMat);
    barrel.position.set(0, 0.025, -0.38);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.22), gripMat);
    stock.position.set(0, -0.02, 0.3);
    group.add(receiver, barrel, stock);
    return group;
  })();

  const pistolParts = (() => {
    const group = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.24), bodyMat);
    slide.position.set(0, 0.04, -0.08);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.08), gripMat);
    grip.position.set(0, -0.06, 0.04);
    group.add(slide, grip);
    return group;
  })();

  const shotgunParts = (() => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.5), bodyMat);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.45), gripMat);
    tube.position.set(0, -0.03, -0.35);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.28), gripMat);
    stock.position.set(0, -0.02, 0.32);
    group.add(body, tube, stock);
    return group;
  })();

  model.add(rifleParts, pistolParts, shotgunParts);
  model.position.set(0.24, -0.2, -0.42);
  camera.add(model);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  const inventory = {
    rifle: { mag: WEAPONS.rifle.magSize, reserve: WEAPONS.rifle.reserve, owned: true },
    pistol: { mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserve, owned: true },
    shotgun: { mag: WEAPONS.shotgun.magSize, reserve: WEAPONS.shotgun.reserve, owned: false },
  };

  let activeKey = 'rifle';
  let cooldown = 0;
  let reloadLeft = 0;
  let flashTimer = 0;
  let kick = 0;

  function updateActiveMesh() {
    rifleParts.visible = activeKey === 'rifle';
    pistolParts.visible = activeKey === 'pistol';
    shotgunParts.visible = activeKey === 'shotgun';
  }
  updateActiveMesh();

  function currentSpec() {
    return WEAPONS[activeKey];
  }

  function currentState() {
    return inventory[activeKey];
  }

  function step(dt) {
    cooldown = Math.max(0, cooldown - dt);
    flashTimer = Math.max(0, flashTimer - dt);
    kick += (0 - kick) * Math.min(1, dt * 14);
    model.position.z = -0.42 + kick;
    model.rotation.x = kick * 2.2;
    flash.visible = flashTimer > 0;
    flash.rotation.z = flashTimer * 30;
    flashLight.intensity = flashTimer > 0 ? 18 : 0;

    if (reloadLeft > 0) {
      reloadLeft = Math.max(0, reloadLeft - dt);
      const spec = currentSpec();
      model.rotation.x = -0.55 * Math.min(1, (spec.reloadTime - reloadLeft) * 2);
      if (reloadLeft === 0) {
        const state = currentState();
        const need = spec.magSize - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
      }
    }
  }

  return {
    WEAPONS,
    inventory,
    get activeKey() { return activeKey; },
    get spec() { return currentSpec(); },
    get state() { return currentState(); },
    step,
    select(key) {
      if (!inventory[key] || !inventory[key].owned || reloadLeft > 0) return false;
      activeKey = key;
      cooldown = 0.2;
      reloadLeft = 0;
      updateActiveMesh();
      return true;
    },
    buy(key) {
      const w = WEAPONS[key];
      if (!w || inventory[key].owned) return false;
      inventory[key].owned = true;
      inventory[key].mag = w.magSize;
      inventory[key].reserve = w.reserve;
      activeKey = key;
      updateActiveMesh();
      return true;
    },
    ready() {
      const state = currentState();
      return state.mag > 0 && cooldown === 0 && reloadLeft === 0;
    },
    pullTrigger() {
      const spec = currentSpec();
      cooldown = spec.fireGap;
      flashTimer = 0.06;
      kick = activeKey === 'shotgun' ? 0.09 : (activeKey === 'pistol' ? 0.035 : 0.055);
    },
    takeRound() {
      const state = currentState();
      if (state.mag <= 0) return false;
      state.mag -= 1;
      return true;
    },
    reload() {
      const spec = currentSpec();
      const state = currentState();
      if (reloadLeft > 0 || state.mag === spec.magSize || state.reserve === 0) return false;
      reloadLeft = spec.reloadTime;
      return true;
    },
    spread(speed) {
      const spec = currentSpec();
      const moveRef = 5.2;
      return spec.spreadStill + Math.min(1, speed / moveRef) * spec.spreadMoving;
    },
    refillAll() {
      for (const k of Object.keys(WEAPONS)) {
        inventory[k].mag = WEAPONS[k].magSize;
        inventory[k].reserve = WEAPONS[k].reserve;
      }
      cooldown = 0;
      reloadLeft = 0;
      flashTimer = 0;
      kick = 0;
    },
  };
}
