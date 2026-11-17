// The tactical map: "Foundry Arena" with two bomb sites (A and B), lanes, sightlines, and cover.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};
  for (const name of Object.keys(PALETTE)) {
    materials[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'accent' || name === 'ink' ? 0.55 : 0.92,
      metalness: 0.03,
    });
  }

  const colliders = [];
  const shootables = [];
  const bombSites = {
    A: { center: new THREE.Vector3(-8, 0, -10), radius: 2.5, mesh: null },
    B: { center: new THREE.Vector3(8, 0, -10), radius: 2.5, mesh: null },
  };

  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // Arena floor: 32 x 36 m
  box(32.4, 0.4, 36.4, 0, -0.2, 0, 'canvas');

  // Outer walls (4.6m high)
  box(0.4, 4.6, 36.4, -16.2, 2.3, 0, 'surface');
  box(0.4, 4.6, 36.4, 16.2, 2.3, 0, 'surface');
  box(32.4, 4.6, 0.4, 0, 2.3, -18.2, 'surface');
  box(32.4, 4.6, 0.4, 0, 2.3, 18.2, 'surface');

  // Interior dividing walls & lanes (Mid courtyard, A site left, B site right)
  // Mid divider wall
  box(0.8, 4.6, 14, 0, 2.3, -4, 'hairline');
  // Cross wall with archways/openings
  box(10, 4.6, 0.8, -8, 2.3, 2, 'hairline');
  box(10, 4.6, 0.8, 8, 2.3, 2, 'hairline');

  // Cover crates and obstacles
  box(2.2, 1.2, 2.2, -4, 0.6, -10, 'hairline'); // Site A cover crate
  box(2.2, 1.2, 2.2, 4, 0.6, -10, 'hairline');  // Site B cover crate
  box(1.5, 0.8, 1.5, -12, 0.4, -4, 'hairline');
  box(1.5, 0.8, 1.5, 12, 0.4, -4, 'hairline');
  box(3.0, 1.0, 1.2, 0, 0.5, 8, 'hairline');    // Mid cover
  box(1.2, 2.2, 1.2, -6, 1.1, 10, 'hairline');
  box(1.2, 2.2, 1.2, 6, 1.1, 10, 'hairline');

  // Bomb Site A visual marker on floor
  const siteGeo = new THREE.RingGeometry(1.8, 2.2, 32);
  siteGeo.rotateX(-Math.PI / 2);
  const siteMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  
  const meshA = new THREE.Mesh(siteGeo, siteMat);
  meshA.position.set(-8, 0.02, -10);
  group.add(meshA);
  bombSites.A.mesh = meshA;

  const meshB = new THREE.Mesh(siteGeo, siteMat.clone());
  meshB.position.set(8, 0.02, -10);
  group.add(meshB);
  bombSites.B.mesh = meshB;

  // Lighting
  const sky = new THREE.HemisphereLight(new THREE.Color(PALETTE.surface), new THREE.Color(PALETTE.canvas), 1.2);
  scene.add(sky);

  const key = new THREE.DirectionalLight(new THREE.Color(PALETTE.ink), 2.2);
  key.position.set(12, 18, 10);
  key.target.position.set(0, 0, -4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  key.shadow.camera.far = 55;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(new THREE.Color(PALETTE.muted), 0.6);
  fill.position.set(-10, 10, 12);
  scene.add(fill);

  return { colliders, shootables, group, bombSites };
}
