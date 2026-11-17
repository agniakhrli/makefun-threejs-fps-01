// Bomb objective: plant at Site A or B, defuse timer, explosion.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createObjective(scene, bombSites) {
  const bombGeo = new THREE.BoxGeometry(0.4, 0.2, 0.4);
  const bombMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.3, metalness: 0.5 });
  const mesh = new THREE.Mesh(bombGeo, bombMat);
  mesh.visible = false;
  scene.add(mesh);

  let status = 'idle'; // idle, planting, planted, defusing, exploded, defused
  let siteName = null;
  let timer = 0;
  let plantProgress = 0;
  let defuseProgress = 0;
  const plantTime = 3.0;
  const defuseTime = 5.0;
  const explodeTime = 40.0;

  return {
    get status() { return status; },
    get siteName() { return siteName; },
    get timer() { return timer; },
    get plantProgress() { return plantProgress; },
    get defuseProgress() { return defuseProgress; },
    mesh,
    reset() {
      status = 'idle';
      siteName = null;
      timer = 0;
      plantProgress = 0;
      defuseProgress = 0;
      mesh.visible = false;
    },
    startPlant(sName, pos) {
      if (status !== 'idle') return;
      status = 'planting';
      siteName = sName;
      plantProgress = 0;
    },
    cancelPlant() {
      if (status === 'planting') {
        status = 'idle';
        plantProgress = 0;
        siteName = null;
      }
    },
    startDefuse() {
      if (status !== 'planted') return;
      status = 'defusing';
      defuseProgress = 0;
    },
    cancelDefuse() {
      if (status === 'defusing') {
        status = 'planted';
        defuseProgress = 0;
      }
    },
    step(dt, playerPos, onExplode, onDefuse) {
      if (status === 'planting') {
        plantProgress += dt;
        if (plantProgress >= plantTime) {
          status = 'planted';
          timer = explodeTime;
          mesh.position.copy(bombSites[siteName].center);
          mesh.position.y = 0.1;
          mesh.visible = true;
        }
      } else if (status === 'planted') {
        timer -= dt;
        if (timer <= 0) {
          status = 'exploded';
          onExplode();
        }
      } else if (status === 'defusing') {
        defuseProgress += dt;
        if (defuseProgress >= defuseTime) {
          status = 'defused';
          mesh.visible = false;
          onDefuse();
        }
      }
    },
  };
}
