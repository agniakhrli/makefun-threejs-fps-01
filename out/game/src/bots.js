// AI Bots (Teammates & Enemies): movement on routes, line-of-sight detection, shooting, and damage reaction.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const WAYPOINTS = [
  new THREE.Vector3(0, 0, 10),
  new THREE.Vector3(-6, 0, 4),
  new THREE.Vector3(6, 0, 4),
  new THREE.Vector3(-8, 0, -6),
  new THREE.Vector3(8, 0, -6),
  new THREE.Vector3(0, 0, -12),
];

export function createBots(scene) {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.6, metalness: 0.05 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.45, metalness: 0.1 });
  const enemyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd9534f), roughness: 0.6, metalness: 0.05 }); // red tint for enemy
  const standMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.85 });

  const torsoGeometry = new THREE.BoxGeometry(0.52, 0.78, 0.3);
  const headGeometry = new THREE.SphereGeometry(0.155, 16, 12);
  const postGeometry = new THREE.BoxGeometry(0.1, 0.55, 0.1);
  const baseGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.5);

  const bots = [];
  const hitMeshes = [];

  // Define 3 enemy bots and 2 teammate bots
  const configs = [
    { team: 'enemy', pos: new THREE.Vector3(-8, 0, -12) },
    { team: 'enemy', pos: new THREE.Vector3(0, 0, -14) },
    { team: 'enemy', pos: new THREE.Vector3(8, 0, -12) },
    { team: 'ally', pos: new THREE.Vector3(-4, 0, 12) },
    { team: 'ally', pos: new THREE.Vector3(4, 0, 12) },
  ];

  for (let index = 0; index < configs.length; index += 1) {
    const cfg = configs[index];
    const group = new THREE.Group();
    group.position.copy(cfg.pos);

    const base = new THREE.Mesh(baseGeometry, standMaterial);
    base.position.y = 0.04;
    const post = new THREE.Mesh(postGeometry, standMaterial);
    post.position.y = 0.3;
    
    const mat = cfg.team === 'enemy' ? enemyMaterial : bodyMaterial;
    const torso = new THREE.Mesh(torsoGeometry, mat);
    torso.position.y = 1.0;
    torso.userData.part = 'torso';

    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.53;
    head.userData.part = 'head';

    group.add(base, post, torso, head);
    group.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    scene.add(group);

    const bot = {
      id: index,
      team: cfg.team,
      group,
      torso,
      head,
      health: 100,
      alive: true,
      home: cfg.pos.clone(),
      waypointIndex: index % WAYPOINTS.length,
      shootCooldown: 0,
      fall: 0,
      respawnAt: 0,
    };

    torso.userData.target = bot;
    head.userData.target = bot;
    if (cfg.team === 'enemy') {
      hitMeshes.push(torso, head);
    }
    bots.push(bot);
  }

  function damage(mesh, amount) {
    const bot = mesh.userData.target;
    if (!bot || !bot.alive || bot.team === 'ally') return false;
    bot.health -= amount;
    if (bot.health > 0) return false;
    bot.alive = false;
    bot.fall = 0;
    bot.respawnAt = 8; // respawn next round
    bot.group.visible = false;
    return true;
  }

  function step(dt, time, playerPos) {
    for (const bot of bots) {
      if (!bot.alive) continue;

      // Simple patrol / movement logic
      const targetWp = WAYPOINTS[bot.waypointIndex];
      const dir = new THREE.Vector3().subVectors(targetWp, bot.group.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 1.0) {
        bot.waypointIndex = (bot.waypointIndex + 1) % WAYPOINTS.length;
      } else {
        dir.normalize();
        bot.group.position.addScaledVector(dir, 1.8 * dt);
        bot.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // If enemy bot sees player close enough, look at player
      if (bot.team === 'enemy') {
        const pDist = bot.group.position.distanceTo(playerPos);
        if (pDist < 16) {
          bot.group.lookAt(playerPos.x, bot.group.position.y, playerPos.z);
        }
      }
    }
  }

  return {
    bots,
    hitMeshes,
    damage,
    step,
    remainingEnemies() {
      return bots.filter((b) => b.team === 'enemy' && b.alive).length;
    },
    reset() {
      for (const bot of bots) {
        bot.alive = true;
        bot.health = 100;
        bot.fall = 0;
        bot.group.visible = true;
        bot.group.position.copy(bot.home);
      }
    },
  };
}
