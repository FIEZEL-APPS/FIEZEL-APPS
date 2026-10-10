/**
 * FiezelMochi - True 3D Volumetric Viscoelastic Jelly Mascot Engine
 * Built with Three.js (Offline Local Module)
 *
 * Features:
 * - Authentic 3D Marshmallow Daifuku Cushion Geometry (G2 smooth superellipsoid with weighted base)
 * - PBR Matte Velvet Clay Material with Dynamic Ambient Underglow & Subsurface Rim
 * - Disney 12 Principles Animation: Multi-Harmonic Breathing, 90° Phase Inertia Squash & Stretch
 * - Damped Harmonic Viscoelastic Jiggle & Surface Wobble on interaction
 * - 3D Crisp Expressive Facial Features (Dots with natural blink, Wink, Happy, Heart Eyes with pulse, Sleepy)
 * - Soft Rosy Blurred Cheek Blushes
 * - Dynamic 3D Stardust Orbit with Glowing Satellite Moon
 * - 3D Floating Notification Badges with Independent Spring Lag
 * - Modular Bongkar-Pasang Architecture for PWA Fiezel
 */
import * as THREE from './three.module.js';

export class FiezelMochi {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('FiezelMochi: Container element not found');

    // State Configuration
    this.mood = options.mood || 'wink';             // 'dots', 'wink', 'happy', 'hearts', 'sleepy'
    this.badge = options.badge || null;             // null, 'chat_purple', 'chat_blue', 'alert', 'online'
    this.fx = options.fx || null;                   // null, 'orbit', 'stars', 'hearts'
    this.aura = options.aura || null;               // null, 'purple', 'blue', 'amber', 'green', 'pink'
    this.showHands = options.showHands ?? true;
    this.showEars = options.showEars ?? true;
    this.showTail = options.showTail ?? false;

    this.width = options.width || 380;
    this.height = options.height || 360;

    // Physics & Motion State
    this.time = 0;
    this.targetRot = { x: 0, y: 0 };
    this.currentRot = { x: 0, y: 0 };
    this.floatPos = { y: 0, prevY: 0, velY: 0 };

    // Viscoelastic Damped Spring Physics (Squash & Stretch & Jiggle)
    this.squish = {
      x: 1, y: 1, z: 1,
      targetX: 1, targetY: 1, targetZ: 1,
      velX: 0, velY: 0, velZ: 0,
      jiggleTimer: 0,
      jiggleAmp: 0
    };

    // Badge spring lag
    this.badgeLag = { y: 0, velY: 0 };

    // 2-Stage Elastic Damped Spring Rig for Ears (Base Joint & Cartilage Tip)
    this.earPhys = {
      L: { rx: 0, ry: 0, rz: Math.PI * 0.15, vx: 0, vy: 0, vz: 0, tip: 0, tipVel: 0 },
      R: { rx: 0, ry: 0, rz: -Math.PI * 0.15, vx: 0, vy: 0, vz: 0, tip: 0, tipVel: 0 }
    };
    this.earFlex = { l: 0, r: 0, velL: 0, velR: 0 };

    // Dynamic Retractable Hands State (Hidden in idle, emerges on user interaction)
    this.handState = 'hidden';      // 'hidden', 'cheer', 'sad', 'wave'
    this.handProgress = 0.0;       // 0.0 (tucked inside) to 1.0 (active)
    this.handTimer = 0.0;          // Auto-retract countdown timer

    // Dynamic ear wiggle burst on question transitions or interactions
    this.earWiggleTimer = 0.0;
    this.earWiggleDuration = 0.65;
    this.earWiggleIntensity = 1.0;

    // Eye blinking
    this.blinkTimer = 0;
    this.nextBlink = 2.8;
    this.blinkFactor = 0; // 0 to 1

    this.initScene();
    this.createMochiMesh();
    this.createFoxEars();
    this.createCatTail();
    this.createFaceObjects();
    this.createShadow();
    this.createOrbit();
    this.createBadge();
    this.createParticles();
    this.setupLighting();
    this.bindEvents();

    // Apply initial aura & visibility
    if (this.aura) this.setAura(this.aura);
    this.start();
  }

  initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(44, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.08, 5.35); // Close-up framing: plush, prominent Daifuku Mochi with generous bounds


    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    // Tone mapping is strictly NoToneMapping to banish dark/black edge fringes along transparent alpha borders!
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.objectFit = 'contain';
    this.renderer.domElement.style.pointerEvents = 'auto';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.userSelect = 'none';
    this.renderer.domElement.style.webkitUserSelect = 'none';
    this.renderer.domElement.style.cursor = 'grab';

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  updateSize(width, height) {
    if (!width || !height || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  setupLighting() {
    // 1. Soft warm ambient studio light (calibrated to preserve form shadows & 3D curvature)
    this.ambientLight = new THREE.AmbientLight(0xFFFDF8, 1.45);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light: Pure white sky, warm cream ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFF0E5, 1.25);
    this.scene.add(this.hemiLight);

    // 3. Key directional light from top-front-right (soft form gradient, not blown out)
    this.keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.40);
    this.keyLight.position.set(2.4, 3.8, 3.8);
    this.scene.add(this.keyLight);

    // 4. Crisp specular glint light for authentic wet/glossy glazed mochi sheen
    this.glintLight = new THREE.DirectionalLight(0xFFFFFF, 0.45);
    this.glintLight.position.set(-1.4, 2.8, 4.2);
    this.scene.add(this.glintLight);

    // 5. Warm upward bounce light from bottom (soft creamy daifuku underbelly)
    this.bounceLight = new THREE.DirectionalLight(0xFFF2E6, 0.65);
    this.bounceLight.position.set(0, -3.2, 1.4);
    this.scene.add(this.bounceLight);

    // 6. Subtle cool fill light from side
    this.fillLight = new THREE.DirectionalLight(0xF1F5F9, 0.45);
    this.fillLight.position.set(-3.5, 0.2, 2.4);
    this.scene.add(this.fillLight);

    // 7. Soft rosy rim light from back-top (outlines ears & crown against light backgrounds!)
    this.rimLight = new THREE.DirectionalLight(0xFFD8E4, 1.35);
    this.rimLight.position.set(0, 3.8, -2.8);
    this.scene.add(this.rimLight);

    // 8. Dynamic Colored Aura Point Light (bounce underglow onto belly)
    this.auraLight = new THREE.PointLight(0x9D65FF, 0, 9);
    this.auraLight.position.set(0, -1.1, 0.2);
    this.scene.add(this.auraLight);
  }

  /**
   * Builds an authentic organic Daifuku / Mochi Cushion Mesh.
   * G2 continuous curvature with chubby cheeks and weighted bottom.
   * Ultra-dense 128x96 subdivision for mathematically silky smooth antialiased contours.
   */
  createMochiMesh() {
    const geo = new THREE.SphereGeometry(1.22, 128, 96);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Base proportions: Width 1.34, Height 1.06, Depth 0.90
      x *= 1.32;
      y *= 1.05;
      z *= 0.89;

      // Organic power curvature (G2 continuous curve, eliminates flat tabletop)
      const signX = Math.sign(x);
      const signY = Math.sign(y);
      const signZ = Math.sign(z);

      const ax = Math.pow(Math.abs(x / 1.32), 0.68) * 1.32 * signX;
      const ay = Math.pow(Math.abs(y / 1.05), 0.74) * 1.05 * signY;
      const az = Math.pow(Math.abs(z / 0.89), 0.74) * 0.89 * signZ;

      x = x * 0.54 + ax * 0.46;
      y = y * 0.58 + ay * 0.42;
      z = z * 0.58 + az * 0.42;

      // Gravitational sagging at bottom
      if (y < 0.25) {
        const factor = (0.25 - y) * 0.13;
        x *= (1.0 + factor);
        z *= (1.0 + factor * 0.6);
      }

      // PHYSICAL 3D CHUBBY CHEEK CONTOUR (Bulges outward on X & Z at cheek level)
      // Smooth continuous outward displacement with zero seam discontinuity
      const chDistL = Math.hypot(x - (-0.56), y - (-0.10));
      const chDistR = Math.hypot(x - (0.56), y - (-0.10));
      const chDist = Math.min(chDistL, chDistR);
      if (z > 0.05 && chDist < 0.68) {
        const chBulge = Math.cos((chDist / 0.68) * Math.PI * 0.5) ** 2 * 0.22;
        z += chBulge;
        const xDisplace = Math.min(1.0, Math.abs(x) / 0.40);
        x += (x >= 0 ? 1 : -1) * xDisplace * chBulge * 0.35;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();

    // AUTHENTIC GLOSSY DAIFUKU MOCHI WITH AIRBRUSHED ROSY CHEEK CONTOURS
    // Paints soft, delectable rosy blushes directly onto the daifuku rice skin texture
    this.skinCanvas = document.createElement('canvas');
    this.skinCanvas.width = 1024;
    this.skinCanvas.height = 1024;
    this.sCtx = this.skinCanvas.getContext('2d');
    this.mochiSkinTexture = new THREE.CanvasTexture(this.skinCanvas);

    this.updateSkinBlush();

    // Mouth-watering velvety Daifuku skin with soft peach-rose edge sheen
    this.mochiMaterial = new THREE.MeshPhysicalMaterial({
      map: this.mochiSkinTexture,
      color: 0xFFFFFF,
      roughness: 0.28,
      metalness: 0.0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.25,
      sheen: 0.90,
      sheenRoughness: 0.30,
      sheenColor: new THREE.Color(0xFFD2DE), // Soft rosy peach sheen along silhouette: pops on white & cream!
      ior: 1.45
    });

    this.mochiMesh = new THREE.Mesh(geo, this.mochiMaterial);

    this.mochiGroup = new THREE.Group();
    this.mochiGroup.position.x = 0.0; // Centered
    this.mochiGroup.add(this.mochiMesh);
    this.scene.add(this.mochiGroup);

    // Detached FLOATING cat paws (Rayman-style) - Plump marshmallow paws matching Option C
    const handMat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFDF9,
      roughness: 0.16,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      sheen: 0.65,
      sheenRoughness: 0.20,
      sheenColor: new THREE.Color(0xFFE8EE)
    });

    // Soft strawberry-pink glossy paw pad material
    const beanMat = new THREE.MeshPhysicalMaterial({
      color: 0xFF7696,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xFFAEC4)
    });

    const buildPaw = (side) => {
      const paw = new THREE.Group();
      const core = new THREE.Group();
      paw.add(core);

      // 1. Chubby Palm Base (smooth plump marshmallow cushion)
      const palmGeo = new THREE.SphereGeometry(0.19, 32, 24);
      palmGeo.scale(1.08, 1.15, 0.74);
      const palmMesh = new THREE.Mesh(palmGeo, handMat);
      core.add(palmMesh);

      // 2. 4 Chubby Pillowy Toes nestled smoothly along the top curved arch (Option C)
      const toeGeo = new THREE.SphereGeometry(0.066, 24, 18);
      const toeAngles = [
        { x: -0.112, y: 0.142, s: 0.94, rx: 0.04, rz: 0.28 },
        { x: -0.040, y: 0.188, s: 1.04, rx: 0.02, rz: 0.08 },
        { x:  0.040, y: 0.188, s: 1.04, rx: 0.02, rz: -0.08 },
        { x:  0.112, y: 0.142, s: 0.94, rx: 0.04, rz: -0.28 }
      ];

      toeAngles.forEach((t) => {
        const toe = new THREE.Mesh(toeGeo, handMat);
        toe.position.set(t.x, t.y, 0.0);
        toe.scale.set(t.s, t.s * 1.18, t.s * 0.88);
        toe.rotation.set(t.rx, 0, t.rz);
        core.add(toe);
      });

      // 3. Pink Toe Beans (Soft glossy rounded cushions protruding proudly on each toe)
      const beanGeo = new THREE.SphereGeometry(0.032, 20, 14);
      toeAngles.forEach((t) => {
        const bean = new THREE.Mesh(beanGeo, beanMat);
        bean.position.set(t.x, t.y + 0.008, 0.096);
        bean.scale.set(0.96, 1.16, 0.46);
        bean.rotation.set(-0.12, 0, t.rz * 0.8);
        core.add(bean);
      });

      // 4. Plump Heart/Bean Palm Pad (Cute glossy strawberry-pink main pad, sits prominently on palm)
      const padGeo = new THREE.SphereGeometry(0.076, 24, 18);
      const padMesh = new THREE.Mesh(padGeo, beanMat);
      padMesh.position.set(0, -0.025, 0.128);
      padMesh.scale.set(1.42, 1.05, 0.48);
      padMesh.rotation.set(-0.12, 0, 0);
      core.add(padMesh);

      paw.userData = { side, core };
      paw.scale.set(0.001, 0.001, 0.001);
      paw.visible = false;
      return paw;
    };

    this.handL = buildPaw(-1);
    this.handR = buildPaw(1);
    this.handL.position.set(-1.10, -0.22, 0.20);
    this.handR.position.set(1.10, -0.22, 0.20);
    this.mochiGroup.add(this.handL);
    this.mochiGroup.add(this.handR);
  }

  /**
   * Airbrushes natural rosy blushes directly onto the 3D cheek contour of the daifuku skin.
   * Conforms seamlessly to the cheek contour curvature, with ZERO balloon mesh or eye overlap.
   */
  updateSkinBlush() {
    if (!this.sCtx || !this.skinCanvas) return;
    const sCtx = this.sCtx;
    const bgGrad = sCtx.createLinearGradient(0, 0, 0, 1024);
    bgGrad.addColorStop(0.00, '#FFFFFF');
    bgGrad.addColorStop(0.50, '#FFFDF9');
    bgGrad.addColorStop(0.85, '#FFF7F2');
    bgGrad.addColorStop(1.00, '#FFEFE5');
    sCtx.fillStyle = bgGrad;
    sCtx.fillRect(0, 0, 1024, 1024);

    const isPout = (this.mood === 'pout' || this.mood === 'sleepy');

    const drawCheekBlush = (u, v, rX, rY, isPoutMood) => {
      const cx = u * 1024;
      const cy = (1 - v) * 1024; // Three.js UV V is flipped relative to Canvas Y

      sCtx.save();
      sCtx.translate(cx, cy);
      sCtx.scale(1.0, rY / rX);

      const grad = sCtx.createRadialGradient(0, 0, 0, 0, 0, rX);

      if (isPoutMood) {
        // Deep, rich strawberry-red sulk flush on the puffed cheek contour!
        // Matches "pipi merah yang kembung kiri dan kanan" 1:1!
        grad.addColorStop(0.00, 'rgba(255, 24, 75, 0.98)');   // Deep strawberry-red core
        grad.addColorStop(0.25, 'rgba(255, 48, 95, 0.92)');   // Warm vibrant rosy flush
        grad.addColorStop(0.52, 'rgba(255, 96, 138, 0.72)');  // Puffed cheek contour bloom
        grad.addColorStop(0.78, 'rgba(255, 160, 192, 0.35)');
        grad.addColorStop(0.94, 'rgba(255, 220, 235, 0.10)');
        grad.addColorStop(1.00, 'rgba(255, 253, 249, 0)');    // Seamless fade into daifuku dough
      } else {
        // Soft, sweet kawaii peach-rose mochi blush
        grad.addColorStop(0.00, 'rgba(255, 75, 125, 0.94)');
        grad.addColorStop(0.35, 'rgba(255, 115, 155, 0.78)');
        grad.addColorStop(0.68, 'rgba(255, 168, 195, 0.38)');
        grad.addColorStop(1.00, 'rgba(255, 253, 249, 0)');
      }

      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(0, 0, rX, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();
    };

    // Aligned with the physical 3D cheek contour bulges at peak UVs (u = 0.208 & 0.292, v = 0.468)
    if (isPout) {
      drawCheekBlush(0.208, 0.468, 44, 34, true);
      drawCheekBlush(0.292, 0.468, 44, 34, true);
    } else {
      drawCheekBlush(0.208, 0.468, 36, 28, false);
      drawCheekBlush(0.292, 0.468, 36, 28, false);
    }

    if (this.mochiSkinTexture) {
      this.mochiSkinTexture.needsUpdate = true;
    }
  }

  /**
   * 3D Organic Sculpted Fox Ears with 2-Stage Cartilage Spring Flex.
   * Wide curved base, chubby petal flanks, filleted rounded tip (zero sharp needle points),
   * soft rosy inner ear hollow, and textured inner fur tufts matching mochi-design-floating.jpg.
   */
  createFoxEars() {
    this.earsGroup = new THREE.Group();
    this.earsGroup.visible = this.showEars;
    this.mochiGroup.add(this.earsGroup);

    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xFF829E, // Deeper, appetizing rosy strawberry inner ear: pops vividly against white!
      roughness: 0.60,
      metalness: 0.0
    });

    // 1. Organic Petal Bezier Shape for Fox Ears
    const earShape = new THREE.Shape();
    earShape.moveTo(-0.32, 0);
    earShape.bezierCurveTo(-0.44, 0.28, -0.38, 0.68, -0.12, 0.92);
    earShape.bezierCurveTo(-0.04, 0.98, 0.04, 0.98, 0.12, 0.92);
    earShape.bezierCurveTo(0.38, 0.68, 0.44, 0.28, 0.32, 0);
    earShape.bezierCurveTo(0.16, -0.06, -0.16, -0.06, -0.32, 0);

    const earExtrudeSettings = {
      depth: 0.10,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06
    };
    const earOuterGeo = new THREE.ExtrudeGeometry(earShape, earExtrudeSettings);

    const pos = earOuterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i) - 0.05;
      z -= Math.pow(Math.max(0, y) / 0.95, 1.3) * 0.14;
      if (z > 0 && Math.abs(x) < 0.26) z -= 0.030;
      pos.setXYZ(i, x, y, z);
    }
    earOuterGeo.computeVertexNormals();

    // 2. Rosy Inner Hollow
    const innerShape = new THREE.Shape();
    innerShape.moveTo(-0.20, 0.04);
    innerShape.bezierCurveTo(-0.28, 0.26, -0.24, 0.56, -0.07, 0.76);
    innerShape.bezierCurveTo(-0.02, 0.80, 0.02, 0.80, 0.07, 0.76);
    innerShape.bezierCurveTo(0.24, 0.56, 0.28, 0.26, 0.20, 0.04);
    innerShape.bezierCurveTo(0.08, -0.02, -0.08, -0.02, -0.20, 0.04);

    const earInnerGeo = new THREE.ExtrudeGeometry(innerShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04
    });
    const inPos = earInnerGeo.attributes.position;
    for (let i = 0; i < inPos.count; i++) {
      let x = inPos.getX(i);
      let y = inPos.getY(i);
      let z = inPos.getZ(i) + 0.015;
      z -= Math.pow(Math.max(0, y) / 0.75, 1.3) * 0.10;
      inPos.setXYZ(i, x, y, z);
    }
    earInnerGeo.computeVertexNormals();

    // Left Fox Ear Rig
    this.earL = new THREE.Group();
    this.earL.position.set(-0.52, 0.94, 0.06);

    this.earL_Flex = new THREE.Group();
    this.earL_Flex.add(new THREE.Mesh(earOuterGeo, this.mochiMaterial));
    this.earL_Flex.add(new THREE.Mesh(earInnerGeo, innerEarMat));

    // Ear fur tufts inside hollow
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0xFFB4C8, roughness: 0.80 });
    const tuftL1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), tuftMat);
    tuftL1.position.set(-0.07, 0.18, 0.06);
    tuftL1.scale.set(0.8, 1.3, 0.6);
    this.earL_Flex.add(tuftL1);

    const tuftL2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), tuftMat);
    tuftL2.position.set(0.05, 0.24, 0.06);
    tuftL2.scale.set(0.7, 1.2, 0.6);
    this.earL_Flex.add(tuftL2);

    this.earL.add(this.earL_Flex);

    // Right Fox Ear Rig
    this.earR = new THREE.Group();
    this.earR.position.set(0.52, 0.94, 0.06);

    this.earR_Flex = new THREE.Group();
    this.earR_Flex.add(new THREE.Mesh(earOuterGeo, this.mochiMaterial));
    this.earR_Flex.add(new THREE.Mesh(earInnerGeo, innerEarMat));

    const tuftR1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), tuftMat);
    tuftR1.position.set(0.07, 0.18, 0.06);
    tuftR1.scale.set(0.8, 1.3, 0.6);
    this.earR_Flex.add(tuftR1);

    const tuftR2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), tuftMat);
    tuftR2.position.set(-0.05, 0.24, 0.06);
    tuftR2.scale.set(0.7, 1.2, 0.6);
    this.earR_Flex.add(tuftR2);

    this.earR.add(this.earR_Flex);

    this.earsGroup.add(this.earL);
    this.earsGroup.add(this.earR);

    this.earTwitchTimer = 3.0;
    this.nextEarTwitch = 3.5;
    this.twitchEar = 'L';
  }

  /**
   * 3D Voluminous Fluffy Bushy Plume Tail with Continuous Smooth Catmull-Rom Loft.
   * Matches mochi-design-floating.jpg 1:1.
   * Originates from rear bottom, sweeps down and outward into open space,
   * then arches UP gracefully in a tall, majestic S-curve plume reaching ear height.
   * Completely seamless, organic, continuous 3D fur volume (zero caterpillar spheres).
   */
  createCatTail() {
    this.tailGroup = new THREE.Group();
    this.tailGroup.visible = this.showTail;
    this.mochiGroup.add(this.tailGroup);

    // 7 base spline control points along the plume spine (matching mochi-design-floating.jpg)
    this.tailBasePoints = [
      new THREE.Vector3(0.42, -0.72, -0.25),
      new THREE.Vector3(0.80, -0.65, -0.05),
      new THREE.Vector3(1.20, -0.36, 0.15),
      new THREE.Vector3(1.42, 0.10, 0.22),
      new THREE.Vector3(1.36, 0.54, 0.20),
      new THREE.Vector3(1.12, 0.94, 0.14),
      new THREE.Vector3(0.86, 1.24, 0.06)
    ];

    this.tailCurrentPoints = this.tailBasePoints.map(p => p.clone());

    // N rings along spine, M radial vertices per ring
    this.tailN = 28;
    this.tailM = 20;

    const numVerts = (this.tailN + 1) * this.tailM + 1; // +1 for tip cap
    this.tailPositions = new Float32Array(numVerts * 3);
    const indices = [];

    for (let i = 0; i < this.tailN; i++) {
      for (let j = 0; j < this.tailM; j++) {
        const nextJ = (j + 1) % this.tailM;
        const v0 = i * this.tailM + j;
        const v1 = i * this.tailM + nextJ;
        const v2 = (i + 1) * this.tailM + j;
        const v3 = (i + 1) * this.tailM + nextJ;
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }
    }
    // Tip fan
    const tipIdx = (this.tailN + 1) * this.tailM;
    for (let j = 0; j < this.tailM; j++) {
      const nextJ = (j + 1) % this.tailM;
      indices.push(this.tailN * this.tailM + j, tipIdx, this.tailN * this.tailM + nextJ);
    }

    this.tailGeo = new THREE.BufferGeometry();
    this.tailPosAttr = new THREE.BufferAttribute(this.tailPositions, 3);
    this.tailPosAttr.setUsage(THREE.DynamicDrawUsage);
    this.tailGeo.setAttribute('position', this.tailPosAttr);
    this.tailGeo.setIndex(indices);

    this.tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xFDFAF5,
      roughness: 0.58,
      metalness: 0.0
    });

    this.tailMesh = new THREE.Mesh(this.tailGeo, this.tailMaterial);
    this.tailGroup.add(this.tailMesh);

    this.updateTailLoftMesh(0);
  }

  /**
   * Continuous Loft Mesh Generator and Harmonic Traveling Wave Kinematics.
   */
  updateTailLoftMesh(dt) {
    if (!this.showTail || !this.tailGeo) return;

    // 1. Kinematic wave along spline control points
    for (let i = 0; i < this.tailBasePoints.length; i++) {
      const base = this.tailBasePoints[i];
      const cur = this.tailCurrentPoints[i];

      if (i === 0) {
        cur.copy(base);
        continue;
      }

      if (this.mood === 'happy') {
        const wagFreq = 9.5;
        const phase = this.time * wagFreq - i * 0.40;
        const wagZ = Math.sin(phase) * (0.08 + i * 0.04);
        const wagX = Math.cos(phase * 0.5) * (0.04 + i * 0.03);
        const wagY = (i * 0.035);
        cur.set(base.x + wagX, base.y + wagY, base.z + wagZ);

      } else if (this.mood === 'sleepy') {
        const phase = this.time * 1.2 - i * 0.32;
        const droopY = -i * 0.12;
        const curlX = -i * 0.05;
        const droopZ = Math.sin(phase) * 0.04;
        cur.set(base.x + curlX, base.y + droopY, base.z + droopZ);

      } else {
        const swayFreq = 2.0;
        const phase = this.time * swayFreq - i * 0.42;
        const waveZ = Math.sin(phase) * (0.05 + i * 0.035);
        const waveX = Math.cos(phase * 0.75) * (0.03 + i * 0.02);
        const waveY = Math.sin(phase * 0.6) * 0.025;
        cur.set(base.x + waveX, base.y + waveY, base.z + waveZ);
      }
    }

    // 2. Generate smooth 3D Catmull-Rom spline & Frenet frames
    const curve = new THREE.CatmullRomCurve3(this.tailCurrentPoints, false, 'catmullrom', 0.5);
    const frames = curve.computeFrenetFrames(this.tailN, false);

    const pos = this.tailPositions;
    let ptr = 0;

    for (let i = 0; i <= this.tailN; i++) {
      const t = i / this.tailN;
      const P = curve.getPointAt(t);
      const norm = frames.normals[i];
      const binorm = frames.binormals[i];

      // Voluminous fluffy fur profile: thick mid-high plume belly
      const peakT = 0.48;
      const s = t < peakT ? (t / peakT) : ((1.0 - t) / (1.0 - peakT));
      const ease = s * s * (3 - 2 * s);
      const r = (0.22 + ease * 0.44) * (1.0 - Math.pow(t, 6) * 0.75);

      for (let j = 0; j < this.tailM; j++) {
        const angle = (j / this.tailM) * Math.PI * 2;
        const cosA = Math.cos(angle) * 1.22 * r;
        const sinA = Math.sin(angle) * 0.94 * r;
        pos[ptr++] = P.x + norm.x * cosA + binorm.x * sinA;
        pos[ptr++] = P.y + norm.y * cosA + binorm.y * sinA;
        pos[ptr++] = P.z + norm.z * cosA + binorm.z * sinA;
      }
    }

    // Tip vertex cap
    const tipP = curve.getPointAt(1.0).clone().add(curve.getTangentAt(1.0).multiplyScalar(0.08));
    pos[ptr++] = tipP.x;
    pos[ptr++] = tipP.y;
    pos[ptr++] = tipP.z;

    this.tailPosAttr.needsUpdate = true;
    this.tailGeo.computeVertexNormals();
  }

  /**
   * 3D Crisp Expressive Facial Features.
   * Matches mochi-design-floating.jpg 1:1.
   */
  /**
   * 3D Expressive Adorable Kitten Eyes & Authentic Mochi Cat Mouth.
   * Matches Option C in mochi_hand_options_1791308895920.jpg.
   */
  createFaceObjects() {
    this.faceGroup = new THREE.Group();
    this.faceGroup.position.set(0, 0, 0); // Aligned with mochiGroup center
    this.faceGroup.renderOrder = 999;
    this.mochiGroup.add(this.faceGroup);

    // Deep rich dark-espresso base for adorable kitten eyes and mouth
    const darkMat = new THREE.MeshBasicMaterial({
      color: 0x161214,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.darkMat = darkMat;

    // Brilliant sparkling white highlights
    const hiMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    // Deep liquid cat iris reflection
    const glintMat = new THREE.MeshBasicMaterial({
      color: 0x3E3036,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    // --- 1. Big Adorable Kitten Eyes (Deep iris + multi-tier sparkling glints) ---
    const irisGeo = new THREE.CircleGeometry(0.225, 48);
    irisGeo.scale(0.95, 1.08, 1); // Chubby tall kitten oval

    const glintGeo = new THREE.RingGeometry(0.11, 0.20, 32, 1, Math.PI * 1.15, Math.PI * 0.70);
    const hiBigGeo = new THREE.CircleGeometry(0.082, 32);
    const hiSmallGeo = new THREE.CircleGeometry(0.040, 24);
    const hiMicroGeo = new THREE.CircleGeometry(0.022, 16);

    const makeCatEye = (x) => {
      const g = new THREE.Group();
      g.position.set(x, 0.08, 1.285);
      g.rotation.set(-0.06, x > 0 ? 0.14 : -0.14, 0);

      // Deep iris
      const iris = new THREE.Mesh(irisGeo, darkMat);
      iris.renderOrder = 998;
      g.add(iris);

      // Bottom crescent glint (depth of feline cornea)
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(0, 0, 0.001);
      glint.renderOrder = 999;
      g.add(glint);

      // Primary brilliant highlight (upper-left)
      const hiBig = new THREE.Mesh(hiBigGeo, hiMat);
      hiBig.position.set(-0.068, 0.076, 0.002);
      hiBig.renderOrder = 1000;
      g.add(hiBig);

      // Secondary soft sparkle (lower-right)
      const hiSmall = new THREE.Mesh(hiSmallGeo, hiMat);
      hiSmall.position.set(0.068, -0.070, 0.002);
      hiSmall.renderOrder = 1000;
      g.add(hiSmall);

      // Tertiary micro catchlight
      const hiMicro = new THREE.Mesh(hiMicroGeo, hiMat);
      hiMicro.position.set(0.015, 0.088, 0.002);
      hiMicro.renderOrder = 1000;
      g.add(hiMicro);

      this.faceGroup.add(g);
      return g;
    };

    this.eyeLeftDot = makeCatEye(-0.38);
    this.eyeRightDot = makeCatEye(0.38);

    // --- 2. Happy Joyous Smiling Eye Arches (⌒ ⌒) ---
    const smileEyeGeo = new THREE.TorusGeometry(0.145, 0.030, 16, 32, Math.PI * 0.82);
    this.eyeHappyL = new THREE.Mesh(smileEyeGeo, darkMat);
    this.eyeHappyL.position.set(-0.38, 0.08, 1.285);
    this.eyeHappyL.rotation.set(-0.06, -0.14, Math.PI * 0.09);
    this.eyeHappyL.renderOrder = 1000;
    this.faceGroup.add(this.eyeHappyL);

    this.eyeHappyR = new THREE.Mesh(smileEyeGeo, darkMat);
    this.eyeHappyR.position.set(0.38, 0.08, 1.285);
    this.eyeHappyR.rotation.set(-0.06, 0.14, Math.PI * 0.09);
    this.eyeHappyR.renderOrder = 1000;
    this.faceGroup.add(this.eyeHappyR);

    // --- 3. Playful Wink Eye (Right Eye ⌒ with cute cat eyelash flick) ---
    this.eyeWink = new THREE.Group();
    this.eyeWink.position.set(0.38, 0.08, 1.285);
    this.eyeWink.rotation.set(-0.06, 0.14, 0);

    const winkArc = new THREE.Mesh(smileEyeGeo, darkMat);
    winkArc.rotation.z = Math.PI * 0.09;
    winkArc.renderOrder = 1000;
    this.eyeWink.add(winkArc);

    const lashGeo = new THREE.CapsuleGeometry(0.014, 0.065, 6, 12);
    const lash = new THREE.Mesh(lashGeo, darkMat);
    lash.position.set(0.12, 0.02, 0);
    lash.rotation.z = -0.55;
    lash.renderOrder = 1000;
    this.eyeWink.add(lash);
    this.faceGroup.add(this.eyeWink);

    // --- 4. Empathetic Worry Eyebrows (/ \) for incorrect / thinking ---
    const browGeo = new THREE.CapsuleGeometry(0.022, 0.13, 6, 12);
    this.eyeSleepyL = new THREE.Mesh(browGeo, darkMat);
    this.eyeSleepyL.position.set(-0.38, 0.38, 1.235);
    this.eyeSleepyL.rotation.set(-0.12, -0.14, -(Math.PI / 2 - 0.44));
    this.eyeSleepyL.renderOrder = 1000;
    this.faceGroup.add(this.eyeSleepyL);

    this.eyeSleepyR = new THREE.Mesh(browGeo, darkMat);
    this.eyeSleepyR.position.set(0.38, 0.38, 1.235);
    this.eyeSleepyR.rotation.set(-0.12, 0.14, Math.PI / 2 - 0.44);
    this.eyeSleepyR.renderOrder = 1000;
    this.faceGroup.add(this.eyeSleepyR);

    // --- 5. Heart Eyes (Frame 11 / Love) ---
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.05);
    heartShape.bezierCurveTo(-0.10, -0.06, -0.14, -0.16, -0.04, -0.16);
    heartShape.bezierCurveTo(0, -0.15, 0, -0.10, 0, -0.10);
    heartShape.bezierCurveTo(0, -0.10, 0, -0.15, 0.04, -0.16);
    heartShape.bezierCurveTo(0.14, -0.16, 0.10, -0.06, 0, 0.05);

    const heartGeo = new THREE.ShapeGeometry(heartShape);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xFF3568, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false });

    this.eyeHeartL = new THREE.Mesh(heartGeo, heartMat);
    this.eyeHeartL.position.set(-0.34, 0.10, 1.285);
    this.eyeHeartL.rotation.z = Math.PI;
    this.eyeHeartL.scale.set(1.4, 1.4, 1.4);
    this.eyeHeartL.renderOrder = 1000;
    this.faceGroup.add(this.eyeHeartL);

    this.eyeHeartR = new THREE.Mesh(heartGeo, heartMat);
    this.eyeHeartR.position.set(0.34, 0.10, 1.285);
    this.eyeHeartR.rotation.z = Math.PI;
    this.eyeHeartR.scale.set(1.4, 1.4, 1.4);
    this.eyeHeartR.renderOrder = 1000;
    this.faceGroup.add(this.eyeHeartR);

    // --- 6. AUTHENTIC MOCHI CAT MOUTH (ω / :3) ---
    // Double-lobed pillowy kawaii kitten smile meeting at center
    this.mouthW = new THREE.Group();
    this.mouthW.position.set(0, -0.10, 1.265);

    const lipGeo = new THREE.TorusGeometry(0.048, 0.018, 14, 28, Math.PI * 0.84);
    const lipL = new THREE.Mesh(lipGeo, darkMat);
    lipL.position.set(-0.045, 0, 0);
    lipL.rotation.set(0.04, -0.06, -Math.PI * 0.92);
    lipL.renderOrder = 1000;
    this.mouthW.add(lipL);

    const lipR = new THREE.Mesh(lipGeo, darkMat);
    lipR.position.set(0.045, 0, 0);
    lipR.rotation.set(0.04, 0.06, -Math.PI * 0.92);
    lipR.renderOrder = 1000;
    this.mouthW.add(lipR);
    this.faceGroup.add(this.mouthW);

    // --- 7. Joyous Open Smiling Mouth with Soft Pink Tongue (ᗨ) ---
    this.mouthHappy = new THREE.Group();
    this.mouthHappy.position.set(0, -0.10, 1.265);

    const happyGeo = new THREE.TorusGeometry(0.076, 0.020, 16, 32, Math.PI * 0.86);
    const happyMesh = new THREE.Mesh(happyGeo, darkMat);
    happyMesh.rotation.set(0.04, 0, -Math.PI * 0.93);
    happyMesh.renderOrder = 1000;
    this.mouthHappy.add(happyMesh);

    const tongueGeo = new THREE.CircleGeometry(0.045, 24, 0, Math.PI);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xFF8AA6, transparent: true, depthTest: false, depthWrite: false });
    const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
    tongueMesh.position.set(0, -0.038, 0.001);
    tongueMesh.scale.set(1.25, 0.82, 1);
    tongueMesh.renderOrder = 999;
    this.mouthHappy.add(tongueMesh);
    this.faceGroup.add(this.mouthHappy);

    // --- 8. Small Soft 'o' Mouth for Empathetic / Thinking ---
    const mouthOGeo = new THREE.TorusGeometry(0.038, 0.017, 14, 32);
    this.mouthO = new THREE.Mesh(mouthOGeo, darkMat);
    this.mouthO.position.set(0, -0.10, 1.265);
    this.mouthO.scale.set(0.9, 1.15, 1);
    this.mouthO.renderOrder = 1000;
    this.faceGroup.add(this.mouthO);

    // Legacy fallback smile arc
    // Legacy fallback smile arc
    const mouthGeo = new THREE.TorusGeometry(0.068, 0.020, 16, 32, Math.PI * 0.76);
    this.mouthMesh = new THREE.Mesh(mouthGeo, darkMat);
    this.mouthMesh.position.set(0, -0.08, 1.265);
    this.mouthMesh.rotation.set(0.04, 0, -Math.PI * 0.88);
    this.mouthMesh.renderOrder = 1000;
    this.faceGroup.add(this.mouthMesh);

    // =========================================================================
    // 9. ADORABLE TODDLER POUT (Pursed Jutting Lips & Melancholic Puppy Eyes)
    // Matches the uploaded toddler reference photo 1:1!
    // =========================================================================
    const poutLipMat = new THREE.MeshPhysicalMaterial({
      color: 0xFA4B73, // Luscious toddler strawberry-rose pout
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xFFA5BC),
      transparent: false
    });

    this.mouthPout = new THREE.Group();
    this.mouthPout.position.set(0, -0.11, 1.285);
    this.mouthPout.renderOrder = 1000;

    // 9a. Upper Pursed Pout Lip (Pillowy cushion angled downward & forward)
    const upperLipGeo = new THREE.SphereGeometry(0.072, 32, 24);
    upperLipGeo.scale(1.30, 0.74, 1.30);
    const upperLip = new THREE.Mesh(upperLipGeo, poutLipMat);
    upperLip.position.set(0, 0.016, 0.095);
    upperLip.rotation.set(-0.16, 0, 0);
    upperLip.renderOrder = 1000;
    this.mouthPout.add(upperLip);

    // 9b. Central Cupid's Bow Tubercle (Fleshy central pout drop resting on lower lip)
    const tubercleGeo = new THREE.SphereGeometry(0.046, 24, 18);
    tubercleGeo.scale(1.10, 0.90, 1.25);
    const tubercle = new THREE.Mesh(tubercleGeo, poutLipMat);
    tubercle.position.set(0, 0.008, 0.125);
    tubercle.rotation.set(-0.14, 0, 0);
    tubercle.renderOrder = 1001;
    this.mouthPout.add(tubercle);

    // 9c. Lower Plump Pout Cushion (Jutting forward in authentic "manyun" sulk!)
    const lowerLipGeo = new THREE.SphereGeometry(0.080, 32, 24);
    lowerLipGeo.scale(1.34, 0.80, 1.35);
    const lowerLip = new THREE.Mesh(lowerLipGeo, poutLipMat);
    lowerLip.position.set(0, -0.018, 0.105);
    lowerLip.rotation.set(0.14, 0, 0);
    lowerLip.renderOrder = 1000;
    this.mouthPout.add(lowerLip);

    // 9d. Delicate Natural Sulk Seam (Deep Wine / Rose - ZERO black mustache!)
    const sulkSeamGeo = new THREE.TorusGeometry(0.046, 0.006, 12, 28, Math.PI * 0.70);
    const sulkSeamMat = new THREE.MeshBasicMaterial({
      color: 0x6E152D, // Deep raspberry-wine shadow (NOT BLACK)
      transparent: true,
      opacity: 0.85
    });
    const poutCrease = new THREE.Mesh(sulkSeamGeo, sulkSeamMat);
    poutCrease.position.set(0, -0.003, 0.120);
    poutCrease.rotation.set(0.06, 0, Math.PI * 0.13); // Curves softly downward at mouth corners
    poutCrease.renderOrder = 1002;
    this.mouthPout.add(poutCrease);

    this.faceGroup.add(this.mouthPout);

    // Large Drooping Melancholic Puppy-Dog Eyes
    const makePuppyEye = (x, isLeft) => {
      const g = new THREE.Group();
      g.position.set(x, 0.065, 1.285);
      // Melancholic slant: outer corners droop downward
      g.rotation.set(-0.06, isLeft ? -0.14 : 0.14, isLeft ? -0.12 : 0.12);

      const iris = new THREE.Mesh(irisGeo, darkMat);
      iris.renderOrder = 998;
      g.add(iris);

      // Liquid reflective depth
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(0, 0, 0.001);
      glint.renderOrder = 999;
      g.add(glint);

      // Big glassy tears highlight (upper-inner)
      const hiBig = new THREE.Mesh(new THREE.CircleGeometry(0.088, 32), hiMat);
      hiBig.position.set(isLeft ? 0.055 : -0.055, 0.078, 0.002);
      hiBig.renderOrder = 1000;
      g.add(hiBig);

      // Watery rim shine (lower rim reflecting pools of tears)
      const hiWater = new THREE.Mesh(new THREE.CircleGeometry(0.046, 24), hiMat);
      hiWater.position.set(isLeft ? -0.058 : 0.058, -0.072, 0.002);
      hiWater.renderOrder = 1000;
      g.add(hiWater);

      // Secondary tear glint
      const hiTiny = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), hiMat);
      hiTiny.position.set(0, 0.092, 0.002);
      hiTiny.renderOrder = 1000;
      g.add(hiTiny);

      this.faceGroup.add(g);
      return g;
    };

    this.eyePoutL = makePuppyEye(-0.38, true);
    this.eyePoutR = makePuppyEye(0.38, false);

    // Subtle Furrowed Brow of Toddler Drama (/ \)
    const poutBrowGeo = new THREE.CapsuleGeometry(0.024, 0.14, 6, 12);
    this.browPoutL = new THREE.Mesh(poutBrowGeo, darkMat);
    this.browPoutL.position.set(-0.35, 0.38, 1.245);
    this.browPoutL.rotation.set(-0.12, -0.14, -(Math.PI / 2 - 0.48));
    this.browPoutL.renderOrder = 1000;
    this.faceGroup.add(this.browPoutL);

    this.browPoutR = new THREE.Mesh(poutBrowGeo, darkMat);
    this.browPoutR.position.set(0.35, 0.38, 1.245);
    this.browPoutR.rotation.set(-0.12, 0.14, Math.PI / 2 - 0.48);
    this.browPoutR.renderOrder = 1000;
    this.faceGroup.add(this.browPoutR);

    // Center forehead drama crease
    const furrowGeo = new THREE.CapsuleGeometry(0.016, 0.055, 4, 8);
    this.foreheadFurrow = new THREE.Mesh(furrowGeo, darkMat);
    this.foreheadFurrow.position.set(0, 0.41, 1.22);
    this.foreheadFurrow.rotation.set(-0.15, 0, 0);
    this.foreheadFurrow.renderOrder = 1000;
    this.faceGroup.add(this.foreheadFurrow);

    this.updateFaceVisibility();
  }

  updateFaceVisibility() {
    this.eyeLeftDot.visible = false;
    this.eyeRightDot.visible = false;
    this.eyeWink.visible = false;
    this.eyeHappyL.visible = false;
    this.eyeHappyR.visible = false;
    this.eyeSleepyL.visible = false;
    this.eyeSleepyR.visible = false;
    this.eyeHeartL.visible = false;
    this.eyeHeartR.visible = false;
    this.eyePoutL.visible = false;
    this.eyePoutR.visible = false;
    this.browPoutL.visible = false;
    this.browPoutR.visible = false;
    this.foreheadFurrow.visible = false;

    if (this.mouthW) this.mouthW.visible = false;
    if (this.mouthHappy) this.mouthHappy.visible = false;
    if (this.mouthO) this.mouthO.visible = false;
    if (this.mouthMesh) this.mouthMesh.visible = false;
    if (this.mouthPout) this.mouthPout.visible = false;

    if (this.mood === 'dots') {
      // Classic Kawaii Mochi Kitten: Big sparkling cat eyes + sweet ω kitten mouth
      this.eyeLeftDot.visible = true;
      this.eyeRightDot.visible = true;
      if (this.mouthW) this.mouthW.visible = true;
    } else if (this.mood === 'wink') {
      // Playful wink with cute cheeky smirk
      this.eyeLeftDot.visible = true;
      this.eyeWink.visible = true;
      if (this.mouthW) this.mouthW.visible = true;
    } else if (this.mood === 'happy') {
      // Joyous celebration: Arched happy eyes (⌒ ⌒) + open laughing mouth with tongue (ᗨ)
      this.eyeHappyL.visible = true;
      this.eyeHappyR.visible = true;
      if (this.mouthHappy) this.mouthHappy.visible = true;
    } else if (this.mood === 'pout' || this.mood === 'sleepy') {
      // ADORABLE TODDLER POUT / SULK:
      // Rosy blushed cheek contours, tightly pursed jutting pout lips, drooping puppy-dog eyes, furrowed drama brow!
      this.eyePoutL.visible = true;
      this.eyePoutR.visible = true;
      this.browPoutL.visible = true;
      this.browPoutR.visible = true;
      this.foreheadFurrow.visible = true;
      if (this.mouthPout) this.mouthPout.visible = true;
    } else if (this.mood === 'hearts') {
      // Loving adoration: Bouncy hearts + sweet kitten mouth
      this.eyeHeartL.visible = true;
      this.eyeHeartR.visible = true;
      if (this.mouthW) this.mouthW.visible = true;
    }
  }

  createShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const sCtx = canvas.getContext('2d');

    const grad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 115);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.32)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(128, 128, 115, 0, Math.PI * 2);
    sCtx.fill();

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.set(0, -1.60, 0);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadowMesh);
  }

  createOrbit() {
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.rotation.x = 0.28;
    this.orbitGroup.rotation.z = -0.16;
    this.orbitGroup.visible = (this.fx === 'orbit');
    this.scene.add(this.orbitGroup);

    // Stardust Points
    const pCount = 420;
    const pGeo = new THREE.BufferGeometry();
    const pPos = [];
    const pColors = [];

    const radX = 2.40;
    const radZ = 1.30;

    for (let i = 0; i < pCount; i++) {
      const theta = (i / pCount) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 0.16;
      const x = Math.cos(theta) * radX + spread;
      const z = Math.sin(theta) * radZ + spread;
      const y = (Math.random() - 0.5) * 0.10;

      pPos.push(x, y, z);
      const alpha = 0.35 + Math.random() * 0.65;
      pColors.push(alpha, alpha, alpha);
    }

    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.038,
      vertexColors: true,
      transparent: true,
      opacity: 0.90
    });

    this.orbitPoints = new THREE.Points(pGeo, pMat);
    this.orbitGroup.add(this.orbitPoints);

    // Glowing Satellite Moon / Mini-Mochi (Frame 02)
    const moonGeo = new THREE.SphereGeometry(0.18, 32, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.2,
      emissive: 0xEEF2FF,
      emissiveIntensity: 0.50
    });
    this.satelliteMoon = new THREE.Mesh(moonGeo, moonMat);
    this.orbitGroup.add(this.satelliteMoon);
  }

  createBadge() {
    this.badgeGroup = new THREE.Group();
    this.badgeGroup.position.set(-1.18, 0.95, 0.45);
    this.badgeGroup.visible = !!this.badge;
    this.mochiGroup.add(this.badgeGroup);

    this.badgeCanvas = document.createElement('canvas');
    this.badgeCanvas.width = 512;
    this.badgeCanvas.height = 320;
    this.badgeCtx = this.badgeCanvas.getContext('2d');
    this.badgeTex = new THREE.CanvasTexture(this.badgeCanvas);

    const badgePlaneMat = new THREE.MeshBasicMaterial({
      map: this.badgeTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const badgePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.30, 0.81), badgePlaneMat);
    badgePlane.renderOrder = 98;
    this.badgeGroup.add(badgePlane);

    this.drawBadge();
  }

  drawBadge() {
    if (!this.badge) {
      this.badgeGroup.visible = false;
      return;
    }
    this.badgeGroup.visible = true;

    const ctx = this.badgeCtx;
    const w = 512;
    const h = 320;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    if (this.badge === 'chat_purple' || this.badge === 'chat_blue') {
      const isPurple = (this.badge === 'chat_purple');
      const pw = 300;
      const ph = 160;
      const pr = 80;
      const px = cx - pw / 2;
      const py = cy - ph / 2;

      // 1. Radiant Luminous Neon Backlight / Halo Glow
      const glowColor = isPurple ? 'rgba(168, 85, 247, 0.95)' : 'rgba(56, 189, 248, 0.95)';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 42;
      ctx.fillStyle = isPurple ? '#9333EA' : '#2563EB';
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, pr);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // 2. High-End Glossy Gradient Body (Bright & Saturated Amethyst / Azure)
      const baseGrad = ctx.createLinearGradient(0, py, 0, py + ph);
      if (isPurple) {
        baseGrad.addColorStop(0.00, '#C084FC'); // Radiant lavender-violet top light
        baseGrad.addColorStop(0.24, '#A855F7'); // Electric neon purple
        baseGrad.addColorStop(0.68, '#7E22CE'); // Rich royal amethyst
        baseGrad.addColorStop(1.00, '#581C87'); // Deep velvety violet base
      } else {
        baseGrad.addColorStop(0.00, '#7DD3FC');
        baseGrad.addColorStop(0.24, '#38BDF8');
        baseGrad.addColorStop(0.68, '#2563EB');
        baseGrad.addColorStop(1.00, '#1E40AF');
      }
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, pr);
      ctx.fill();

      // 3. Curved Glass Specular Highlight (Upper half only, leaving dots in high-contrast zone)
      const shineGrad = ctx.createLinearGradient(0, py + 6, 0, py + ph * 0.40);
      shineGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.88)'); // Pure crystalline white light
      shineGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.35)');
      shineGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.roundRect(px + 8, py + 6, pw - 16, (ph - 12) * 0.38, [pr - 6, pr - 6, 18, 18]);
      ctx.fill();

      // 4. Polished 3D Glass Bevel Rim (Crisp bright light catching the rounded outer perimeter)
      const rimGrad = ctx.createLinearGradient(0, py, 0, py + ph);
      rimGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.95)'); // Bright top rim specular
      rimGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.38)');
      rimGrad.addColorStop(0.75, isPurple ? 'rgba(192, 132, 252, 0.25)' : 'rgba(125, 211, 252, 0.25)');
      rimGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.60)'); // Subtle bottom refraction rim
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // 5. Delicate Bottom Internal Refraction Caustic
      ctx.strokeStyle = isPurple ? 'rgba(243, 232, 255, 0.45)' : 'rgba(224, 242, 254, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, py + ph - 16, pw * 0.32, 0.24 * Math.PI, 0.76 * Math.PI);
      ctx.stroke();

      // 6. BOLD, ALWAYS-VISIBLE TYPING WAVE DOTS (100% Solid Contrast in Motion)
      const t = this.time * 5.8;
      for (let i = -1; i <= 1; i++) {
        const phase = t - i * 0.95;
        const hop = Math.sin(phase);
        const hopY = Math.max(0, hop) * 16; // Hops upward in dynamic wave
        const dotR = 17 + hop * 1.5;
        const dx = cx + i * 54;
        const dy = cy + 12 - hopY;

        // Punchy drop shadow under each dot for guaranteed >12:1 contrast against violet
        ctx.shadowColor = 'rgba(20, 5, 45, 0.90)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }

    } else if (this.badge === 'alert') {
      // Golden Amber glossy crystal circle with '!'
      const r = 88;
      ctx.shadowColor = 'rgba(255, 170, 20, 0.95)';
      ctx.shadowBlur = 42;
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      const amberGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      amberGrad.addColorStop(0.00, '#FDE047');
      amberGrad.addColorStop(0.35, '#F59E0B');
      amberGrad.addColorStop(0.80, '#D97706');
      amberGrad.addColorStop(1.00, '#B45309');
      ctx.fillStyle = amberGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Top glass shine
      const shineGrad = ctx.createLinearGradient(0, cy - r + 4, 0, cy);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.45, r * 0.72, r * 0.40, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // '!' icon
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 10, cy - 45, 20, 50);
      ctx.beginPath();
      ctx.arc(cx, cy + 32, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';

    } else if (this.badge === 'online') {
      // Radiant emerald glass sphere
      const r = 68;
      ctx.shadowColor = 'rgba(16, 230, 145, 0.95)';
      ctx.shadowBlur = 38;
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      const emeraldGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      emeraldGrad.addColorStop(0.0, '#6EE7B7');
      emeraldGrad.addColorStop(0.35, '#10B981');
      emeraldGrad.addColorStop(1.0, '#047857');
      ctx.fillStyle = emeraldGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Top shine
      const shineGrad = ctx.createLinearGradient(0, cy - r + 4, 0, cy);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.45, r * 0.70, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.80)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    this.badgeTex.needsUpdate = true;
  }

  createParticles() {
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    this.particles = [];
  }

  spawnParticle() {
    if (this.fx === 'stars' && this.particles.length < 12) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#F0F4FF';
      ctx.beginPath();
      ctx.moveTo(32, 2);
      ctx.quadraticCurveTo(32, 32, 62, 32);
      ctx.quadraticCurveTo(32, 32, 32, 62);
      ctx.quadraticCurveTo(32, 32, 2, 32);
      ctx.quadraticCurveTo(32, 32, 32, 2);
      ctx.fill();

      const mat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.95
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set((Math.random() - 0.5) * 0.8, 0.8, 0.3);
      sprite.scale.set(0.28, 0.28, 0.28);
      this.particleGroup.add(sprite);

      this.particles.push({
        sprite,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.6 + Math.random() * 0.5,
        life: 1.0,
        decay: 0.7 + Math.random() * 0.4
      });

    } else if (this.fx === 'hearts' && this.particles.length < 8) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FF3866';
      ctx.beginPath();
      ctx.moveTo(32, 45);
      ctx.bezierCurveTo(15, 26, 10, 10, 24, 10);
      ctx.bezierCurveTo(32, 10, 32, 18, 32, 18);
      ctx.bezierCurveTo(32, 18, 32, 10, 40, 10);
      ctx.bezierCurveTo(54, 10, 49, 26, 32, 45);
      ctx.fill();

      const mat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.95
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set((Math.random() - 0.5) * 0.7, 0.8, 0.3);
      sprite.scale.set(0.24, 0.24, 0.24);
      this.particleGroup.add(sprite);

      this.particles.push({
        sprite,
        vx: (Math.random() - 0.5) * 0.35,
        vy: 0.5 + Math.random() * 0.45,
        life: 1.0,
        decay: 0.6 + Math.random() * 0.4
      });
    }
  }

  updateParticles(dt) {
    if (this.fx === 'stars' || this.fx === 'hearts') {
      if (Math.random() < 0.25) this.spawnParticle();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.material.opacity = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particleGroup.remove(p.sprite);
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Public Modular Controls (Bongkar-Pasang) ---
  setMood(m) {
    this.mood = m;
    this.updateFaceVisibility();
    this.updateSkinBlush();
    this.triggerJiggle(0.18);

    // Dynamic hand emergence matching mood!
    if (m === 'happy') {
      this.triggerHandGesture('cheer', 4.0);
    } else if (m === 'pout' || m === 'sleepy') {
      this.triggerHandGesture('pout', 4.5);
      // Puffed-out chubby cheeks air inflation!
      this.squish.x = 1.18;
      this.squish.z = 1.14;
      this.squish.y = 0.94;
      this.triggerJiggle(0.24);
    } else if (m === 'wink' || m === 'hearts') {
      this.triggerHandGesture('wave', 2.2);
    } else {
      this.retractHands();
    }
  }

  /**
   * Trigger an expressive hand gesture with automatic timed retraction.
   * @param {'cheer'|'sad'|'wave'} type
   * @param {number} durationSeconds
   */
  triggerHandGesture(type, durationSeconds = 3.5) {
    if (this.handState !== type) this.handGestureTime = 0; // restart choreography
    this.handState = type;
    this.handTimer = durationSeconds;
  }

  /**
   * Smoothly retract hands back inside the cushion body.
   */
  retractHands() {
    this.handState = 'hidden';
  }

  setBadge(b) {
    this.badge = b;
    this.drawBadge();
    this.badgeLag.velY = 0.75;
  }

  setFx(f) {
    this.fx = f;
    this.orbitGroup.visible = (f === 'orbit');
    for (const p of this.particles) {
      this.particleGroup.remove(p.sprite);
    }
    this.particles = [];
  }

  setAura(a) {
    this.aura = a;
    const auraColors = {
      purple: 0x9D65FF,
      blue:   0x3296FF,
      amber:  0xFFAA24,
      green:  0x1EE58F,
      pink:   0xFF5096
    };

    if (a && auraColors[a]) {
      this.auraLight.color.setHex(auraColors[a]);
      this.auraLight.intensity = 3.6;
    } else {
      this.auraLight.intensity = 0;
    }
  }

  setHands(show) {
    this.showHands = show;
    this.handL.visible = show;
    this.handR.visible = show;
  }

  setEars(show) {
    this.showEars = show;
    if (this.earsGroup) this.earsGroup.visible = show;
  }

  setTail(show) {
    this.showTail = show;
    if (this.tailGroup) this.tailGroup.visible = show;
  }

  triggerJiggle(intensity = 0.22) {
    this.squish.jiggleAmp = intensity;
    this.squish.jiggleTimer = 0;
  }

  /**
   * Joyous cartoon animal hop with anticipation squash, airborne stretch, and landing rebound.
   */
  triggerHop(height = 0.38) {
    this.squish.y = 0.70;
    this.squish.x = 1.22;
    this.squish.z = 1.22;
    this.hopHeight = height;
    setTimeout(() => {
      this.hopTimer = 0.65;
      this.squish.y = 1.26;
      this.squish.x = 0.88;
      this.squish.z = 0.88;
      this.triggerJiggle(0.28);
    }, 110);
  }

  /**
   * Playful animal ear wiggle / flutter on question transitions or interactions.
   * Damped harmonic bounce with tip whip mimicking alert cat/bunny ears.
   */
  triggerEarWiggle(intensity = 1.0) {
    this.earWiggleTimer = 0.65;
    this.earWiggleDuration = 0.65;
    this.earWiggleIntensity = intensity;
    if (this.earPhys) {
      this.earPhys.L.vz += 8.5 * intensity;
      this.earPhys.L.vx -= 4.2 * intensity;
      this.earPhys.L.tipVel += 14.0 * intensity;
      this.earPhys.R.vz -= 8.5 * intensity;
      this.earPhys.R.vx -= 4.2 * intensity;
      this.earPhys.R.tipVel += 14.0 * intensity;
    }
  }

  preset(name) {
    switch (name) {
      case 'welcome':
        this.setMood('wink');
        this.setBadge(null);
        this.setFx(null);
        this.setAura(null);
        this.setHands(false);
        break;
      case 'thinking_purple':
        this.setMood('dots');
        this.setBadge('chat_purple');
        this.setFx(null);
        this.setAura('purple');
        this.setHands(false);
        break;
      case 'thinking_blue':
        this.setMood('dots');
        this.setBadge('chat_blue');
        this.setFx(null);
        this.setAura('blue');
        this.setHands(false);
        break;
      case 'universe':
        this.setMood('happy');
        this.setBadge(null);
        this.setFx('orbit');
        this.setAura('blue');
        this.setHands(false);
        break;
      case 'alert':
        this.setMood('dots');
        this.setBadge('alert');
        this.setFx(null);
        this.setAura('amber');
        this.setHands(false);
        break;
      case 'celebrate':
        this.setMood('happy');
        this.setBadge('online');
        this.setFx('stars');
        this.setAura('green');
        this.setHands(false);
        break;
      case 'love':
        this.setMood('hearts');
        this.setBadge('online');
        this.setFx('hearts');
        this.setAura('pink');
        this.setHands(false);
        break;
    }
  }

  bindEvents() {
    const dom = this.renderer.domElement;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.rotStartX = 0;
    this.rotStartY = 0;

    const onPointerDown = (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.rotStartX = this.targetRot.x;
      this.rotStartY = this.targetRot.y;
      dom.style.cursor = 'grabbing';
      try { dom.setPointerCapture(e.pointerId); } catch (_) {}
      // Tactile squish on press
      this.squish.y = 0.70;
      this.squish.x = 1.20;
      this.squish.z = 1.20;
      this.squish.velY = 0;
      clearTimeout(this._restoreRotTimeout);
      e.stopPropagation();
    };

    const onPointerMove = (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        // Smooth 3D yaw (rotation around Y) and pitch (tilt around X)
        this.targetRot.y = this.rotStartY + dx * 0.024;
        this.targetRot.x = Math.max(-0.65, Math.min(0.65, this.rotStartX - dy * 0.018));
        e.stopPropagation();
        return;
      }

      // Gentle cursor-following hover tilt
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      this.targetRot.y = x * 0.38;
      this.targetRot.x = -y * 0.24;
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      dom.style.cursor = 'grab';
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
      // Explosive jelly release recoil
      this.squish.y = 1.28;
      this.squish.x = 0.86;
      this.squish.z = 0.86;
      this.triggerJiggle(0.25);
      setTimeout(() => {
        this.squish.targetX = 1;
        this.squish.targetY = 1;
        this.squish.targetZ = 1;
      }, 80);

      // Smoothly return to neutral forward-facing orientation after 1200ms
      clearTimeout(this._restoreRotTimeout);
      this._restoreRotTimeout = setTimeout(() => {
        if (!this.isDragging) {
          this.targetRot.x = 0;
          this.targetRot.y = 0;
        }
      }, 1200);
      e.stopPropagation();
    };

    const onPointerLeave = () => {
      if (!this.isDragging) {
        this.targetRot.x = 0;
        this.targetRot.y = 0;
        this.squish.targetX = 1;
        this.squish.targetY = 1;
        this.squish.targetZ = 1;
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    // Explicit touch event isolation to prevent browser page scrolling
    const stopTouch = (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    dom.addEventListener('touchstart', stopTouch, { passive: false });
    dom.addEventListener('touchmove', stopTouch, { passive: false });
    dom.addEventListener('touchend', (e) => { e.stopPropagation(); }, { passive: false });
  }

  update(dt) {
    this.time += dt;

    // 1. Organic Multi-Frequency Floating & Velocity Calculation
    this.floatPos.prevY = this.floatPos.y;
    const baseFloat = Math.sin(this.time * 2.2) * 0.12 + Math.sin(this.time * 4.4) * 0.02 + Math.sin(this.time * 0.8) * 0.01;
    let hopOffset = 0;
    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
      const progress = 1 - Math.max(0, this.hopTimer / 0.65);
      hopOffset = Math.sin(progress * Math.PI) * Math.min(this.hopHeight || 0.30, 0.28);
    }
    this.floatPos.y = baseFloat + hopOffset;
    this.floatPos.velY = (this.floatPos.y - this.floatPos.prevY) / Math.max(dt, 0.001);
    this.mochiGroup.position.y = this.floatPos.y;

    // Shadow reacts to float height and width squish
    const shadowScale = 1.0 - this.floatPos.y * 0.8;
    this.shadowMesh.scale.set(shadowScale * this.squish.x, shadowScale, 1);
    this.shadowMesh.material.opacity = Math.max(0.35, 0.85 - this.floatPos.y * 1.5);

    // 2. Buttery 3D Rotational Damping
    this.currentRot.x += (this.targetRot.x - this.currentRot.x) * 0.12;
    this.currentRot.y += (this.targetRot.y - this.currentRot.y) * 0.12;

    const ambientSway = Math.sin(this.time * 1.8) * 0.035;
    this.mochiGroup.rotation.x = this.currentRot.x;
    this.mochiGroup.rotation.y = this.currentRot.y + ambientSway;
    this.mochiGroup.rotation.z = -this.currentRot.y * 0.15;

    // 3. Disney 90° Phase Inertia + Damped Harmonic Jiggle
    const inertialPhase = Math.sin(this.time * 2.2 + Math.PI * 0.5) * 0.045;

    // Viscoelastic Jiggle Decay
    let jiggleOffset = 0;
    if (this.squish.jiggleAmp > 0.002) {
      this.squish.jiggleAmp = Math.min(this.squish.jiggleAmp, 1.0);
      this.squish.jiggleTimer += Math.max(0, dt) * 26;
      jiggleOffset = Math.sin(this.squish.jiggleTimer) * Math.min(this.squish.jiggleAmp, 0.35);
      this.squish.jiggleAmp *= Math.pow(0.86, Math.max(0, dt) * 60); // Damped decay
    }

    const isPout = (this.mood === 'pout' || this.mood === 'sleepy');
    const baseTargetX = isPout ? 1.08 : 1.0;
    const baseTargetY = isPout ? 0.95 : 1.0;
    const baseTargetZ = isPout ? 1.06 : 1.0;

    this.squish.targetY = baseTargetY + inertialPhase + jiggleOffset;
    this.squish.targetX = baseTargetX - (inertialPhase + jiggleOffset) * 0.75;
    this.squish.targetZ = baseTargetZ - (inertialPhase + jiggleOffset) * 0.75;

    const k = 0.28;
    const damp = 0.76;

    const fY = -k * (this.squish.y - this.squish.targetY);
    this.squish.velY = (this.squish.velY + fY) * damp;
    this.squish.y += this.squish.velY;

    const fX = -k * (this.squish.x - this.squish.targetX);
    this.squish.velX = (this.squish.velX + fX) * damp;
    this.squish.x += this.squish.velX;

    const fZ = -k * (this.squish.z - this.squish.targetZ);
    this.squish.velZ = (this.squish.velZ + fZ) * damp;
    this.squish.z += this.squish.velZ;

    this.mochiMesh.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // Face, Ears & Tail scale seamlessly with body squish & stretch
    this.faceGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.earsGroup) this.earsGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.tailGroup) this.tailGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // Fox Ears & Cat Tail kinematics and expressive reaction
    this.updateEarsAndTail(dt);

    // 4. Heart eyes gentle pulse (Frame 11)
    if (this.mood === 'hearts') {
      const heartPulse = 1.45 + Math.sin(this.time * 6.5) * 0.12;
      this.eyeHeartL.scale.set(heartPulse, heartPulse, heartPulse);
      this.eyeHeartR.scale.set(heartPulse, heartPulse, heartPulse);
    }

    // 4b. Toddler Pout subtle mouth/chin quiver
    if (this.mood === 'pout' || this.mood === 'sleepy') {
      if (this.mouthPout) {
        const quiver = Math.sin(this.time * 9.5) * 0.008;
        this.mouthPout.position.y = -0.11 + quiver;
      }
    }

    // 5. Floating jointed paws (spring-driven, asymmetric, anticipation/follow-through)
    this.updatePaws(dt);

    // 6. Badge Floating Lag (Independent Spring)
    const targetBadgeY = 0.95 + Math.sin(this.time * 2.5 + 1.2) * 0.06;
    const fB = -0.32 * (this.badgeGroup.position.y - targetBadgeY);
    this.badgeLag.velY = (this.badgeLag.velY + fB) * 0.75;
    this.badgeGroup.position.y += this.badgeLag.velY;

    if (this.badge === 'chat_purple' || this.badge === 'chat_blue') {
      this._badgeTimer = (this._badgeTimer || 0) + dt;
      if (this._badgeTimer >= 0.05) {
        this._badgeTimer = 0;
        this.drawBadge();
      }
    }

    // 7. Natural Eye Blinking Cycle
    this.blinkTimer += dt;
    if (this.blinkTimer >= this.nextBlink) {
      this.blinkFactor += dt * 14;
      if (this.blinkFactor >= 1.0) {
        this.blinkFactor = 0;
        this.blinkTimer = 0;
        this.nextBlink = 2.5 + Math.random() * 3.5;
      }
      const bScale = Math.max(0.1, 1.0 - Math.sin(this.blinkFactor * Math.PI));
      this.eyeLeftDot.scale.y = bScale;
      this.eyeRightDot.scale.y = bScale;
    } else if (this.eyeLeftDot.scale.y < 1.0) {
      this.eyeLeftDot.scale.y = 1.0;
      this.eyeRightDot.scale.y = 1.0;
    }

    // 8. Orbit Rotation
    if (this.fx === 'orbit') {
      this.orbitGroup.rotation.y = this.time * 1.4;
      const radX = 2.40;
      const radZ = 1.30;
      this.satelliteMoon.position.set(
        Math.cos(this.time * 1.4) * radX,
        0,
        Math.sin(this.time * 1.4) * radZ
      );
    }

    // 9. Particles Update
    this.updateParticles(dt);
  }


  /**
   * Floating cat paws — animation principles applied (research: Rayman-style detached limbs,
   * Animation Mentor "avoid twinning", squash & stretch, anticipation, overlap):
   *  - every paw is driven by damped springs (position, wrist rotation, finger curl, scale)
   *    so motion has natural overshoot and follow-through instead of stiff sine loops
   *  - the two paws NEVER mirror each other: different pose, height, curl and a time offset
   *  - fingers are jointed: open (wave) -> relaxed -> fist (cheer / ganbatte)
   *  - palms face the body in celebration (fist pump), never both palms to camera
   *    (that read as "surrender" / "high-five")
   */
  updatePaws(dt) {
    if (!this.handL || !this.handR) return;
    dt = Math.min(dt, 1 / 30);

    if (this.handTimer > 0) {
      this.handTimer -= dt;
      if (this.handTimer <= 0) this.handState = 'hidden';
    }
    this.handGestureTime = (this.handGestureTime || 0) + dt;

    if (!this.pawSim) {
      const mk = (side) => ({
        pos: new THREE.Vector3(side * 1.35, -0.1, 0.3), vel: new THREE.Vector3(),
        rot: new THREE.Vector3(), rotVel: new THREE.Vector3(),
        s: 0, sVel: 0
      });
      this.pawSim = { L: mk(-1), R: mk(1) };
    }

    const t = this.time;
    const st = this.handState;
    const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const bump = (x, at, w) => { const d = (x - at) / w; return Math.abs(d) < 1 ? Math.cos(d * Math.PI * 0.5) ** 2 : 0; };

    const pose = (side) => {
      const lead = side === 1;
      const g = this.handGestureTime - (lead ? 0 : 0.16);
      const bob = Math.sin(t * 2.5 + (lead ? 1.6 : 0)) * 0.05;
      const P = { x: side * 1.35, y: -0.1, z: 0.3, rx: 0, ry: 0, rz: 0, s: 0 };
      if (g < 0 && st !== 'hidden') { P.s = 0; return P; }

      if (st === 'cheer') {
        if (lead) {
          // RIGHT PAW (Reference C): Raised high with joy, pink pads proudly facing front, cheerful wave!
          const hop = (bump(g, 0.55, 0.16) + bump(g, 0.95, 0.16)) * 0.10;
          const wig = Math.sin(t * 11.0) * 0.14;
          P.x = 1.82; P.y = 0.76 + hop + bob * 0.5; P.z = 0.60;
          P.rx = -0.05; P.ry = -0.10; P.rz = -0.22 + wig;
          P.s = 1.0;
        } else {
          // LEFT PAW (Reference C): Resting gently down at the side, hanging naturally
          P.x = -1.82; P.y = -0.14 + bob; P.z = 0.55;
          P.rx = 0.10; P.ry = 0.40; P.rz = 0.32;
          P.s = 0.92;
        }
      } else if (st === 'pout' || st === 'sad') {
        if (lead) {
          // RIGHT PAW: Tucked close to puffed-out cheek in cute harmless toddler sulk
          const sulkTremble = Math.sin(t * 7.5) * 0.03;
          P.x = 1.62; P.y = -0.18 + sulkTremble + bob * 0.4; P.z = 0.65;
          P.rx = 0.08; P.ry = -0.32; P.rz = -0.18;
          P.s = 0.98;
        } else {
          // LEFT PAW: Tucked close to opposite puffed cheek
          P.x = -1.62; P.y = -0.22 + bob * 0.4; P.z = 0.62;
          P.rx = 0.08; P.ry = 0.32; P.rz = 0.18;
          P.s = 0.95;
        }
      } else if (st === 'wave') {
        if (lead) {
          // RIGHT PAW: Playful cute cat wave with pink pads visible
          const w = Math.sin(t * 9.0) * 0.28;
          P.x = 1.82; P.y = 0.42 + bob * 0.5; P.z = 0.58;
          P.rx = 0.0; P.ry = -0.08; P.rz = -0.16 + w;
          P.s = 1.0;
        } else {
          P.x = -1.80; P.y = -0.30 + bob; P.z = 0.52;
          P.rx = 0.05; P.ry = 0.35; P.rz = 0.25;
          P.s = 0.88;
        }
      }
      return P;
    };

    const spring = (x, v, target, k, zeta) => {
      const cdamp = 2 * zeta * Math.sqrt(k);
      v += (-(x - target) * k - v * cdamp) * dt;
      return [x + v * dt, v];
    };

    const drive = (hand, S, side) => {
      const P = pose(side);
      const axes = ['x', 'y', 'z'];
      for (const a of axes) {
        [S.pos[a], S.vel[a]] = spring(S.pos[a], S.vel[a], P[a], 140, 0.52);
        [S.rot[a], S.rotVel[a]] = spring(S.rot[a], S.rotVel[a], P['r' + a], 110, 0.60);
      }
      [S.s, S.sVel] = spring(S.s, S.sVel, P.s, 160, 0.56);

      const sc = Math.max(0.001, S.s * 1.45);
      hand.visible = S.s > 0.02;
      hand.position.copy(S.pos);
      hand.rotation.set(S.rot.x, S.rot.y, S.rot.z);
      hand.scale.set(sc, sc, sc);

      // Subtle squash & stretch from velocity (elastic marshmallow physics)
      const speed = S.vel.length();
      const stretch = 1 + Math.min(0.22, speed * 0.035);
      const inv = 1 / Math.sqrt(stretch);
      hand.userData.core.scale.set(inv, stretch, inv);
    };

    drive(this.handL, this.pawSim.L, -1);
    drive(this.handR, this.pawSim.R, 1);
  }
  /**
   * Expressive Kinematics for Fox Ears & Fluffy Cat Tail
   */
  updateEarsAndTail(dt) {
    // ==========================================
    // 1. FOX EARS: 2-STAGE CARTILAGE SPRING DYNAMICS
    // ==========================================
    if (this.showEars && this.earL && this.earR) {
      let targetZ_L = Math.PI * 0.15; // ~27° natural outward angle
      let targetZ_R = -Math.PI * 0.15;
      let targetX = -0.05;
      let targetY_L = -0.06;
      let targetY_R = 0.06;

      let tipFlexTargetL = 0;
      let tipFlexTargetR = 0;

      if (this.mood === 'happy') {
        // PERKY & CELEBRATORY: Ears perk upright and alert, tips bounce with joy!
        targetZ_L = Math.PI * 0.08;
        targetZ_R = -Math.PI * 0.08;
        targetX = 0.06; // tilted alertly forward
        const happyFlutter = Math.sin(this.time * 16.0) * 0.10;
        targetZ_L += happyFlutter;
        targetZ_R -= happyFlutter;
        tipFlexTargetL = 0.18 + Math.sin(this.time * 20.0) * 0.12;
        tipFlexTargetR = 0.18 + Math.sin(this.time * 20.0) * 0.12;

      } else if (this.mood === 'pout' || this.mood === 'sleepy') {
        // SAD / POUT / SULK: Ears droop slightly outward (~28°), tips droop softly with mild tremor
        targetZ_L = Math.PI * 0.16; // ~28° natural pout droop
        targetZ_R = -Math.PI * 0.16;
        targetX = -0.04; // natural upright
        const sulkWiggle = Math.sin(this.time * 8.0) * 0.035;
        targetZ_L += sulkWiggle;
        targetZ_R -= sulkWiggle;
        tipFlexTargetL = -0.18; // tips droop down
        tipFlexTargetR = -0.18;

      } else if (this.mood === 'wink') {
        // PLAYFUL ASYMMETRIC: One perky ear, one tilted
        targetZ_L = Math.PI * 0.08;
        targetZ_R = -Math.PI * 0.24;
        targetX = 0.06;
        tipFlexTargetL = 0.08;
        tipFlexTargetR = -0.06;

      } else if (this.mood === 'hearts') {
        // WARM & LOVING: Gentle soft flutter
        targetZ_L = Math.PI * 0.11 + Math.sin(this.time * 6.5) * 0.04;
        targetZ_R = -Math.PI * 0.11 - Math.sin(this.time * 6.5) * 0.04;

      } else {
        // IDLE / THINKING: Soft breathing sway + occasional cute twitch
        const earBreath = Math.sin(this.time * 2.2) * 0.035;
        targetZ_L += earBreath;
        targetZ_R -= earBreath;

        // Inertial tip lag from Mochi vertical velocity (organic secondary motion)
        tipFlexTargetL = -this.floatPos.velY * 0.15;
        tipFlexTargetR = -this.floatPos.velY * 0.15;

        // Ear twitch logic
        this.earTwitchTimer -= dt;
        if (this.earTwitchTimer <= 0) {
          this.nextEarTwitch = 2.8 + Math.random() * 3.5;
          this.earTwitchTimer = this.nextEarTwitch;
          this.twitchEar = Math.random() > 0.5 ? 'L' : 'R';
        }

        const twitchAge = this.nextEarTwitch - this.earTwitchTimer;
        if (twitchAge > 0 && twitchAge < 0.22) {
          const twitchWiggle = Math.sin(twitchAge * 46) * 0.16;
          if (this.twitchEar === 'L') {
            targetZ_L += twitchWiggle;
            tipFlexTargetL += twitchWiggle * 1.5;
          } else {
            targetZ_R += twitchWiggle;
            tipFlexTargetR += twitchWiggle * 1.5;
          }
        }
      }

      // Active dynamic ear wiggle on question entrance / wake / interaction
      if (this.earWiggleTimer > 0) {
        this.earWiggleTimer -= dt;
        const prog = 1.0 - Math.max(0, this.earWiggleTimer / this.earWiggleDuration);
        const wave = Math.sin(prog * Math.PI * 6.5) * Math.exp(-prog * 3.8) * 0.28 * (this.earWiggleIntensity || 1.0);
        targetZ_L += wave;
        targetZ_R -= wave * 0.85;
        tipFlexTargetL += wave * 1.5;
        tipFlexTargetR -= wave * 1.3;
      }

      // Dynamic Inertial Lag & Rebound from mascot vertical motion & squish
      const rawVelY = this.floatPos.velY || 0;
      const velY = Math.max(-2.5, Math.min(2.5, rawVelY));
      const rawSquashVel = this.squish.velY || 0;
      const squashVel = Math.max(-2.5, Math.min(2.5, rawSquashVel));
      const inertialLagZ = Math.max(-0.22, Math.min(0.22, velY * 0.20 - squashVel * 0.14));
      const inertialLagX = Math.max(-0.18, Math.min(0.18, -velY * 0.16));
      const inertialTip = Math.max(-0.30, Math.min(0.30, -velY * 0.28 + squashVel * 0.18));

      targetZ_L += inertialLagZ;
      targetZ_R -= inertialLagZ;
      targetX = Math.max(-0.20, Math.min(0.20, targetX + inertialLagX));
      tipFlexTargetL += inertialTip;
      tipFlexTargetR += inertialTip;

      // 2-Stage Damped Harmonic Oscillator (Underdamped for realistic bouncy animal ear overshoot)
      const springStep = (val, vel, target, k, zeta) => {
        const cdamp = 2 * zeta * Math.sqrt(k);
        vel += (-(val - target) * k - vel * cdamp) * dt;
        return [val + vel * dt, vel];
      };

      const kBase = 155;
      const zetaBase = 0.42; // ~26% bouncy overshoot on base ear
      const kTip = 210;
      const zetaTip = 0.36; // springy cartoon whip for cartilage tip

      // Left Ear Rig
      const eL = this.earPhys.L;
      [eL.rz, eL.vz] = springStep(eL.rz, eL.vz, targetZ_L, kBase, zetaBase);
      [eL.rx, eL.vx] = springStep(eL.rx, eL.vx, targetX, kBase, zetaBase);
      [eL.ry, eL.vy] = springStep(eL.ry, eL.vy, targetY_L, kBase, zetaBase);
      [eL.tip, eL.tipVel] = springStep(eL.tip, eL.tipVel, tipFlexTargetL, kTip, zetaTip);

      this.earL.rotation.set(eL.rx, eL.ry, eL.rz);
      if (this.earL_Flex) {
        this.earL_Flex.rotation.x = eL.tip * 0.95;
        this.earL_Flex.rotation.z = eL.tip * 0.65;
      }

      // Right Ear Rig
      const eR = this.earPhys.R;
      [eR.rz, eR.vz] = springStep(eR.rz, eR.vz, targetZ_R, kBase, zetaBase);
      [eR.rx, eR.vx] = springStep(eR.rx, eR.vx, targetX, kBase, zetaBase);
      [eR.ry, eR.vy] = springStep(eR.ry, eR.vy, targetY_R, kBase, zetaBase);
      [eR.tip, eR.tipVel] = springStep(eR.tip, eR.tipVel, tipFlexTargetR, kTip, zetaTip);

      this.earR.rotation.set(eR.rx, eR.ry, eR.rz);
      if (this.earR_Flex) {
        this.earR_Flex.rotation.x = eR.tip * 0.95;
        this.earR_Flex.rotation.z = -eR.tip * 0.65;
      }
    }

    // ==========================================
    // 2. BUSHY FOX TAIL: CONTINUOUS VOLUMETRIC LOFT WAVE
    // ==========================================
    if (this.showTail) {
      this.updateTailLoftMesh(dt);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    let lastTime = performance.now();
    this.isVisible = true;
    if (this.container && typeof IntersectionObserver !== 'undefined' && !this._visibilityObserver) {
      try {
        this._visibilityObserver = new IntersectionObserver((entries) => {
          this.isVisible = !!(entries[0] && entries[0].isIntersecting);
        }, { threshold: 0.02 });
        this._visibilityObserver.observe(this.container);
      } catch (_) {}
    }

    const loop = (now) => {
      if (!this.rafId) return;
      if (this.isVisible === false) {
        this.rafId = setTimeout(() => {
          this.rafId = requestAnimationFrame(loop);
        }, 250);
        return;
      }
      const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
      lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this._visibilityObserver) {
      try { this._visibilityObserver.disconnect(); } catch (_) {}
      this._visibilityObserver = null;
    }
    if (this.rafId) {
      if (typeof this.rafId === 'number' && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafId);
      } else {
        clearTimeout(this.rafId);
      }
      this.rafId = null;
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (_) {}
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) try { m.map.dispose(); } catch (_) {}
              try { m.dispose(); } catch (_) {}
            });
          } else {
            if (obj.material.map) try { obj.material.map.dispose(); } catch (_) {}
            try { obj.material.dispose(); } catch (_) {}
          }
        }
      });
    }
    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      try { this.renderer.dispose(); } catch (_) {}
      this.renderer = null;
    }
  }
}

// Global attachment for drop-in PWA usage
if (typeof window !== 'undefined') {
  window.FiezelMochi = FiezelMochi;
}
