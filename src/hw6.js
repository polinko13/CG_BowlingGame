import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x1a1a2e);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 20, -20);
scene.add(directionalLight);

let bowlingBall = null;
let pins = [];

let ballVelocity = new THREE.Vector3(0, 0, 0);
let ballIsRolling = false;

let aimX = 0;
let power = 0.35;

const clock = new THREE.Clock();

const LANE_HALF_WIDTH = 1.75;
const BALL_RADIUS = 0.45;
const PIN_RADIUS = 0.28;

let gameState = "aiming"; // aiming -> power -> rolling -> resolving -> gameover
let powerMeterValue = 0.25;
let powerMeterDirection = 1;
let rollStartDownCount = 0;
let gutterThisRoll = false;

let currentFrame = 0;
let currentRoll = 0;
let frames = Array.from({ length: 10 }, () => []);


// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// Create bowling lane
function createBowlingLane() {
  // Lane surface - just a simple light maple wood surface
  const laneGeometry = new THREE.BoxGeometry(3.5, 0.2, 60);
  const laneMaterial = new THREE.MeshPhongMaterial({
    color: 0xDEB887,  // Light maple wood color
    shininess: 80
  });
  const lane = new THREE.Mesh(laneGeometry, laneMaterial);
  lane.position.set(0, 0, -30);  // Lane extends from Z=0 (foul line) to Z=-60 (pin end)
  lane.receiveShadow = true;
  scene.add(lane);
  
  createApproachArea();
  createGutters();
  createLaneMarkings();
  createPinDeck();
  // Note: Lane markings, gutters, approach area, pins, ball, and other elements
  // have been removed. Students will need to implement these features.
}

function createApproachArea() {
  const geometry = new THREE.BoxGeometry(5.2, 0.12, 15);
  const material = new THREE.MeshPhongMaterial({
    color: 0x8b6f47,
    shininess: 40
  });

  const approach = new THREE.Mesh(geometry, material);
  approach.position.set(0, -0.04, 7.5);
  approach.receiveShadow = true;
  scene.add(approach);
}

function createGutters() {
  const geometry = new THREE.BoxGeometry(0.45, 0.12, 60);
  const material = new THREE.MeshPhongMaterial({
    color: 0x303040,
    shininess: 20
  });

  const leftGutter = new THREE.Mesh(geometry, material);
  leftGutter.position.set(-2.2, -0.08, -30);
  leftGutter.receiveShadow = true;
  scene.add(leftGutter);

  const rightGutter = new THREE.Mesh(geometry, material);
  rightGutter.position.set(2.2, -0.08, -30);
  rightGutter.receiveShadow = true;
  scene.add(rightGutter);
}

function createPinDeck() {
  const geometry = new THREE.BoxGeometry(4.2, 0.22, 5);
  const material = new THREE.MeshPhongMaterial({
    color: 0xc49a6c,
    shininess: 80
  });

  const deck = new THREE.Mesh(geometry, material);
  deck.position.set(0, 0.03, -58);
  deck.receiveShadow = true;
  scene.add(deck);
}

function createLaneMarkings() {
  // foul line
  const foulGeometry = new THREE.BoxGeometry(3.9, 0.03, 0.12);
  const foulMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const foulLine = new THREE.Mesh(foulGeometry, foulMaterial);
  foulLine.position.set(0, 0.13, 0);
  scene.add(foulLine);

  // approach dots
  const dotGeometry = new THREE.CircleGeometry(0.08, 24);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const rowsZ = [5.0, 9.0];
  const xs = [-1.2, -0.6, 0, 0.6, 1.2];

  rowsZ.forEach((z) => {
    xs.forEach((x) => {
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(x, 0.04, z);
      scene.add(dot);
    });
  });

  // lane arrows
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const arrowGeometry = new THREE.ConeGeometry(0.12, 0.45, 3);
  const arrowXs = [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2];

  arrowXs.forEach((x) => {
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.z = Math.PI;
    arrow.position.set(x, 0.14, -15);
    scene.add(arrow);
  });
}
function createPin() {
  const group = new THREE.Group();

  const points = [
    new THREE.Vector2(0.16, 0.00),
    new THREE.Vector2(0.28, 0.15),
    new THREE.Vector2(0.34, 0.38),
    new THREE.Vector2(0.25, 0.65),
    new THREE.Vector2(0.13, 0.88),
    new THREE.Vector2(0.16, 1.05),
    new THREE.Vector2(0.10, 1.20),
    new THREE.Vector2(0.00, 1.25)
  ];

  const geometry = new THREE.LatheGeometry(points, 48);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 80
  });

  const body = new THREE.Mesh(geometry, material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const stripeGeometry = new THREE.TorusGeometry(0.145, 0.018, 12, 48);
  const stripeMaterial = new THREE.MeshPhongMaterial({
    color: 0xcc0000,
    shininess: 30
  });

  const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
  stripe1.rotation.x = Math.PI / 2;
  stripe1.position.y = 0.86;
  group.add(stripe1);

  const stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial);
  stripe2.rotation.x = Math.PI / 2;
  stripe2.position.y = 0.94;
  group.add(stripe2);

  return group;
}

function createPins() {
  const pinPositions = [
    [0.0, -57.000],
    [-0.5, -57.866],
    [0.5, -57.866],
    [-1.0, -58.732],
    [0.0, -58.732],
    [1.0, -58.732],
    [-1.5, -59.598],
    [-0.5, -59.598],
    [0.5, -59.598],
    [1.5, -59.598]
  ];

  pinPositions.forEach(([x, z]) => {
    const pin = createPin();
    pin.position.set(x, 0.1, z);
    pin.userData.isKnocked = false;
    pin.userData.isFalling = false;
    pin.userData.fallProgress = 0;
    pin.userData.originalPosition = pin.position.clone();
    pin.userData.originalRotation = pin.rotation.clone();
    
    pins.push(pin);
    scene.add(pin);
  });
}

function createBowlingBall() {
  const ballGeometry = new THREE.SphereGeometry(0.45, 64, 64);
  const ballMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd54f,
    shininess: 160,
    specular: 0xffffff
  });

  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, 0.45, 7.2);
  ball.castShadow = true;
  ball.receiveShadow = true;
  scene.add(ball);
  bowlingBall = ball;

  const holeMaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    shininess: 10
  });

  const holes = [
    [-0.12, 0.22, 0.38],
    [0.12, 0.22, 0.38],
    [0.0, 0.02, 0.42]
  ];

  holes.forEach(([dx, dy, dz]) => {
    const holeGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.04, 32);
    const holeMaterial = new THREE.MeshPhongMaterial({
      color: 0x000000,
      shininess: 5
    });

    const hole = new THREE.Mesh(holeGeometry, holeMaterial);

    // local position relative to the ball center
    hole.position.set(dx, dy, dz);

    // cylinder default axis is Y.
    // Rotate it so the circular face points outward from the ball.
    const normal = new THREE.Vector3(dx, dy, dz).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    hole.quaternion.copy(quaternion);

    // Put the dark disk slightly inside the ball surface
    hole.position.copy(normal.multiplyScalar(0.445));

    ball.add(hole);
  });
}

// Create all elements
createBowlingLane();
createPins();
createBowlingBall();

// Set camera position for bowler's perspective
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 5, 12);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Bowling Alley Controls:</h3>
  <p>O - Toggle orbit camera</p>
  <p>Arrow Left / Right - Aim</p>
  <p>Arrow Up / Down - Power</p>
  <p>Space - Throw ball</p>
  <p>R - Reset ball</p>
`;
document.body.appendChild(instructionsElement);
const scorecardElement = document.createElement('div');
scorecardElement.style.position = 'absolute';
scorecardElement.style.top = '20px';
scorecardElement.style.left = '20px';
scorecardElement.style.color = 'white';
scorecardElement.style.background = 'rgba(0, 0, 0, 0.55)';
scorecardElement.style.padding = '12px';
scorecardElement.style.borderRadius = '8px';
scorecardElement.style.fontFamily = 'Arial, sans-serif';

scorecardElement.innerHTML = `
  <h3 style="margin: 0 0 8px 0;">Bowling Scorecard</h3>
  <div id="score-frames" style="display: grid; grid-template-columns: repeat(10, 58px); gap: 4px;"></div>
  <div id="game-status" style="margin-top: 10px; font-size: 13px;">State: aiming</div>
  <div style="margin-top: 10px;">
    <div>Power</div>
    <div style="width: 220px; height: 14px; border: 1px solid white;">
      <div id="power-fill" style="height: 100%; width: 25%; background: lime;"></div>
    </div>
  </div>
`;

document.body.appendChild(scorecardElement);

function updateScorecard() {
  const framesDiv = document.getElementById("score-frames");
  const statusDiv = document.getElementById("game-status");
  const powerFill = document.getElementById("power-fill");

  if (!framesDiv) return;

  framesDiv.innerHTML = "";

  const cumulative = calculateCumulativeScores();

  for (let i = 0; i < 10; i++) {
    const frame = frames[i];
    const frameDiv = document.createElement("div");
    frameDiv.style.border = "1px solid white";
    frameDiv.style.padding = "4px";
    frameDiv.style.textAlign = "center";
    frameDiv.style.minHeight = "42px";

    const rollsText = formatFrame(i, frame);
    const scoreText = cumulative[i] !== null ? cumulative[i] : "";

    frameDiv.innerHTML = `
      <div style="font-size: 11px;">${i + 1}</div>
      <div>${rollsText}</div>
      <div style="font-weight: bold;">${scoreText}</div>
    `;

    framesDiv.appendChild(frameDiv);
  }

  if (statusDiv) {
    if (gameState === "gameover") {
      const cumulative = calculateCumulativeScores();
      const finalScore = cumulative[9] !== null ? cumulative[9] : "";
      statusDiv.textContent = `Game Over! Final score: ${finalScore}. Press R to start a new game.`;
    } else {
      statusDiv.textContent = `State: ${gameState} | Frame: ${currentFrame + 1}`;
    }
  }

  if (powerFill) {
    powerFill.style.width = `${Math.round(powerMeterValue * 100)}%`;
  }
}

function formatFrame(index, frame) {
  if (!frame || frame.length === 0) return "";

  if (index < 9) {
    if (frame[0] === 10) return "X";
    if (frame.length >= 2 && frame[0] + frame[1] === 10) return `${frame[0]} /`;
    return frame.join(" ");
  }

  return frame.map((r, i) => {
    if (r === 10) return "X";
    if (i > 0 && frame[i - 1] !== 10 && frame[i - 1] + r === 10) return "/";
    return String(r);
  }).join(" ");
}

// Handle key events
function handleKeyDown(e) {
  console.log("key pressed:", e.key, e.code, "state:", gameState);
  
  if (e.key === "r" || e.key === "R") {
    newGame();
    return;
  }
  
  if (e.key === "o" || e.key === "O") {
    isOrbitEnabled = !isOrbitEnabled;
    return;
  }

  
  if (gameState === "gameover") {
    return;
  }

  if (gameState === "aiming") {
    if (e.key === "ArrowLeft") {
      bowlingBall.position.x = Math.max(bowlingBall.position.x - 0.12, -1.2);
      aimX = bowlingBall.position.x * 0.025;
    }

    if (e.key === "ArrowRight") {
      bowlingBall.position.x = Math.min(bowlingBall.position.x + 0.12, 1.2);
      aimX = bowlingBall.position.x * 0.025;
    }

    if (e.code === "Space") {
      gameState = "power";
      powerMeterValue = 0.25;
      powerMeterDirection = 1;
    }
  }

  else if (gameState === "power") {
    if (e.code === "Space") {
      releaseBall();
    }
  }

  updateScorecard();
}
document.addEventListener('keydown', handleKeyDown);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
//physics
function releaseBall() {
  const speed = 35 + powerMeterValue * 45;

  ballVelocity.set(aimX * speed, 0, -speed);

  rollStartDownCount = pins.filter(pin => pin.userData.isKnocked).length;
  gutterThisRoll = false;
  ballIsRolling = true;
  gameState = "rolling";
}

function updatePowerMeter(deltaTime) {
  if (gameState !== "power") return;

  powerMeterValue += powerMeterDirection * deltaTime * 1.4;

  if (powerMeterValue >= 1) {
    powerMeterValue = 1;
    powerMeterDirection = -1;
  }

  if (powerMeterValue <= 0.15) {
    powerMeterValue = 0.15;
    powerMeterDirection = 1;
  }
}

function updateBall(deltaTime) {
  if (gameState !== "rolling" || bowlingBall === null) return;

  bowlingBall.position.addScaledVector(ballVelocity, deltaTime);

  bowlingBall.rotation.x -= ballVelocity.z * deltaTime * 2.5;
  bowlingBall.rotation.z -= ballVelocity.x * deltaTime * 2.5;

  ballVelocity.multiplyScalar(Math.pow(0.985, deltaTime * 60));
  //ballVelocity.multiplyScalar(Math.pow(0.995, deltaTime * 60));

  if (Math.abs(bowlingBall.position.x) > LANE_HALF_WIDTH) {
    gutterThisRoll = true;
    bowlingBall.position.y = 0.1;
    endRolling();
    return;
  }

  checkBallPinCollisions();

  if (bowlingBall.position.z < -63 || ballVelocity.length() < 0.5) {
    endRolling();
  }
}

function endRolling() {
  ballIsRolling = false;
  ballVelocity.set(0, 0, 0);
  gameState = "resolving";
}

function checkBallPinCollisions() {
  pins.forEach((pin) => {
    if (pin.userData.isKnocked) return;

    const dx = bowlingBall.position.x - pin.position.x;
    const dz = bowlingBall.position.z - pin.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < BALL_RADIUS + PIN_RADIUS) {
      knockPin(pin, dx, dz);
    }
  });
}

function knockPin(pin, dx, dz) {
  pin.userData.isKnocked = true;
  pin.userData.isFalling = true;
  pin.userData.fallProgress = 0;

  const direction = new THREE.Vector3(-dx, 0, -dz);
  if (direction.length() < 0.001) {
    direction.set(Math.random() - 0.5, 0, -1);
  }

  direction.normalize();
  pin.userData.fallDirection = direction;
}

function updatePins(deltaTime) {
  pins.forEach((pin) => {
    if (!pin.userData.isFalling) return;

    pin.userData.fallProgress += deltaTime * 2.5;
    const t = Math.min(pin.userData.fallProgress, 1);

    const dir = pin.userData.fallDirection;

    pin.rotation.x = t * Math.PI / 2;
    pin.rotation.z = dir.x * t * 0.8;

    pin.position.x = pin.userData.originalPosition.x + dir.x * t * 0.45;
    pin.position.z = pin.userData.originalPosition.z + dir.z * t * 0.45;
    pin.position.y = 0.1 + t * 0.18;

    if (t >= 1) {
      pin.userData.isFalling = false;
      pin.position.y = 0.25;
      propagatePinCollision(pin);
    }
  });
}

function propagatePinCollision(fallenPin) {
  pins.forEach((otherPin) => {
    if (otherPin.userData.isKnocked) return;

    const dx = fallenPin.position.x - otherPin.position.x;
    const dz = fallenPin.position.z - otherPin.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.75) {
      knockPin(otherPin, -dx, -dz);
    }
  });
}

function resolveRollIfReady() {
  if (gameState !== "resolving") return;

  const stillFalling = pins.some(pin => pin.userData.isFalling);
  if (stillFalling) return;

  finishRoll();
}

function finishRoll() {
  const downNow = pins.filter(pin => pin.userData.isKnocked).length;
  const knockedThisRoll = gutterThisRoll ? 0 : downNow - rollStartDownCount;

  recordRoll(knockedThisRoll);
  resetBallOnly();

  if (gameState !== "gameover") {
    gameState = "aiming";
  }

  updateScorecard();
}

function recordRoll(pinsDown) {
  frames[currentFrame].push(pinsDown);

  if (currentFrame < 9) {
    if (currentRoll === 0 && pinsDown === 10) {
      currentFrame++;
      currentRoll = 0;
      resetPins();
      return;
    }

    if (currentRoll === 0) {
      currentRoll = 1;
      return;
    }

    currentFrame++;
    currentRoll = 0;
    resetPins();
    return;
  }

  // 10th frame
  const tenth = frames[9];

  if (tenth.length === 1 && tenth[0] === 10) {
    resetPins();
    return;
  }

  if (tenth.length === 2) {
    if (tenth[0] === 10 || tenth[0] + tenth[1] === 10) {
      resetPins();
      return;
    }
    gameState = "gameover";
    return;
  }

  if (tenth.length >= 3) {
    gameState = "gameover";
  }
}

function getAllRolls() {
  return frames.flat();
}

function calculateCumulativeScores() {
  const scores = Array(10).fill(null);
  const rolls = getAllRolls();

  let total = 0;
  let rollIndex = 0;

  for (let frame = 0; frame < 10; frame++) {
    if (frame < 9) {
      const first = rolls[rollIndex];

      if (first === undefined) break;

      if (first === 10) {
        if (rolls[rollIndex + 1] === undefined || rolls[rollIndex + 2] === undefined) break;
        total += 10 + rolls[rollIndex + 1] + rolls[rollIndex + 2];
        scores[frame] = total;
        rollIndex += 1;
      } else {
        const second = rolls[rollIndex + 1];
        if (second === undefined) break;

        if (first + second === 10) {
          if (rolls[rollIndex + 2] === undefined) break;
          total += 10 + rolls[rollIndex + 2];
        } else {
          total += first + second;
        }

        scores[frame] = total;
        rollIndex += 2;
      }
    } else {
      const tenth = frames[9];
      if (tenth.length >= 2) {
        total += tenth.reduce((a, b) => a + b, 0);
        scores[frame] = total;
      }
    }
  }

  return scores;
}

function resetBallOnly() {
  bowlingBall.position.set(0, 0.45, 7.2);
  bowlingBall.rotation.set(0, 0, 0);

  ballVelocity.set(0, 0, 0);
  ballIsRolling = false;
  aimX = 0;
  powerMeterValue = 0.25;
}

function resetPins() {
  pins.forEach((pin) => {
    pin.userData.isKnocked = false;
    pin.userData.isFalling = false;
    pin.userData.fallProgress = 0;

    pin.position.copy(pin.userData.originalPosition);
    pin.rotation.copy(pin.userData.originalRotation);
  });
}

function newGame() {
  frames = Array.from({ length: 10 }, () => []);
  currentFrame = 0;
  currentRoll = 0;
  gameState = "aiming";
  gutterThisRoll = false;

  resetBallOnly();
  resetPins();
  updateScorecard();
}

// Animation function
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updatePowerMeter(deltaTime);
  updateBall(deltaTime);
  updatePins(deltaTime);
  resolveRollIfReady();

  controls.enabled = isOrbitEnabled && gameState !== "rolling";
  controls.update();

  updateScorecard();

  renderer.render(scene, camera);
}

animate();
