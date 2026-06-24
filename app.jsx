import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-ext-400.css";
import "@fontsource/pixelify-sans/latin-700.css";
import "@fontsource/pixelify-sans/latin-ext-700.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "motion/react";
import { BookHeart, Download, Map, Volume2, VolumeX } from "lucide-react";
import Matter from "matter-js";
import confetti from "canvas-confetti";

const REBECA = "Rebeca";
const RAFAEL = "Rafael";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#worldCanvas");
const ctx = canvas.getContext("2d");
const coverScreen = $("#coverScreen");
const gameScreen = $("#gameScreen");
const finalScreen = $("#finalScreen");
const storyModal = $("#storyModal");
const storyContent = $("#storyModalContent");

const scenes = [
  { chapter: "ÓRBITA 1/7", title: "A estação do acaso", ribbon: "Estação Zero · O Sinal Impossível", counter: "sinais <b>0/3</b>" },
  { chapter: "ÓRBITA 2/7", title: "O planeta Riso-47", ribbon: "Riso-47 · Gravidade Duvidosa", counter: "risadas <b>0/7</b>" },
  { chapter: "ÓRBITA 3/7", title: "A lua da saudade", ribbon: "Lua Saudade · Setor do Coração", counter: "corações <b>0/7</b>" },
  { chapter: "ÓRBITA 4/7", title: "A nebulosa Rebeca", ribbon: "Nebulosa Rebeca · Céu com Nome", counter: "constelação <b>?</b>" },
  { chapter: "ÓRBITA 5/7", title: "O planeta Amanhã", ribbon: "Planeta Amanhã · Arquivo Temporal", counter: "futuro <b>bloqueado</b>" },
  { chapter: "ÓRBITA 6/7", title: "O cinturão do frio na barriga", ribbon: "Cinturão do Frio na Barriga", counter: "coragem <b>0/8</b>" },
  { chapter: "ÓRBITA FINAL", title: "O planeta sem nome", ribbon: "Coordenadas Desconhecidas · Só Siga", counter: "mistério <b>à frente</b>" },
];

const state = {
  running: false,
  scene: 0,
  fragments: [false, false, false, false, false, false],
  clues: [false, false, false],
  clueCount: 0,
  heartsCaught: 0,
  laughsCaught: 0,
  constellationDone: false,
  phraseDone: false,
  flightDone: false,
  blooms: [false, false, false],
  bloomCount: 0,
  highestScene: 0,
  glyphs: [false, false, false],
  secretSolved: false,
  secretNotes: [false, false, false, false, false, false, false],
  target: null,
  nearAction: null,
  tapMarker: null,
  emote: null,
  player: { x: 450, y: 500, dir: "up", moving: false, step: 0 },
  pingo: { x: 520, y: 450 },
};

const HUD_EVENT = "rafael-hud-update";
function emitHudUpdate() {
  window.dispatchEvent(new CustomEvent(HUD_EVENT, { detail: { soundOn, notes: state.secretNotes.filter(Boolean).length, glyphs:state.glyphs.filter(Boolean).length } }));
}

function HudControls() {
  const [hud, setHud] = useState({ soundOn:false, notes:0, glyphs:0 });
  useEffect(() => {
    const update = (event) => setHud(event.detail);
    window.addEventListener(HUD_EVENT, update);
    return () => window.removeEventListener(HUD_EVENT, update);
  }, []);
  const buttonMotion = { whileHover:{ y:-2 }, whileTap:{ y:3, scale:.92 }, transition:{ duration:.14 } };
  return <>
    <motion.button {...buttonMotion} className="backpack-button" type="button" aria-label="Abrir álbum secreto" onClick={openAlbum}>
      <BookHeart size={18} strokeWidth={2.5}/><span>{hud.notes}</span>
    </motion.button>
    <motion.button {...buttonMotion} className="galaxy-map-button" type="button" aria-label="Abrir mapa galáctico" onClick={openGalaxyMap}>
      <Map size={18} strokeWidth={2.5}/><span>{hud.glyphs}</span>
    </motion.button>
    <motion.button {...buttonMotion} className={`sound-toggle${hud.soundOn ? "" : " off"}`} type="button" aria-label={hud.soundOn ? "Desativar som" : "Ativar som"} onClick={toggleSound}>
      {hud.soundOn ? <Volume2 size={18} strokeWidth={2.5}/> : <VolumeX size={18} strokeWidth={2.5}/>} 
    </motion.button>
    <motion.button {...buttonMotion} className="install-trigger" type="button" aria-label="Instalar no iPhone" onClick={openInstallHelp}>
      <Download size={18} strokeWidth={2.5}/>
    </motion.button>
  </>;
}

const keys = { up: false, down: false, left: false, right: false };
const joystickInput = { x: 0, y: 0, active: false, pointerId: null };
const dustParticles = [];
let dustCooldown = 0;
const clues = [
  { x: 185, y: 180, icon: "⌁", name: "Sinal do sorriso", text: "Sinal um: uma risada atravessou 47 anos-luz e fez três satélites perderem a postura." },
  { x: 710, y: 195, icon: "⌛", name: "Falha no tempo", text: "Sinal dois: perto de você, os relógios passam rápido demais. A ciência chamou isso de suspeito." },
  { x: 470, y: 390, icon: "✉", name: "Mensagem impossível", text: "Sinal três: veio do futuro e só dizia ‘ela chegou’. Rafael definitivamente mexeu onde não devia." },
];

const secretNotes = [
  { scene:0, x:315, y:505, title:"DIÁRIO 01 · PRIMEIRO SINAL", text:"Eu não sei apontar o minuto exato, mas em algum momento conversar com você virou a parte favorita do meu dia." },
  { scene:1, x:760, y:455, title:"DIÁRIO 02 · RISO-47", text:"Seu sorriso tem um efeito estranho: ele melhora meu dia antes que eu tenha tempo de fingir costume." },
  { scene:2, x:165, y:455, title:"DIÁRIO 03 · SAUDADE", text:"Descobri que saudade é o coração perguntando, de cinco em cinco minutos, quando vai te ver de novo." },
  { scene:3, x:165, y:455, title:"DIÁRIO 04 · CONSTELAÇÃO", text:"Entre todas as coincidências do universo, encontrar você continua sendo a minha preferida." },
  { scene:4, x:735, y:480, title:"DIÁRIO 05 · AMANHÃ", text:"Quando penso no futuro, ele fica muito mais bonito se tiver suas risadas espalhadas por lá." },
  { scene:5, x:115, y:465, title:"DIÁRIO 06 · CORAGEM", text:"Coragem não é não sentir frio na barriga. É construir seis planetas e torcer para você chegar ao último." },
  { scene:6, x:145, y:315, title:"DIÁRIO 07 · A VERDADE", text:"Se você encontrou todos, já sabe: eu fiz um universo inteiro porque dizer só ‘gosto de você’ ficou pequeno demais." },
];

const fireflies = Array.from({ length: 7 }, (_, index) => ({
  x: 125 + ((index * 113) % 650),
  y: 130 + ((index * 79) % 370),
  vx: 24 + (index % 3) * 8,
  vy: 17 + (index % 2) * 10,
  phase: index * 0.8,
  caught: false,
}));

const laughOrbs = Array.from({ length: 7 }, (_, index) => ({
  x: 115 + ((index * 127) % 680), y: 120 + ((index * 91) % 390), phase:index * .7, caught:false,
}));

const memoryBlooms = [
  { x:170, y:185, word:"COMEÇO", line:"O começo: quando qualquer assunto virou desculpa para continuar conversando." },
  { x:735, y:245, word:"AGORA", line:"O agora: esse momento meio doido em que você está explorando um planeta feito para você." },
  { x:255, y:455, word:"DEPOIS", line:"O depois: uma possibilidade bonita, se você quiser descobrir comigo." },
];

const mysteryGlyphs = [
  { scene:1,x:105,y:335,symbol:"☽",name:"ECO DA LUA",clue:"O primeiro símbolo sussurra: o que sente vem antes do que guia." },
  { scene:3,x:420,y:470,symbol:"✦",name:"FAROL ESTELAR",clue:"O segundo símbolo responde: a luz aponta para aquilo que ainda esperamos." },
  { scene:5,x:785,y:335,symbol:"♡",name:"PULSO ANTIGO",clue:"O terceiro símbolo pulsa como se conhecesse seu nome desde o futuro." },
];

let lastTime = performance.now();
let audioContext = null;
let soundOn = false;
let dialogueTimer = null;
let musicTimer = null;
let musicStep = 0;
const physicsEngine = Matter.Engine.create({ gravity:{ x:0, y:0 } });
let playerBody = null;

const sceneColliders = [
  [[450,48,210,100],[75,145,80,115],[825,145,80,115],[95,445,80,115],[815,470,80,115],[280,105,70,100],[640,105,70,100],[120,292,165,75],[745,395,235,120]],
  [[65,145,90,125],[165,90,95,125],[285,125,95,125],[625,115,95,125],[735,95,95,125],[845,155,80,125],[85,470,90,125],[810,480,90,125]],
  [[65,145,90,125],[165,90,95,125],[285,125,95,125],[625,115,95,125],[735,95,95,125],[845,155,80,125],[85,470,90,125],[810,480,90,125]],
  [[700,275,130,230],[175,370,200,90]],
  [[450,220,280,160],[200,438,230,80],[700,438,230,80]],
  [[450,260,250,160],[85,420,120,105],[815,420,120,105]],
  [[90,120,110,110],[810,130,110,110],[450,100,180,100]],
  [[80,135,90,120],[185,175,90,120],[715,175,90,120],[820,135,90,120],[105,445,95,130],[795,445,95,130],[450,110,120,90]],
];

function rebuildPhysics(sceneIndex) {
  Matter.Composite.clear(physicsEngine.world, false, true);
  const walls = [
    Matter.Bodies.rectangle(450,58,900,36,{isStatic:true}),Matter.Bodies.rectangle(450,582,900,36,{isStatic:true}),
    Matter.Bodies.rectangle(18,300,36,600,{isStatic:true}),Matter.Bodies.rectangle(882,300,36,600,{isStatic:true}),
  ];
  const obstacles = sceneColliders[sceneIndex].map(([x,y,w,h])=>Matter.Bodies.rectangle(x,y,w,h,{isStatic:true,chamfer:{radius:4}}));
  playerBody = Matter.Bodies.circle(state.player.x,state.player.y,22,{friction:0,frictionAir:.12,restitution:0,inertia:Infinity});
  Matter.Composite.add(physicsEngine.world,[...walls,...obstacles,playerBody]);
}

function drawCoverPixelHero() {
  const coverCanvas = $("#coverPixelHero");
  const coverCtx = coverCanvas.getContext("2d");
  coverCtx.clearRect(0,0,180,220); coverCtx.imageSmoothingEnabled=false;
  drawExplorerSprite(coverCtx,90,192,5,"down",0,"rebeca",false,true);
}

drawCoverPixelHero();

function setActiveScreen(screen) {
  [coverScreen, gameScreen, finalScreen].forEach((item) => item.classList.toggle("active", item === screen));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
}

function tone(frequency = 440, duration = 0.12, type = "sine", volume = 0.035) {
  if (!soundOn) return;
  ensureAudio();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function successChime() {
  [523, 659, 784, 1046].forEach((note, index) => setTimeout(() => tone(note, 0.28, "sine", 0.045), index * 90));
}

// Pequenas trilhas originais geradas em tempo real: cada órbita tem seu próprio motivo.
const musicThemes = [
  { bpm:176, lead:[392,494,587,494,440,523,659,523], bass:[98,98,110,110,131,131,110,110] },
  { bpm:192, lead:[523,659,784,659,587,698,880,698], bass:[131,165,147,175,131,165,147,196] },
  { bpm:150, lead:[330,392,494,440,392,330,294,330], bass:[82,82,110,110,98,98,73,73] },
  { bpm:132, lead:[440,554,659,831,659,554,494,659], bass:[110,110,139,139,165,165,123,123] },
  { bpm:168, lead:[392,466,587,698,587,523,466,392], bass:[98,117,147,117,131,98,117,98] },
  { bpm:205, lead:[330,440,523,659,587,494,392,523], bass:[82,110,98,123,82,110,98,131] },
  { bpm:142, lead:[523,659,784,1046,988,784,659,523], bass:[131,165,196,165,147,196,165,131] },
  { bpm:126, lead:[392,523,659,784,659,523,494,659], bass:[98,131,165,196,165,131,123,165] },
];

function restartMusic(themeIndex=state.scene){
  clearInterval(musicTimer);musicTimer=null;musicStep=0;
  if(!soundOn)return;
  const theme=musicThemes[themeIndex]||musicThemes[0],tick=Math.round(60000/theme.bpm/2);
  const play=()=>{const step=musicStep%theme.lead.length;tone(theme.lead[step],tick/1000*.72,step%2?"square":"triangle",.009);if(step%2===0)tone(theme.bass[step],tick/1000*1.5,"square",.006);musicStep+=1;};
  play();musicTimer=setInterval(play,tick);
}

function say(text, speaker = "PINGO · GUIA EMOCIONAL") {
  clearTimeout(dialogueTimer);
  $("#dialogueSpeaker").textContent = speaker;
  $("#dialogueText").textContent = text;
  $("#dialogueBox").animate([{ transform: "translateY(4px)", opacity: 0.65 }, { transform: "none", opacity: 1 }], { duration: 280 });
}

function updateHud() {
  const scene = scenes[state.scene];
  $("#hudChapter").textContent = scene.chapter;
  $("#hudTitle").textContent = scene.title;
  $("#missionCounter").innerHTML = scene.counter;
  if (state.scene === 0) $("#missionCounter").innerHTML = `sinais <b>${state.clueCount}/3</b>`;
  if (state.scene === 1) $("#missionCounter").innerHTML = `risadas <b>${state.laughsCaught}/7</b>`;
  if (state.scene === 2) $("#missionCounter").innerHTML = `corações <b>${state.heartsCaught}/7</b>`;
  if (state.scene === 5) $("#missionCounter").innerHTML = state.flightDone ? "coragem <b>8/8</b>" : "coragem <b>0/8</b>";
  emitHudUpdate();
  state.fragments.forEach((found, index) => document.querySelector(`[data-fragment="${index}"]`).classList.toggle("found", found));
  document.querySelectorAll("[data-orbit]").forEach((node,index)=>{
    node.classList.toggle("active", index === state.scene);
    node.classList.toggle("visited", index <= state.highestScene && index !== state.scene);
  });
}

function showRibbon() {
  const ribbon = $("#sceneRibbon");
  ribbon.querySelector("strong").textContent = scenes[state.scene].ribbon;
  ribbon.classList.remove("show");
  void ribbon.offsetWidth;
  ribbon.classList.add("show");
}

function showAchievement(index, name) {
  state.fragments[index] = true;
  updateHud();
  showToast("SELO ORBITAL RECUPERADO",name,"✦");
}

function showToast(kicker,name,icon="✦"){
  $("#achievementKicker").textContent=kicker;
  $("#achievementName").textContent = name;
  $("#achievementIcon").textContent=icon;
  $("#achievement").classList.add("show");
  successChime();
  setTimeout(() => $("#achievement").classList.remove("show"), 2600);
}

function transitionTo(sceneIndex, delay = 1350) {
  const transition = $("#cinematicTransition");
  $("#transitionChapter").textContent = scenes[sceneIndex].chapter;
  $("#transitionTitle").textContent = scenes[sceneIndex].title;
  transition.classList.add("show");
  setTimeout(() => {
    state.scene = sceneIndex;
    state.highestScene = Math.max(state.highestScene,sceneIndex);
    state.target = null;
    state.player.x = 450;
    state.player.y = sceneIndex === 6 ? 520 : 500;
    state.pingo.x = 515;
    state.pingo.y = 455;
    rebuildPhysics(sceneIndex);
    updateHud();
    restartMusic(sceneIndex);
    render();
    setTimeout(() => {
      transition.classList.remove("show");
      showRibbon();
      announceScene(sceneIndex);
    }, 360);
  }, delay);
}

function announceScene(scene) {
  const lines = [
    `${REBECA}, três sinais impossíveis estão escondidos na estação. Explore, chegue perto do brilho e aperte AGIR.`,
    "Bem-vinda a Riso-47, onde as risadas criaram pernas. Encoste nas sete antes que contem piada ruim para a galáxia.",
    "Meu coração se multiplicou e fugiu pela Lua Saudade. Encoste nos sete antes que eles abram um sindicato.",
    "A nebulosa guardou uma mensagem com o seu nome. Vá até o telescópio e memorize a rota das estrelas.",
    "O planeta Amanhã arquivou futuros possíveis. Aproxime-se do painel e monte a frase capaz de abrir o melhor deles.",
    "Alerta: entramos no frio na barriga do Rafael. Pilote a nave, colete oito faíscas de coragem e não alimente os meteoros.",
    "Este planeta não existe em nenhum mapa. Há três flores-memória por aqui — escute todas e siga a luz.",
  ];
  say(lines[scene]);
}

function startAdventure() {
  state.running = true;
  rebuildPhysics(0);
  setActiveScreen(gameScreen);
  updateHud();
  restartMusic(0);
  showRibbon();
  say(`${REBECA}! Finalmente. Uma mensagem assinada por ${RAFAEL} atravessou o tempo e bagunçou seis órbitas. Naturalmente, sobrou para nós.`);
  tone(392, 0.2);
}

function openPrologue() {
  storyContent.innerHTML = `
    <div class="transmission-glitch">TRANSMISSÃO 14.02 · ORIGEM: FUTURO IMPROVÁVEL</div>
    <div class="cosmic-sigil">R <span>✦</span> R</div>
    <h2>O universo esqueceu<br /><em>uma palavra</em></h2>
    <p class="modal-copy">Às 23:47, todos os mapas celestes perderam a palavra <strong>“nós”</strong>. Restou uma transmissão assinada por Rafael, seis selos orbitais e uma coordenada que responde apenas ao nome Rebeca.</p>
    <div class="mission-dossier"><span>RISCO</span><b>frio na barriga severo</b><span>GUIA</span><b>Pingo, emocionalmente habilitado</b><span>OBJETIVO</span><b>chegar ao sétimo mundo</b></div>
    <button class="modal-main-button" id="launchMission" type="button">aceitar missão e decolar ✦</button>`;
  storyModal.showModal();
  $("#launchMission").addEventListener("click",()=>{storyModal.close();startAdventure();},{once:true});
}

$("#startAdventure").addEventListener("click", openPrologue);

// Movement
const keyMap = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
window.addEventListener("keydown", (event) => {
  if (keyMap[event.key]) {
    keys[keyMap[event.key]] = true;
    state.target = null;
    event.preventDefault();
  }
  if (event.key === "e" || event.key === "E" || event.key === "Enter") interact();
});
window.addEventListener("keyup", (event) => {
  if (keyMap[event.key]) keys[keyMap[event.key]] = false;
});

const joystickElement = $("#joystick");
const joystickKnob = $("#joystickKnob");

function moveJoystick(event) {
  if (!joystickInput.active || event.pointerId !== joystickInput.pointerId) return;
  const base = joystickElement.querySelector(".joystick-base").getBoundingClientRect();
  const centerX = base.left + base.width / 2;
  const centerY = base.top + base.height / 2;
  const maxRadius = base.width * 0.34;
  let dx = event.clientX - centerX;
  let dy = event.clientY - centerY;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > maxRadius) { dx = (dx / magnitude) * maxRadius; dy = (dy / magnitude) * maxRadius; }
  joystickInput.x = dx / maxRadius;
  joystickInput.y = dy / maxRadius;
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  state.target = null;
}

function releaseJoystick(event) {
  if (event && joystickInput.pointerId !== event.pointerId) return;
  joystickInput.x = 0; joystickInput.y = 0; joystickInput.active = false; joystickInput.pointerId = null;
  joystickElement.classList.remove("active");
  joystickKnob.style.transform = "translate(-50%,-50%)";
}

joystickElement.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  joystickInput.active = true; joystickInput.pointerId = event.pointerId;
  joystickElement.setPointerCapture(event.pointerId);
  joystickElement.classList.add("active");
  if (navigator.vibrate) navigator.vibrate(8);
  moveJoystick(event);
});
joystickElement.addEventListener("pointermove", moveJoystick);
joystickElement.addEventListener("pointerup", releaseJoystick);
joystickElement.addEventListener("pointercancel", releaseJoystick);

canvas.addEventListener("pointerdown", (event) => {
  if (!state.running) return;
  const rect = canvas.getBoundingClientRect();
  state.target = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
  state.tapMarker = { ...state.target, born: performance.now() };
});

$("#actionButton").addEventListener("click", interact);

function update(delta) {
  if (!state.running || storyModal.open || finalScreen.classList.contains("active")) return;
  const player = state.player;
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + joystickInput.x;
  let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + joystickInput.y;

  if (!dx && !dy && state.target) {
    const tx = state.target.x - player.x;
    const ty = state.target.y - player.y;
    const distance = Math.hypot(tx, ty);
    if (distance > 7) { dx = tx / distance; dy = ty / distance; }
    else state.target = null;
  }

  const length = Math.hypot(dx, dy) || 1;
  player.moving = Boolean(dx || dy);
  const joystickMagnitude = Math.hypot(joystickInput.x, joystickInput.y);
  const speed = joystickMagnitude > 0.86 ? 245 : 190;
  if (player.moving) {
    player.step += delta * (speed > 200 ? 14 : 10);
    const horizontal=Math.abs(dx)>.28,vertical=Math.abs(dy)>.28;
    if(horizontal&&vertical)player.dir=`${dy>0?"down":"up"}-${dx>0?"right":"left"}`;
    else if(horizontal)player.dir=dx>0?"right":"left";
    else if(vertical)player.dir=dy>0?"down":"up";
    dustCooldown -= delta;
    if (dustCooldown <= 0) {
      dustParticles.push({ x: player.x + (Math.random() - .5) * 18, y: player.y + 24, life: .48, size: 3 + Math.random() * 3 });
      dustCooldown = speed > 200 ? .075 : .13;
    }
  }
  if (playerBody) {
    Matter.Body.setVelocity(playerBody, player.moving ? { x:(dx/length)*speed/60, y:(dy/length)*speed/60 } : {x:0,y:0});
    Matter.Engine.update(physicsEngine, Math.max(8,delta*1000));
    player.x = playerBody.position.x;
    player.y = playerBody.position.y;
  } else {
    player.x += player.moving ? (dx/length)*speed*delta : 0;
    player.y += player.moving ? (dy/length)*speed*delta : 0;
    player.x = Math.max(45,Math.min(855,player.x));player.y=Math.max(75,Math.min(555,player.y));
  }

  const pingoTargetX = player.x + (player.dir === "left" ? 58 : -58);
  const pingoTargetY = player.y - 50;
  state.pingo.x += (pingoTargetX - state.pingo.x) * Math.min(1, delta * 5);
  state.pingo.y += (pingoTargetY - state.pingo.y) * Math.min(1, delta * 5);

  dustParticles.forEach((particle) => { particle.life -= delta; particle.y += 9 * delta; particle.x += Math.sin(particle.life * 9) * 5 * delta; });
  while (dustParticles.length && dustParticles[0].life <= 0) dustParticles.shift();

  if (state.scene === 1) updateLaughOrbs(delta);
  if (state.scene === 2) updateFireflies(delta);
  findNearbyAction();
}

function updateLaughOrbs(delta) {
  laughOrbs.forEach((orb,index)=>{
    if (orb.caught) return;
    orb.phase += delta * (2.4 + index * .08);
    orb.x += Math.cos(orb.phase * .73) * 24 * delta;
    orb.y += Math.sin(orb.phase) * 18 * delta;
    if (distance(state.player,orb) < 42) {
      orb.caught = true; state.laughsCaught += 1;
      state.emote = {icon:["HA","HI","KK","HA","HE","KK","HA"][index],until:performance.now()+900};
      tone(470+index*55,.13,"square",.025); updateHud();
      const lines=["HA capturado! Ele tentou fugir com passinhos minúsculos.","Essa risada tinha covinhas. Isso deveria ser ilegal.","Três! O planeta está ficando perigosamente bem-humorado.","Quatro! Pingo riu sem entender. Clássico.","Cinco! Os astrônomos chamam isso de gargalhância.","Seis! Falta a risada mais teimosa.","Sete! Seu sorriso religou o sol. Não é metáfora, olha ali."];
      say(lines[state.laughsCaught-1]);
      if(state.laughsCaught===7){showAchievement(1,"Riso com alcance interplanetário");setTimeout(()=>say("O portal solar abriu no topo. Antes que ele mude de ideia, vamos!"),1800);}
    }
  });
}

function updateFireflies(delta) {
  fireflies.forEach((heart, index) => {
    if (heart.caught) return;
    heart.phase += delta * 2;
    heart.x += heart.vx * delta;
    heart.y += heart.vy * delta;
    if (heart.x < 80 || heart.x > 820) heart.vx *= -1;
    if (heart.y < 95 || heart.y > 520) heart.vy *= -1;
    if (distance(state.player, heart) < 38) catchHeart(heart, index);
  });
}

function catchHeart(heart, index) {
  heart.caught = true;
  state.heartsCaught += 1;
  state.emote = { icon: "♥", until: performance.now() + 900 };
  if (navigator.vibrate) navigator.vibrate(10);
  tone(550 + index * 42, 0.12, "triangle", 0.04);
  updateHud();
  const lines = ["Um! Esse tentou se esconder atrás da própria fofura.", "Dois! Meu coração tem zero talento para fuga.", "Três! Ele reconheceu você e se entregou.", "Quatro! Estamos oficialmente no território da saudade.", "Cinco! A situação está romanticamente fora de controle.", "Seis! Falta só o mais teimoso.", "Sete! Pronto. Meu coração inteiro voltou — e escolheu ficar com você."];
  say(lines[state.heartsCaught - 1]);
  if (state.heartsCaught === 7) {
    showAchievement(2, "Afeto à prova de órbita");
    setTimeout(() => say("O portão de raízes acordou no alto do bosque. Vá até ele e aperte AGIR."), 1900);
  }
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function findNearbyAction() {
  let action = null;
  const currentNote = secretNotes[state.scene];
  if (currentNote && !state.secretNotes[state.scene] && distance(state.player, currentNote) < 80) action = { type:"note", index:state.scene, label:"ler bilhete secreto" };
  mysteryGlyphs.forEach((glyph,index)=>{if(glyph.scene===state.scene&&!state.glyphs[index]&&distance(state.player,glyph)<72)action={type:"glyph",index,label:"decifrar símbolo"};});
  if (state.scene === 0) {
    clues.forEach((clue, index) => {
      if (!state.clues[index] && distance(state.player, clue) < 90) action = { type: "clue", index, label: "investigar pista" };
    });
    if (state.clueCount === 3 && distance(state.player, { x: 820, y: 300 }) < 105) action = { type: "portal1", label: "atravessar portal" };
  } else if (state.scene === 1 && state.laughsCaught === 7 && distance(state.player, { x: 450, y: 90 }) < 110) {
    action = { type: "portal2", label: "abrir o portão" };
  } else if (state.scene === 2 && state.heartsCaught === 7 && distance(state.player, { x: 450, y: 90 }) < 110) {
    action = { type: "portal3", label: "seguir os corações" };
  } else if (state.scene === 3 && distance(state.player, { x: 690, y: 220 }) < 110) {
    action = { type: "telescope", label: "olhar as estrelas" };
  } else if (state.scene === 4 && distance(state.player, { x: 450, y: 225 }) < 115) {
    action = { type: "console", label: "decodificar arquivo" };
  } else if (state.scene === 5 && distance(state.player, { x: 450, y: 250 }) < 135) {
    action = { type: "starflight", label: state.flightDone ? "seguir a coordenada" : "pilotar a nave" };
  } else if (state.scene === 6) {
    memoryBlooms.forEach((bloom,index)=>{if(!state.blooms[index]&&distance(state.player,bloom)<80)action={type:"bloom",index,label:"ouvir memória"};});
    if(state.bloomCount===3&&distance(state.player,{x:450,y:130})<120) action={type:"ringbox",label:"abrir a última estrela"};
  }
  state.nearAction = action;
  $("#interactionHint").classList.toggle("show", Boolean(action));
  $("#actionButton").classList.toggle("ready", Boolean(action));
  const shortLabels = { note:"LER", glyph:"DECIFRAR", clue:"VER", portal1:"ENTRAR", portal2:"ABRIR", portal3:"SEGUIR", telescope:"OLHAR", console:"USAR", starflight:"VOAR", bloom:"OUVIR", ringbox:"ABRIR" };
  $("#actionLabel").textContent = action ? shortLabels[action.type] : "AGIR";
  if (action) $("#interactionHint span").textContent = action.label;
}

function interact() {
  const action = state.nearAction;
  if (!action) {
    say("Ainda não é aqui. Procure algo brilhando — o brilho é nosso método científico oficial.");
    tone(190, 0.12, "square", 0.018);
    return;
  }
  if (navigator.vibrate) navigator.vibrate(14);
  if (action.type === "clue") collectClue(action.index);
  if (action.type === "note") collectSecretNote(action.index);
  if (action.type === "glyph") collectGlyph(action.index);
  if (action.type === "portal1") transitionTo(1);
  if (action.type === "portal2") transitionTo(2);
  if (action.type === "portal3") transitionTo(3);
  if (action.type === "telescope") openConstellationMission();
  if (action.type === "console") openPhraseMission();
  if (action.type === "starflight") state.flightDone ? transitionTo(6) : openStarFlight();
  if (action.type === "bloom") collectBloom(action.index);
  if (action.type === "ringbox") openFinale();
}

function collectGlyph(index){
  if(state.glyphs[index])return;
  state.glyphs[index]=true;const glyph=mysteryGlyphs[index];state.emote={icon:glyph.symbol,until:performance.now()+1400};
  showToast(`SÍMBOLO OCULTO ${state.glyphs.filter(Boolean).length}/3`,glyph.name,glyph.symbol);say(glyph.clue,"TRANSMISSÃO QUE NÃO DEVERIA EXISTIR");emitHudUpdate();
  if(state.glyphs.every(Boolean))setTimeout(()=>{say("Os três símbolos abriram uma frequência secreta no mapa galáctico. Isso definitivamente não estava no manual.");setTimeout(openCipherMission,1450);},1700);
}

function collectBloom(index){
  if(state.blooms[index])return;
  state.blooms[index]=true;state.bloomCount+=1;state.emote={icon:"✦",until:performance.now()+1200};
  tone(430+index*140,.3,"sine",.045);say(memoryBlooms[index].line,`FLOR-MEMÓRIA ${index+1}/3 · ${memoryBlooms[index].word}`);
  if(state.bloomCount===3){showAchievement(5,"Tudo que ainda quero viver");setTimeout(()=>say("As três memórias apontaram para uma estrela no alto do planeta. Rebeca… acho que ela é uma caixinha."),1800);}
}

function collectSecretNote(index) {
  if (state.secretNotes[index]) return;
  state.secretNotes[index] = true;
  const note = secretNotes[index];
  state.emote = { icon:"✉", until:performance.now()+1300 };
  say(note.text, note.title);
  updateHud();
  successChime();
  if (navigator.vibrate) navigator.vibrate([12,35,12]);
}

function collectClue(index) {
  if (state.clues[index]) return;
  state.clues[index] = true;
  state.clueCount += 1;
  state.emote = { icon: clues[index].icon, until: performance.now() + 1150 };
  tone(480 + index * 100, 0.18, "triangle", 0.045);
  say(clues[index].text, "ARQUIVO DA PRAÇA · PISTA ENCONTRADA");
  updateHud();
  if (state.clueCount === 3) {
    showAchievement(0, "O sinal que encontrou Rebeca");
    setTimeout(() => say("Os três sinais formaram um portal no lado direito da estação. O universo definitivamente sabe o seu nome."), 1800);
  }
}

// Canvas world
function roundedRect(x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function pixelRect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawTree(x, y, scale = 1, colors = ["#3d956d", "#285d57"]) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(scale, scale);
  pixelRect(-38, 38, 76, 10, "rgba(20,20,35,.18)");
  pixelRect(-27, 45, 54, 6, "rgba(20,20,35,.11)");
  pixelRect(-11, -3, 22, 52, "#4b2f32");
  pixelRect(-7, 0, 14, 48, "#825443");
  pixelRect(-4, 3, 5, 39, "#a87252");
  pixelRect(-42, -34, 84, 48, colors[1]);
  pixelRect(-33, -50, 66, 72, colors[1]);
  pixelRect(-20, -63, 42, 18, colors[1]);
  pixelRect(-37, -40, 66, 43, colors[0]);
  pixelRect(-25, -55, 50, 31, colors[0]);
  pixelRect(-15, -58, 19, 8, "rgba(255,255,255,.13)");
  pixelRect(-31, -34, 12, 8, "rgba(255,255,255,.09)");
  pixelRect(24, -23, 12, 18, colors[1]);
  ctx.restore();
}

function drawFlower(x, y, color = "#ff7d91") {
  pixelRect(x - 1, y + 10, 3, 14, "#39755b");
  pixelRect(x - 8, y + 5, 7, 7, color); pixelRect(x + 2, y + 5, 7, 7, color);
  pixelRect(x - 4, y + 1, 9, 7, color); pixelRect(x - 4, y + 10, 9, 7, color);
  pixelRect(x - 2, y + 7, 5, 5, "#ffd45c");
  pixelRect(x - 6, y + 18, 5, 3, "#4a8d63"); pixelRect(x + 2, y + 15, 5, 3, "#4a8d63");
}

function drawGlow(x, y, color = "#ffd05a", size = 50) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
  glow.addColorStop(0, color + "a8"); glow.addColorStop(1, color + "00");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
}

function drawPortal(x, y, color = "#ffd05a") {
  const pulse = Math.sin(performance.now()/260)>0 ? 3 : 0;
  drawGlow(x,y,color,88+pulse);
  const parts=[[-20,-70,40,8],[-32,-62,12,12],[20,-62,12,12],[-40,-50,10,34],[30,-50,10,34],[-44,-16,9,34],[35,-16,9,34],[-40,18,10,34],[30,18,10,34],[-32,52,12,12],[20,52,12,12],[-20,64,40,8]];
  parts.forEach(([px,py,w,h])=>pixelRect(x+px,y+py,w,h,color));
  parts.slice(1,-1).forEach(([px,py,w,h])=>pixelRect(x+px+(px<0?4:-4),y+py+(py<0?4:-4),Math.max(3,w-5),Math.max(3,h-5),"rgba(255,255,255,.7)"));
  pixelRect(x-3,y-82-pulse,6,6,"#fff4cb");pixelRect(x+44+pulse,y-4,5,5,"#fff4cb");pixelRect(x-48-pulse,y+9,5,5,"#fff4cb");
}

function drawGroundTiles(base, light, dark, tile = 30) {
  pixelRect(0,0,900,600,base);
  for(let y=0;y<600;y+=tile){for(let x=0;x<900;x+=tile){if((x/tile+y/tile)%5===0)pixelRect(x,y,tile,tile,light);else if((x/tile*3+y/tile)%11===0)pixelRect(x,y,tile,tile,dark);}}
}

function drawPixelFlowerPatch(x,y,colors=["#ef6680","#ffd166","#f7e7bd"]){for(let i=0;i<6;i++)drawFlower(x+(i%3)*24,y+Math.floor(i/3)*25,colors[i%colors.length]);}

function drawScene() {
  if (state.scene === 0) drawPlaza();
  if (state.scene === 1) drawLaughPlanet();
  if (state.scene === 2) drawForest();
  if (state.scene === 3) drawObservatory();
  if (state.scene === 4) drawArchive();
  if (state.scene === 5) drawAsteroidBelt();
  if (state.scene === 6) drawGarden();
}

function drawPlaza() {
  drawGroundTiles("#79b96f","#83c476","#6aa665",30);
  // Tile path, intentionally stepped instead of vector-smooth.
  for(let y=0;y<600;y+=30){const half=74+Math.floor(y/120)*12;pixelRect(450-half,y,half*2,30,(y/30)%2?"#dfb77b":"#e7c486");pixelRect(450-half,y,6,30,"#c99a68");pixelRect(450+half-6,y,6,30,"#c99a68");}
  // Little cottage at the top of the plaza.
  pixelRect(365,0,170,70,"#5b3540");pixelRect(345,0,210,24,"#713d47");pixelRect(365,24,170,10,"#a75b4b");pixelRect(382,34,136,61,"#e8b66f");pixelRect(395,43,34,30,"#88c4cb");pixelRect(471,42,32,53,"#70433d");pixelRect(479,53,5,5,"#ffd86d");pixelRect(390,78,45,8,"#9a5c47");
  [[75,145],[825,145],[95,445],[815,470],[280,105],[640,105]].forEach(([x,y],i)=>drawTree(x,y,i%2?.82:1));
  drawPixelFlowerPatch(120,480);drawPixelFlowerPatch(690,490,["#a995ef","#ffcf66","#ef718b"]);
  // Pixel bench.
  pixelRect(45,260,150,65,"#4c2e32");pixelRect(54,269,132,13,"#b56d49");pixelRect(54,290,132,12,"#9d583f");pixelRect(64,302,12,24,"#5d3833");pixelRect(165,302,12,24,"#5d3833");
  // Stepped pond with animated highlights.
  pixelRect(650,350,190,90,"#486f78");pixelRect(630,370,230,50,"#486f78");pixelRect(660,340,160,110,"#73bdc3");pixelRect(640,370,200,50,"#73bdc3");const shimmer=Math.floor(performance.now()/300)%3;pixelRect(680+shimmer*15,372,54,5,"#b9e4d9");pixelRect(755-shimmer*9,410,45,4,"#8fd3cf");
  clues.forEach((clue,index)=>{if(!state.clues[index]){drawGlow(clue.x,clue.y,"#ffd05a",45);pixelRect(clue.x-25,clue.y-25,50,50,"#342334");pixelRect(clue.x-21,clue.y-21,42,42,"#fff0bc");ctx.fillStyle="#d84b67";ctx.font="700 24px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText(clue.icon,clue.x,clue.y+8);pixelRect(clue.x-18,clue.y+31,36,12,"#5b3542");ctx.fillStyle="#ffe6a3";ctx.font="700 8px 'Pixelify Sans'";ctx.fillText("PISTA",clue.x,clue.y+40);}});
  if(state.clueCount===3) drawPortal(820,300,"#ffd05a");
}

function drawForest() {
  drawGroundTiles("#24443f","#294e46","#1f3b3b",30);
  // Moonlit trail through the forest.
  for(let y=60;y<600;y+=30){const offset=Math.round(Math.sin(y/85)*24);pixelRect(355+offset,y,190,30,(y/30)%2?"#31574c":"#2d5148");}
  [[65,145],[165,90],[285,125],[625,115],[735,95],[845,155],[85,470],[810,480]].forEach(([x,y],i)=>drawTree(x,y,i%2?.95:1.15,["#315d50","#152f36"]));
  // Mushrooms and fern tiles.
  for(let i=0;i<16;i++){const x=(i*83+55)%850,y=170+((i*117)%370);pixelRect(x,y,4,15,"#56866b");pixelRect(x-8,y-3,10,4,"#6ea27c");pixelRect(x+3,y-8,11,4,"#4d8069");if(i%4===0){pixelRect(x+15,y+7,14,6,"#e76b72");pixelRect(x+19,y+13,6,7,"#f2d0a0");pixelRect(x+17,y+8,3,2,"#fff0bb");}}
  fireflies.forEach((heart)=>{if(heart.caught)return;const y=heart.y+Math.sin(heart.phase)*8;drawGlow(heart.x,y,"#ff5e8b",42);pixelRect(heart.x-11,y-8,9,9,"#ef4c73");pixelRect(heart.x+2,y-8,9,9,"#ef4c73");pixelRect(heart.x-7,y+1,14,9,"#ef4c73");pixelRect(heart.x-3,y+10,6,5,"#ef4c73");pixelRect(heart.x-5,y-5,4,3,"#ff91a8");});
  if(state.heartsCaught===7){drawPortal(450,90,"#76d9b3");ctx.fillStyle="#b9f0ce";ctx.font="700 11px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText("PORTÃO DE RAÍZES",450,180);}
}

function drawLaughPlanet(){
  drawGroundTiles("#7657a6","#8262b5","#674c91",30);
  const time=performance.now()/650;
  // Crateras quadradas e terreno alienígena com cara de feito à mão.
  [[95,160,62],[780,155,76],[185,435,86],[720,445,58],[530,335,44]].forEach(([x,y,s],i)=>{
    pixelRect(x-s/2,y-s/3,s,s*.55,"#503c79");pixelRect(x-s/2+7,y-s/3+7,s-14,s*.55-14,"#62488f");pixelRect(x-s/2+13,y-s/3+10,s*.42,5,"rgba(255,255,255,.1)");
  });
  // Plantas antena e cogumelos que dançam em dois frames.
  for(let i=0;i<15;i++){const x=45+(i*67)%830,y=110+(i*113)%430,bob=Math.sin(time+i)>.25?3:0;pixelRect(x,y,5,28,"#63c69e");pixelRect(x-8,y-5-bob,21,8,i%2?"#ff7da0":"#ffd166");pixelRect(x-4,y-11-bob,13,7,i%2?"#ff9bb5":"#ffe29a");}
  pixelRect(350,20,200,55,"#2a2144");pixelRect(370,38,160,65,"#bc6c7f");pixelRect(386,48,128,42,"#f3bb82");pixelRect(411,61,78,16,"#3f2b4a");ctx.fillStyle="#fff1bd";ctx.font="700 12px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText("RISO-47 · população: kkkkk",450,72);
  laughOrbs.forEach((orb,index)=>{if(orb.caught)return;const y=orb.y+Math.sin(orb.phase)*10;drawGlow(orb.x,y,"#ffd05a",38);pixelRect(orb.x-15,y-13,30,25,"#30233f");pixelRect(orb.x-12,y-10,24,19,index%2?"#ff718d":"#ffd05a");pixelRect(orb.x-7,y-4,4,4,"#30233f");pixelRect(orb.x+4,y-4,4,4,"#30233f");pixelRect(orb.x-5,y+4,10,3,"#30233f");pixelRect(orb.x-18,y+13,8,5,"#30233f");pixelRect(orb.x+10,y+13,8,5,"#30233f");});
  if(state.laughsCaught===7)drawPortal(450,105,"#ffd05a");
}

function drawObservatory() {
  pixelRect(0,0,900,410,"#17152d");pixelRect(0,250,900,160,"#242044");
  // Stepped moon.
  pixelRect(95,55,70,90,"#ffd476");pixelRect(75,75,110,50,"#ffd476");pixelRect(105,45,50,110,"#ffd476");pixelRect(130,55,45,45,"#17152d");pixelRect(145,70,45,50,"#17152d");
  for(let i=0;i<70;i++){const x=(i*137)%900,y=(i*83)%330,s=2+(i%3)*2;pixelRect(x,y,s,s,i%8===0?"#ffd05a":"rgba(255,255,255,.78)");}
  // Pixel city skyline.
  for(let i=0;i<12;i++){const h=45+(i*31)%115,x=i*82;pixelRect(x,410-h,74,h,"#292646");pixelRect(x+8,410-h-10,56,10,"#292646");for(let w=0;w<3;w++)pixelRect(x+12+w*19,430-h,8,11,(i+w)%3===0?"#ffd05a":"#403b63");}
  // Terrace tiles begin at y=410.
  pixelRect(0,410,900,190,"#514b70");for(let y=410;y<600;y+=45){for(let x=0;x<900;x+=60){pixelRect(x,y,58,43,(x/60+y/45)%2?"#565074":"#4b4669");pixelRect(x,y,58,3,"#6d6689");}}
  // Hand-built pixel telescope.
  drawGlow(700,195,"#a99af4",62);pixelRect(640,175,115,38,"#211a35");pixelRect(646,180,102,28,"#9a8be7");pixelRect(655,184,72,20,"#6d61ae");pixelRect(738,170,22,48,"#211a35");pixelRect(742,177,14,34,"#d5d0ff");pixelRect(688,210,20,42,"#211a35");pixelRect(694,215,8,33,"#b0a5f2");pixelRect(682,245,16,135,"#211a35");pixelRect(714,245,16,135,"#211a35");pixelRect(665,374,44,9,"#211a35");pixelRect(704,374,44,9,"#211a35");
  pixelRect(80,332,190,78,"#211a35");pixelRect(87,339,176,64,"#3b365d");pixelRect(100,352,148,8,"#ffd05a");pixelRect(100,370,92,6,"#76d9b3");ctx.fillStyle="#fff0bd";ctx.font="700 12px 'Pixelify Sans'";ctx.textAlign="left";ctx.fillText("OBSERVATÓRIO · R-06",100,394);
}

function drawArchive() {
  drawGroundTiles("#1b3040","#203848","#172a39",45);
  for(let x=0;x<900;x+=45)pixelRect(x,0,2,600,"rgba(118,217,179,.08)");for(let y=0;y<600;y+=45)pixelRect(0,y,900,2,"rgba(118,217,179,.08)");
  // Archive cabinets with blinking data strips.
  for(let i=0;i<5;i++){const x=35+i*174;pixelRect(x,65,150,115,"#102332");pixelRect(x+5,70,140,105,"#294759");pixelRect(x+15,86,112,7,i%2?"#ef4f78":"#76d9b3");pixelRect(x+15,106,95,4,"#7694a0");pixelRect(x+15,120,120,4,"#526f7d");pixelRect(x+15,134,72,4,"#526f7d");pixelRect(x+126,151,8,8,Math.floor(performance.now()/350+i)%2?"#ffd05a":"#573848");}
  // Main future console.
  drawGlow(450,225,"#76d9b3",100);pixelRect(315,155,270,145,"#102130");pixelRect(323,163,254,129,"#2a4a5c");pixelRect(345,187,210,67,"#091722");pixelRect(352,194,196,53,"#16323d");pixelRect(365,210,170,6,"#76d9b3");pixelRect(365,229,120,5,"#51798a");pixelRect(430,266,40,18,"#102130");pixelRect(443,270,14,10,"#ef4f78");ctx.fillStyle="#a7f0d3";ctx.font="700 18px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText(state.phraseDone?"ACESSO LIBERADO":"FUTURO BLOQUEADO",450,205);
  pixelRect(95,405,210,65,"#112331");pixelRect(102,412,196,51,"#304e60");pixelRect(595,405,210,65,"#112331");pixelRect(602,412,196,51,"#304e60");ctx.fillStyle="#a9c4c5";ctx.font="700 11px 'Pixelify Sans'";ctx.fillText("ARQUIVOS DE POSSIBILIDADES",200,443);ctx.fillText("MEMÓRIAS AINDA NÃO VIVIDAS",700,443);
}

function drawAsteroidBelt(){
  pixelRect(0,0,900,600,"#100d24");
  for(let i=0;i<95;i++){const x=(i*157)%900,y=(i*89)%600,s=2+(i%3);pixelRect(x,y,s,s,i%9===0?"#ffd77c":"rgba(230,225,255,.65)");}
  const t=performance.now()/1000;
  for(let i=0;i<14;i++){const x=((i*93-t*(18+i%4*6))%980+980)%980-40,y=80+(i*137)%460,s=24+(i*17)%52;pixelRect(x-s/2,y-s/3,s,s*.66,"#393451");pixelRect(x-s/2+7,y-s/3-6,s*.48,8,"#5f5874");pixelRect(x+s*.1,y-s*.1,s*.22,s*.18,"#26233b");}
  drawGlow(450,255,"#76d9b3",115);pixelRect(335,190,230,105,"#22203a");pixelRect(350,205,200,75,"#4f5374");pixelRect(370,225,160,35,"#13172e");pixelRect(385,236,45,8,"#76d9b3");pixelRect(438,236,75,8,"#ff6686");pixelRect(422,295,56,28,"#22203a");pixelRect(434,303,32,12,state.flightDone?"#76d9b3":"#ffd05a");ctx.fillStyle="#fff0bd";ctx.font="700 14px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText(state.flightDone?"ROTA ABERTA · 7º MUNDO":"NAVE PINGO-1 · TOQUE PARA PILOTAR",450,180);
  pixelRect(60,390,150,75,"#23213c");pixelRect(70,400,130,55,"#4a4567");pixelRect(83,414,72,7,"#ff6686");pixelRect(83,431,102,5,"#817aa6");pixelRect(690,390,150,75,"#23213c");pixelRect(700,400,130,55,"#4a4567");pixelRect(715,415,100,7,"#76d9b3");pixelRect(715,433,62,5,"#817aa6");
}

function drawGarden() {
  pixelRect(0,0,900,210,"#452f65");pixelRect(0,70,900,140,"#9a5279");pixelRect(0,145,900,65,"#ee9a6d");
  // Dois sóis: este planeta só aceita finais exageradamente bonitos.
  drawGlow(145,78,"#ffd05a",90);pixelRect(112,45,66,66,"#ffd05a");pixelRect(125,32,40,92,"#ffd05a");pixelRect(99,58,92,40,"#ffd05a");
  drawGlow(760,96,"#ff8198",72);pixelRect(735,71,50,50,"#ff8198");pixelRect(745,61,30,70,"#ff8198");pixelRect(725,81,70,30,"#ff8198");
  pixelRect(0,210,900,390,"#4f845d");for(let y=210;y<600;y+=30){for(let x=0;x<900;x+=30){if((x/30+y/30)%5===0)pixelRect(x,y,30,30,"#588f62");else if((x/30*3+y/30)%11===0)pixelRect(x,y,30,30,"#467653");}}
  // Pixel perspective path, built as stacked tile strips.
  for(let y=120;y<600;y+=30){const width=80+Math.floor((y-120)/30)*13;const x=450-width/2;pixelRect(x,y,width,30,(y/30)%2?"#f3d89b":"#ead090");pixelRect(x,y,5,30,"#c59d72");pixelRect(x+width-5,y,5,30,"#c59d72");}
  [[80,135],[185,175],[715,175],[820,135],[105,445],[795,445]].forEach(([x,y],i)=>drawTree(x,y,i<4?.95:1.1,["#4f805c","#2d574d"]));
  for(let i=0;i<30;i++){const side=i%2?-1:1,x=450+side*(95+(i*43)%280),y=150+(i*67)%430;drawFlower(x,y,["#ff6686","#ffd05a","#fff0bd","#a99af4"][i%4]);}
  // Lantern aisle.
  for(let i=0;i<6;i++){const y=185+i*70;[335,565].forEach(x=>{pixelRect(x-4,y,9,45,"#533640");pixelRect(x-11,y-8,23,18,"#533640");pixelRect(x-7,y-4,15,10,"#ffd36c");drawGlow(x,y,"#ffd05a",24);});}
  memoryBlooms.forEach((bloom,index)=>{if(state.blooms[index])return;const pulse=Math.sin(performance.now()/240+index)*5;drawGlow(bloom.x,bloom.y,"#a99af4",42+pulse);pixelRect(bloom.x-4,bloom.y+8,8,24,"#2f6f5d");pixelRect(bloom.x-18,bloom.y-10,15,18,"#a99af4");pixelRect(bloom.x+3,bloom.y-10,15,18,"#ff8ca0");pixelRect(bloom.x-8,bloom.y-22,16,20,"#ffd77c");pixelRect(bloom.x-6,bloom.y-5,12,12,"#fff4c9");ctx.fillStyle="#fff1c8";ctx.font="700 9px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText("MEMÓRIA",bloom.x,bloom.y+44);});
  // The final box is deliberately tiny until the cinematic.
  if(state.bloomCount===3){drawGlow(450,112,"#ffd05a",90);pixelRect(399,84,102,31,"#352334");pixelRect(405,90,90,22,"#ff735f");pixelRect(410,112,80,46,"#352334");pixelRect(416,118,68,34,"#e74867");pixelRect(444,120,12,10,"#ffd05a");ctx.fillStyle="#55333f";ctx.font="700 9px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText("PARA REBECA",450,174);}else{pixelRect(420,88,60,58,"#352334");pixelRect(428,96,44,42,"#5b4568");pixelRect(446,105,8,18,"#ffd05a");ctx.fillStyle="#ffe8ac";ctx.font="700 8px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText(`${state.bloomCount}/3 MEMÓRIAS`,450,162);}
}

function drawPlayerLegacy() {
  const p = state.player;
  const frame = p.moving ? Math.floor(p.step) % 2 : 0;
  const bob = p.moving ? (frame ? -2 : 0) : 0;
  const stride = p.moving ? (frame ? 1 : -1) : 0;
  const palette = { outline:"#201827", hair:"#302130", hairHi:"#51364b", skin:"#d58e67", skinHi:"#e8ad82", skinShade:"#a85e50", jacket:"#3978a5", jacketHi:"#5fa0c7", jacketDark:"#24516f", shirt:"#f8e4c0", pants:"#29394f", shoes:"#171925", pink:"#ef466f" };

  ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y + bob));
  pixelRect(-25, 4, 50, 6, "rgba(20,15,35,.2)");
  pixelRect(-17, 9, 34, 4, "rgba(20,15,35,.12)");
  ctx.scale(4, 4);

  // Legs and boots: two-frame walk cycle.
  pixelRect(-6 + stride, -7, 5, 8, palette.outline); pixelRect(1 - stride, -7, 5, 8, palette.outline);
  pixelRect(-5 + stride, -7, 3, 5, palette.pants); pixelRect(2 - stride, -7, 3, 5, palette.pants);
  pixelRect(-6 + stride, -2, 5, 3, palette.shoes); pixelRect(1 - stride, -2, 5, 3, palette.shoes);
  pixelRect(-5 + stride, -2, 2, 1, "#4d5362"); pixelRect(2 - stride, -2, 2, 1, "#4d5362");

  // Arms sit behind the jacket and swing in opposite directions.
  pixelRect(-10, -17 + stride, 4, 11, palette.outline); pixelRect(6, -17 - stride, 4, 11, palette.outline);
  pixelRect(-9, -16 + stride, 3, 8, palette.jacketDark); pixelRect(6, -16 - stride, 3, 8, palette.jacketDark);
  pixelRect(-9, -8 + stride, 3, 3, palette.skin); pixelRect(6, -8 - stride, 3, 3, palette.skin);

  // Denim jacket with tiny heart shirt.
  pixelRect(-8, -19, 16, 13, palette.outline);
  pixelRect(-7, -18, 14, 11, palette.jacket);
  pixelRect(-6, -17, 4, 9, palette.jacketHi);
  pixelRect(-1, -17, 4, 8, palette.shirt);
  pixelRect(-1, -14, 1, 2, palette.pink); pixelRect(1, -14, 1, 2, palette.pink); pixelRect(0, -13, 1, 2, palette.pink);
  pixelRect(-7, -8, 14, 2, palette.jacketDark);
  pixelRect(-6, -17, 2, 1, "#c6dcde"); pixelRect(5, -17, 1, 1, "#c6dcde");

  // Head and ears.
  pixelRect(-8, -30, 16, 13, palette.outline);
  pixelRect(-7, -29, 14, 11, palette.skin);
  pixelRect(-6, -28, 3, 8, palette.skinHi);
  pixelRect(-9, -26, 2, 5, palette.outline); pixelRect(7, -26, 2, 5, palette.outline);
  pixelRect(-8, -25, 1, 3, palette.skinShade); pixelRect(7, -25, 1, 3, palette.skinShade);

  if (p.dir === "up") {
    pixelRect(-8, -31, 16, 8, palette.hair);
    pixelRect(-7, -30, 6, 3, palette.hairHi);
    pixelRect(-8, -25, 3, 8, palette.hair); pixelRect(5, -25, 3, 8, palette.hair);
  } else if (p.dir === "left" || p.dir === "right") {
    const flip = p.dir === "left" ? -1 : 1;
    pixelRect(-8, -31, 16, 7, palette.hair);
    pixelRect(-7, -30, 7, 2, palette.hairHi);
    pixelRect(flip > 0 ? 5 : -8, -26, 3, 8, palette.hair);
    pixelRect(flip > 0 ? 2 : -4, -24, 2, 2, palette.outline);
    pixelRect(flip > 0 ? 6 : -7, -22, 2, 1, palette.skinShade);
    pixelRect(flip > 0 ? 2 : -3, -20, 3, 1, palette.outline);
  } else {
    pixelRect(-8, -31, 16, 7, palette.hair);
    pixelRect(-7, -30, 7, 2, palette.hairHi);
    pixelRect(-8, -26, 3, 7, palette.hair); pixelRect(5, -26, 3, 7, palette.hair);
    pixelRect(-4, -24, 2, 2, palette.outline); pixelRect(2, -24, 2, 2, palette.outline);
    pixelRect(-4, -25, 2, 1, palette.hair); pixelRect(2, -25, 2, 1, palette.hair);
    pixelRect(-1, -20, 3, 1, palette.outline);
    pixelRect(-2, -21, 1, 1, palette.skinHi);
  }
  ctx.restore();
}

function spriteRect(target,x,y,width,height,color){target.fillStyle=color;target.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));}

function drawExplorerSprite(target,x,y,scale,direction="down",frame=0,variant="rebeca",suited=false,shadow=true){
  const rebeca=variant==="rebeca",up=direction.startsWith("up"),left=direction.includes("left"),right=direction.includes("right"),side=direction==="left"||direction==="right";
  const walk=[0,1,0,-1][frame%4],bob=frame%2?-1:0,faceShift=left?-1:right?1:0;
  const c=rebeca
    ?{o:"#211827",hair:"#302038",hairHi:"#67405f",skin:"#d58e67",skinHi:"#efb38a",jacket:"#657ec5",jacketHi:"#8ca6e5",jacketDark:"#3d4f8e",shirt:"#fff0ce",pants:"#2d3654",shoe:"#171925",accent:"#ef466f"}
    :{o:"#211827",hair:"#362526",hairHi:"#68473e",skin:"#c9825e",skinHi:"#e6aa7d",jacket:"#398e83",jacketHi:"#6bc1a8",jacketDark:"#24635f",shirt:"#fff0ce",pants:"#30394d",shoe:"#171925",accent:"#ffd05a"};
  target.save();target.imageSmoothingEnabled=false;
  if(shadow){target.fillStyle="rgba(15,10,30,.22)";target.fillRect(x-25,y+5,50,7);target.fillStyle="rgba(15,10,30,.12)";target.fillRect(x-17,y+12,34,4);}
  target.translate(Math.round(x),Math.round(y+bob));target.scale(scale,scale);
  const diagonal=(left||right)&&(direction.startsWith("up")||direction.startsWith("down")),lean=diagonal?(right?1:-1):0;
  spriteRect(target,-6+walk+lean,-8,5,9,c.o);spriteRect(target,1-walk+lean,-8,5,9,c.o);
  spriteRect(target,-5+walk+lean,-7,3,6,c.pants);spriteRect(target,2-walk+lean,-7,3,6,c.pants);
  spriteRect(target,-7+walk+lean,-2,6,3,c.shoe);spriteRect(target,1-walk+lean,-2,6,3,c.shoe);
  spriteRect(target,-6+walk+lean,-2,2,1,"#667087");spriteRect(target,2-walk+lean,-2,2,1,"#667087");
  if(!(side&&right)){spriteRect(target,-11,-18+walk,5,12,c.o);spriteRect(target,-10,-17+walk,3,8,c.jacketDark);spriteRect(target,-10,-9+walk,3,3,suited?"#d8e8e5":c.skin);}
  if(!(side&&left)){spriteRect(target,6,-18-walk,5,12,c.o);spriteRect(target,7,-17-walk,3,8,c.jacketDark);spriteRect(target,7,-9-walk,3,3,suited?"#d8e8e5":c.skin);}
  spriteRect(target,-8+lean,-20,16,14,c.o);spriteRect(target,-7+lean,-19,14,12,c.jacket);spriteRect(target,-6+lean,-18,4,9,c.jacketHi);spriteRect(target,-2+lean,-18,5,9,c.shirt);spriteRect(target,-7+lean,-9,14,2,c.jacketDark);
  spriteRect(target,-1+lean,-15,1,2,c.accent);spriteRect(target,1+lean,-15,1,2,c.accent);spriteRect(target,0+lean,-14,1,2,c.accent);spriteRect(target,-6+lean,-18,2,1,"#d9eeee");
  if(suited){spriteRect(target,-10,-20,3,12,"#363b63");spriteRect(target,7,-20,3,12,"#222945");spriteRect(target,-10,-34,20,18,c.o);spriteRect(target,-9,-33,18,16,"#dcebec");spriteRect(target,-7,-31,14,12,"#7aa5b5");spriteRect(target,-6,-30,12,10,"#b8d8d5");}
  spriteRect(target,-8+faceShift,-31,16,13,c.o);spriteRect(target,-7+faceShift,-30,14,11,c.skin);spriteRect(target,-6+faceShift,-29,3,8,c.skinHi);
  if(rebeca){spriteRect(target,-9+faceShift,-32,18,7,c.hair);spriteRect(target,-8+faceShift,-31,8,2,c.hairHi);spriteRect(target,-9+faceShift,-27,3,12,c.hair);spriteRect(target,6+faceShift,-27,3,12,c.hair);if(up)spriteRect(target,-6+faceShift,-25,12,9,c.hair);}
  else{spriteRect(target,-8+faceShift,-32,16,7,c.hair);spriteRect(target,-7+faceShift,-31,7,2,c.hairHi);spriteRect(target,5+faceShift,-28,3,6,c.hair);}
  if(!up){if(side){const eyeX=(right?3:-4)+faceShift;spriteRect(target,eyeX,-25,2,2,c.o);spriteRect(target,(right?4:-5)+faceShift,-21,2,1,c.o);}else{spriteRect(target,-4+faceShift,-25,2,2,c.o);spriteRect(target,2+faceShift,-25,2,2,c.o);spriteRect(target,-1+faceShift,-21,3,1,c.o);if(rebeca){spriteRect(target,-6+faceShift,-22,2,1,"#d67776");spriteRect(target,5+faceShift,-22,2,1,"#d67776");}}}
  if(suited){spriteRect(target,-9,-33,18,2,"rgba(255,255,255,.7)");spriteRect(target,-8,-31,2,9,"rgba(255,255,255,.38)");spriteRect(target,-10,-19,20,2,c.o);}
  target.restore();
}

function drawPlayer(){
  const p=state.player,frame=p.moving?Math.floor(p.step)%4:0,suited=[3,4,5].includes(state.scene);
  drawExplorerSprite(ctx,p.x,p.y,4,p.dir,frame,"rebeca",suited,true);
}

function drawPingo() {
  const p = state.pingo, bob = Math.round(Math.sin(performance.now()/260) * 4);
  drawGlow(p.x, p.y + bob, "#ff4f78", 28);
  ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y + bob)); ctx.scale(3,3);
  pixelRect(-6,-5,12,9,"#211827");
  pixelRect(-5,-6,4,2,"#211827"); pixelRect(1,-6,4,2,"#211827");
  pixelRect(-5,-4,10,7,"#ef466f");
  pixelRect(-4,-5,3,2,"#ff7895"); pixelRect(1,-5,3,2,"#ff7895");
  pixelRect(-3,-2,1,1,"#211827"); pixelRect(2,-2,1,1,"#211827");
  pixelRect(-1,1,3,1,"#211827"); pixelRect(-4,3,3,2,"#211827"); pixelRect(1,3,3,2,"#211827");
  ctx.restore();
}

function drawSecretNote() {
  const note = secretNotes[state.scene];
  if (!note || state.secretNotes[state.scene]) return;
  const bounce = Math.round(Math.sin(performance.now()/230) * 3);
  drawGlow(note.x, note.y + bounce, "#ffd05a", 28);
  pixelRect(note.x-14,note.y-10+bounce,28,20,"#3a2432");
  pixelRect(note.x-11,note.y-8+bounce,22,15,"#fff0bb");
  pixelRect(note.x-8,note.y-5+bounce,16,3,"#d97764");
  pixelRect(note.x-5,note.y+1+bounce,10,2,"#d97764");
  pixelRect(note.x-2,note.y-20+bounce,4,4,"#ffd05a");
  pixelRect(note.x-7,note.y-17+bounce,3,3,"#fff0bb");
}

function drawMysteryGlyph(){
  const index=mysteryGlyphs.findIndex(glyph=>glyph.scene===state.scene),glyph=mysteryGlyphs[index];
  if(!glyph||state.glyphs[index])return;
  const pulse=Math.sin(performance.now()/180)*3;drawGlow(glyph.x,glyph.y,"#a99af4",24+pulse);
  pixelRect(glyph.x-13,glyph.y-13,26,26,"rgba(18,13,38,.82)");pixelRect(glyph.x-10,glyph.y-10,20,20,"#5a4778");pixelRect(glyph.x-7,glyph.y-7,14,14,"#261d3d");
  ctx.fillStyle="#d9caff";ctx.font="700 13px 'Pixelify Sans'";ctx.textAlign="center";ctx.fillText(glyph.symbol,glyph.x,glyph.y+5);
  if(Math.floor(performance.now()/520)%2)pixelRect(glyph.x-2,glyph.y-22,4,4,"#fff0bd");
}

function drawAmbientWorld() {
  const time = performance.now()/1000;
  if (state.scene === 0) {
    for(let i=0;i<9;i++){const x=(i*137+time*(14+i%3*4))%940-20;const y=90+((i*73)%420)+Math.sin(time*2+i)*9;const color=i%2?"#fff0a8":"#ef6c86";pixelRect(x,y,5,3,color);pixelRect(x+5,y-3,4,3,color);}
  } else if (state.scene === 1) {
    for(let i=0;i<18;i++){const x=(i*89+Math.sin(time+i)*25)%880+10;const y=70+((i*53-time*(10+i%4))%500+500)%500;pixelRect(x,y,3,3,i%3?"rgba(118,217,179,.45)":"rgba(255,208,90,.65)");}
  } else if (state.scene === 3) {
    const sx=860-(time*44)%1050,sy=70+(time*22)%270;pixelRect(sx,sy,22,3,"rgba(255,240,190,.75)");pixelRect(sx+22,sy-3,5,5,"#fff7d5");
  } else if (state.scene === 4) {
    for(let i=0;i<13;i++){const x=35+(i*71)%840,y=((time*(24+i%4*6)+i*91)%560);pixelRect(x,y,3,10,i%3?"rgba(118,217,179,.32)":"rgba(255,79,120,.35)");}
  } else if (state.scene === 6) {
    for(let i=0;i<14;i++){const x=(i*97+time*(12+i%4*3))%940-20,y=80+((i*61+time*18)%480);pixelRect(x,y,6,4,["#ff8ca0","#ffd77c","#fff0c9"][i%3]);pixelRect(x+4,y+4,3,3,"rgba(255,255,255,.4)");}
  }
}

function drawGameEffects() {
  dustParticles.forEach((particle) => {
    const alpha = Math.max(0, particle.life / .48);
    pixelRect(particle.x, particle.y, particle.size, particle.size, `rgba(255,240,205,${alpha * .45})`);
  });
  if (state.tapMarker && performance.now() - state.tapMarker.born < 900) {
    const age = (performance.now() - state.tapMarker.born) / 900;
    const size = 18 + age * 15, x = state.tapMarker.x, y = state.tapMarker.y;
    const color = `rgba(255,208,90,${1-age})`;
    pixelRect(x-size,y-size,10,3,color); pixelRect(x-size,y-size,3,10,color);
    pixelRect(x+size-10,y-size,10,3,color); pixelRect(x+size-3,y-size,3,10,color);
    pixelRect(x-size,y+size-3,10,3,color); pixelRect(x-size,y+size-10,3,10,color);
    pixelRect(x+size-10,y+size-3,10,3,color); pixelRect(x+size-3,y+size-10,3,10,color);
  }
}

function drawPlayerEmote() {
  if (!state.emote || performance.now() > state.emote.until) return;
  const x = state.player.x + 23, y = state.player.y - 102;
  pixelRect(x-18,y-17,36,29,"#211827"); pixelRect(x-15,y-14,30,22,"#fff7e8");
  pixelRect(x-8,y+8,8,7,"#211827"); pixelRect(x-7,y+8,6,5,"#fff7e8");
  ctx.fillStyle="#ef466f";ctx.font="bold 18px ui-monospace,monospace";ctx.textAlign="center";ctx.fillText(state.emote.icon,x,y+4);
}

function render() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,900,600);
  drawScene();
  drawAmbientWorld();
  drawSecretNote();
  drawMysteryGlyph();
  drawGameEffects();
  drawPingo();
  drawPlayer();
  drawPlayerEmote();
}

function gameLoop(now) {
  const delta=Math.min(.035,(now-lastTime)/1000);lastTime=now;update(delta);if(state.running)render();requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// Constellation mission
function openConstellationMission() {
  if (state.constellationDone) return transitionTo(4);
  storyContent.innerHTML = `
    <div class="modal-mission-tag">MISSÃO 04 · CARTOGRAFIA CELESTIAL</div>
    <h2>A constelação de<br /><em>Rebeca</em></h2>
    <p class="modal-copy">As estrelas vão piscar em uma ordem. Memorize a rota e repita tocando nelas — o céu está literalmente tentando soletrar alguma coisa.</p>
    <div class="stars-board" id="starsBoard"></div>
    <div class="sequence-progress" id="sequenceProgress">${"<i></i>".repeat(6)}</div>
    <p class="puzzle-feedback" id="starFeedback">pronta para observar?</p>
    <button class="modal-main-button" id="watchStars" type="button">mostrar a sequência ✦</button>`;
  const positions=[[20,68],[43,28],[70,63],[80,31],[48,78],[24,35]];
  const board=$("#starsBoard");
  positions.forEach(([x,y],index)=>{const button=document.createElement("button");button.className="star-node";button.type="button";button.dataset.star=index;button.style.left=`${x}%`;button.style.top=`${y}%`;button.textContent="✦";board.append(button);});
  $("#watchStars").addEventListener("click", runStarSequence, { once:true });
  storyModal.showModal();
}

function runStarSequence() {
  const order=[1,5,0,4,2,3];let demoIndex=0;
  $("#watchStars").disabled=true;$("#watchStars").textContent="olhe para o céu…";$("#starFeedback").textContent="memorize a rota";
  const nodes=[...document.querySelectorAll(".star-node")];
  const interval=setInterval(()=>{nodes.forEach(n=>n.classList.remove("demo"));if(demoIndex>=order.length){clearInterval(interval);setTimeout(()=>enableStarInput(order),350);return;}nodes[order[demoIndex]].classList.add("demo");tone(420+demoIndex*70,.18,"sine",.035);demoIndex+=1;},620);
}

function enableStarInput(order) {
  document.querySelectorAll(".star-node").forEach(n=>n.classList.remove("demo"));
  $("#starFeedback").textContent="agora repita a sequência";$("#watchStars").style.display="none";
  let inputIndex=0;
  document.querySelectorAll(".star-node").forEach((node)=>node.addEventListener("click",()=>{
    const value=Number(node.dataset.star);
    if(value===order[inputIndex]){
      node.classList.add("correct");document.querySelectorAll("#sequenceProgress i")[inputIndex].classList.add("on");
      if(inputIndex>0)drawConstellationLine(order[inputIndex-1],value);tone(550+inputIndex*65,.2,"sine",.04);inputIndex+=1;
      if(inputIndex===order.length){state.constellationDone=true;$("#starFeedback").textContent="o céu escreveu: R E B E C A ✦";showAchievement(3,"A luz que leva seu nome");setTimeout(()=>{storyModal.close();transitionTo(4,500);},1900);}
    }else{
      tone(160,.2,"square",.02);$("#starFeedback").textContent="as estrelas se confundiram — comece de novo";inputIndex=0;document.querySelectorAll(".star-node").forEach(n=>n.classList.remove("correct"));document.querySelectorAll("#sequenceProgress i").forEach(i=>i.classList.remove("on"));document.querySelectorAll(".constellation-line").forEach(l=>l.remove());
    }
  }));
}

function drawConstellationLine(from,to){const nodes=[...document.querySelectorAll(".star-node")],board=$("#starsBoard"),a=nodes[from],b=nodes[to];const x1=a.offsetLeft,y1=a.offsetTop,x2=b.offsetLeft,y2=b.offsetTop,len=Math.hypot(x2-x1,y2-y1),angle=Math.atan2(y2-y1,x2-x1)*180/Math.PI;const line=document.createElement("i");line.className="constellation-line";line.style.left=`${x1}px`;line.style.top=`${y1}px`;line.style.width=`${len}px`;line.style.transform=`rotate(${angle}deg)`;board.append(line);}

// Phrase mission
function openPhraseMission() {
  if(state.phraseDone)return transitionTo(5);
  const words=["VOCÊ","FAVORITO.","REBECA,","LUGAR","MEU","É"];
  storyContent.innerHTML=`
    <div class="modal-mission-tag">MISSÃO 05 · ARQUIVO DO FUTURO</div>
    <h2>Decodifique o<br /><em>amanhã</em></h2>
    <p class="modal-copy">O arquivo só abre com uma frase verdadeira. Toque nas palavras na ordem certa — sem pressão, é apenas o futuro inteiro.</p>
    <div class="puzzle-screen"><div class="phrase-slot" id="phraseSlot">a mensagem aparecerá aqui</div><div class="word-bank" id="wordBank"></div><div class="decode-meter" id="decodeMeter">${"<i></i>".repeat(6)}</div><div class="puzzle-feedback" id="phraseFeedback">arquivo criptografado</div></div>`;
  words.forEach(word=>{const button=document.createElement("button");button.className="word-tile";button.type="button";button.textContent=word;button.dataset.word=word;button.addEventListener("click",()=>chooseWord(button));$("#wordBank").append(button);});
  storyModal.showModal();
}

let phraseIndex=0;
const phraseAnswer=["REBECA,","VOCÊ","É","MEU","LUGAR","FAVORITO."];
function chooseWord(button){
  if(phraseIndex===0)$("#phraseSlot").textContent="";
  if(button.dataset.word===phraseAnswer[phraseIndex]){
    button.disabled=true;const word=document.createElement("span");word.className="chosen-word";word.textContent=button.dataset.word;$("#phraseSlot").append(word);document.querySelectorAll("#decodeMeter i")[phraseIndex].classList.add("on");tone(390+phraseIndex*75,.16,"triangle",.04);phraseIndex+=1;
    if(phraseIndex===phraseAnswer.length){state.phraseDone=true;$("#phraseFeedback").textContent="ACESSO LIBERADO · futuro compatível encontrado";showAchievement(4,"Um futuro que pede nós dois");setTimeout(()=>{storyModal.close();transitionTo(5,500);phraseIndex=0;},2000);}
  }else{
    tone(150,.18,"square",.02);$("#phraseFeedback").textContent="quase! o futuro embaralhou tudo de novo 😅";phraseIndex=0;setTimeout(()=>{$("#phraseSlot").textContent="tente outra ordem";document.querySelectorAll(".word-tile").forEach(b=>b.disabled=false);document.querySelectorAll("#decodeMeter i").forEach(i=>i.classList.remove("on"));$("#phraseFeedback").textContent="arquivo criptografado";},700);
  }
}

let flightAnimation = null;
function openStarFlight(){
  storyContent.innerHTML=`
    <div class="modal-mission-tag">MISSÃO 06 · OPERAÇÃO FRIO NA BARRIGA</div>
    <h2>Pilote pelo<br /><em>caos emocional</em></h2>
    <p class="modal-copy">Colete 8 faíscas de coragem e desvie dos pensamentos “e se ela disser não?”. No celular, arraste a nave. No PC, use WASD ou as setas.</p>
    <div class="flight-shell"><div class="flight-hud"><span>⚡ <b id="flightScore">0</b>/8</span><span>ESCUDO <b id="flightShield">♥♥♥</b></span></div><canvas id="flightCanvas" width="760" height="360" tabindex="0" aria-label="Nave no cinturão de meteoros"></canvas><div class="flight-caption" id="flightCaption">PINGO: por favor, não bata. Eu não tenho seguro espacial.</div></div>
    <button class="modal-main-button" id="startFlight" type="button">ligar motores ✦</button>`;
  storyModal.showModal();
  $("#startFlight").addEventListener("click",startStarFlight,{once:true});
}

function startStarFlight(){
  const flightCanvas=$("#flightCanvas"),flightCtx=flightCanvas.getContext("2d"),button=$("#startFlight");
  button.disabled=true;button.textContent="voo em andamento…";flightCanvas.focus();
  const ship={x:110,y:180,targetX:110,targetY:180};
  const items=[];let score=0,shield=3,last=performance.now(),starTimer=0,meteorTimer=0,finished=false;
  const flightKeys={up:false,down:false,left:false,right:false};
  const flightMap={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"};
  const captions=["PINGO: estamos voando! Tecnicamente.","RAFAEL.EXE: coragem carregando…","PINGO: meteoros são só pedrinhas com autoestima.","COMPUTADOR: destino romântico detectado.","PINGO: ela está indo muito bem. Eu sempre soube."];
  const positionFromPointer=(event)=>{const rect=flightCanvas.getBoundingClientRect();ship.targetX=(event.clientX-rect.left)/rect.width*760;ship.targetY=(event.clientY-rect.top)/rect.height*360;};
  const keyDown=(event)=>{if(flightMap[event.key]){flightKeys[flightMap[event.key]]=true;event.preventDefault();}};
  const keyUp=(event)=>{if(flightMap[event.key])flightKeys[flightMap[event.key]]=false;};
  flightCanvas.addEventListener("pointerdown",positionFromPointer);flightCanvas.addEventListener("pointermove",event=>{if(event.buttons||event.pointerType==="touch")positionFromPointer(event);});
  window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp);
  const cleanup=()=>{window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp);cancelAnimationFrame(flightAnimation);};
  const finish=()=>{if(finished)return;finished=true;cleanup();state.flightDone=true;$("#flightScore").textContent="8";$("#flightCaption").textContent="COORDENADA DESBLOQUEADA: PLANETA [SEM NOME]";button.textContent="coragem completa! ✦";showAchievement(5,"Coragem maior que o frio na barriga");burstConfetti(30);setTimeout(()=>{storyModal.close();transitionTo(6,500);},1700);};
  function drawFlight(now){
    const delta=Math.min(.035,(now-last)/1000);last=now;starTimer-=delta;meteorTimer-=delta;
    const keyX=(flightKeys.right?1:0)-(flightKeys.left?1:0),keyY=(flightKeys.down?1:0)-(flightKeys.up?1:0);
    if(keyX||keyY){ship.targetX+=keyX*280*delta;ship.targetY+=keyY*280*delta;}
    ship.targetX=Math.max(45,Math.min(715,ship.targetX));ship.targetY=Math.max(45,Math.min(315,ship.targetY));ship.x+=(ship.targetX-ship.x)*Math.min(1,delta*8);ship.y+=(ship.targetY-ship.y)*Math.min(1,delta*8);
    if(starTimer<=0){items.push({type:"star",x:790,y:45+Math.random()*270,size:13,vx:150+Math.random()*55,spin:Math.random()*6});starTimer=.72+Math.random()*.5;}
    if(meteorTimer<=0){items.push({type:"meteor",x:820,y:35+Math.random()*290,size:18+Math.random()*18,vx:185+Math.random()*85,spin:Math.random()*6});meteorTimer=.48+Math.random()*.42;}
    items.forEach(item=>{item.x-=item.vx*delta;item.spin+=delta*5;});
    for(let i=items.length-1;i>=0;i--){const item=items[i];if(Math.hypot(item.x-ship.x,item.y-ship.y)<item.size+18){items.splice(i,1);if(item.type==="star"){score+=1;tone(520+score*45,.12,"triangle",.035);$("#flightScore").textContent=String(score);$("#flightCaption").textContent=captions[Math.min(captions.length-1,Math.floor(score/2))];if(navigator.vibrate)navigator.vibrate(9);if(score>=8)return finish();}else{shield-=1;tone(120,.18,"square",.025);if(navigator.vibrate)navigator.vibrate([20,25,20]);if(shield<=0){shield=3;score=Math.max(0,score-1);$("#flightScore").textContent=String(score);$("#flightCaption").textContent="PINGO: respira! O universo deu continue infinito.";}$("#flightShield").textContent="♥".repeat(shield)+"·".repeat(3-shield);}}else if(item.x<-60)items.splice(i,1);}
    flightCtx.fillStyle="#0d0b20";flightCtx.fillRect(0,0,760,360);
    for(let i=0;i<70;i++){const x=((i*113-now*.025*(1+i%3))%790+790)%790,y=(i*71)%350,s=1+i%3;flightCtx.fillStyle=i%11===0?"#ffd166":"rgba(235,235,255,.65)";flightCtx.fillRect(x,y,s,s);}
    const nebula=flightCtx.createRadialGradient(520,170,10,520,170,270);nebula.addColorStop(0,"rgba(141,89,190,.28)");nebula.addColorStop(1,"rgba(20,10,45,0)");flightCtx.fillStyle=nebula;flightCtx.fillRect(0,0,760,360);
    items.forEach(item=>{flightCtx.save();flightCtx.translate(item.x,item.y);flightCtx.rotate(item.spin);if(item.type==="star"){flightCtx.fillStyle="#ffd166";flightCtx.fillRect(-5,-18,10,36);flightCtx.fillRect(-18,-5,36,10);flightCtx.fillStyle="#fff4c9";flightCtx.fillRect(-5,-5,10,10);}else{flightCtx.fillStyle="#2b2741";flightCtx.fillRect(-item.size,-item.size*.65,item.size*2,item.size*1.3);flightCtx.fillStyle="#5b536c";flightCtx.fillRect(-item.size*.7,-item.size*.75,item.size,item.size*.35);flightCtx.fillStyle="#17142b";flightCtx.fillRect(2,-4,item.size*.5,item.size*.42);}flightCtx.restore();});
    // Nave pixelada, com Pingo no para-brisa.
    flightCtx.save();flightCtx.translate(ship.x,ship.y);flightCtx.fillStyle="rgba(118,217,179,.25)";flightCtx.fillRect(-44,-7,28,14);flightCtx.fillStyle="#211827";flightCtx.fillRect(-25,-19,48,38);flightCtx.fillStyle="#65a6ca";flightCtx.fillRect(-18,-14,36,28);flightCtx.fillStyle="#d5f2ea";flightCtx.fillRect(2,-9,13,12);flightCtx.fillStyle="#ef466f";flightCtx.fillRect(5,-7,8,8);flightCtx.fillStyle="#ffd166";flightCtx.fillRect(-31,-12,8,9);flightCtx.fillRect(-31,4,8,9);flightCtx.fillStyle="#ff725e";flightCtx.fillRect(-42,-9,12,7);flightCtx.fillRect(-42,3,12,7);flightCtx.restore();
    if(!finished)flightAnimation=requestAnimationFrame(drawFlight);
  }
  flightAnimation=requestAnimationFrame(drawFlight);
}

let finalTimers=[];let finalConstellationFrame=null;
function openFinale(){
  state.running=false;clearInterval(musicTimer);musicTimer=null;const transition=$("#cinematicTransition");$("#transitionChapter").textContent="COORDENADA FINAL";$("#transitionTitle").textContent="Há outra pessoa esperando neste planeta.";transition.classList.add("show");
  setTimeout(()=>{setActiveScreen(finalScreen);transition.classList.remove("show");runFinalCinematic();},1500);
}

function runFinalCinematic(){
  const cinematic=$("#finalCinematic"),content=$("#finalContent"),characterCanvas=$("#finalCharacters"),characterCtx=characterCanvas.getContext("2d");
  finalTimers.forEach(clearTimeout);finalTimers=[];cancelAnimationFrame(finalConstellationFrame);cinematic.className="final-cinematic active";content.classList.add("waiting");content.classList.remove("revealed");
  cinematic.style.setProperty("transition","none","important");cinematic.style.setProperty("opacity","1","important");cinematic.style.setProperty("visibility","visible","important");
  $("#finalCinematicKicker").textContent="COORDENADA FINAL ENCONTRADA";$("#finalCinematicText").innerHTML="A última estrela<br />não estava sozinha.";$("#finalCinematicCaption").textContent="ALGUÉM ESTÁ ENTRANDO NA PARTIDA…";
  characterCtx.clearRect(0,0,360,190);drawExplorerSprite(characterCtx,95,175,4,"right",0,"rebeca",false,true);
  finalTimers.push(setTimeout(()=>{cinematic.classList.add("meeting");drawExplorerSprite(characterCtx,265,175,4,"left",0,"rafael",false,true);$("#finalCinematicKicker").textContent="NOVO JOGADOR DETECTADO";$("#finalCinematicCaption").textContent="RAFAEL ENTROU NA PARTIDA ✦";tone(523,.35,"sine",.04);},1200));
  finalTimers.push(setTimeout(()=>{cinematic.classList.add("constellation");$("#finalCinematicText").innerHTML="Duas rotas formaram<br /><em>uma constelação.</em>";animateFinalConstellation();restartMusic(7);},2900));
  finalTimers.push(setTimeout(finishFinalCinematic,6700));
}

function animateFinalConstellation(){
  const starCanvas=$("#finalConstellation"),starCtx=starCanvas.getContext("2d"),start=performance.now();
  const paths=[[[72,205],[72,52],[150,52],[169,72],[150,107],[72,107],[166,205]],[[292,92],[270,70],[240,75],[224,102],[230,133],[292,196],[354,133],[360,102],[344,75],[314,70],[292,92]],[[532,205],[532,52],[610,52],[629,72],[610,107],[532,107],[626,205]]];
  function frame(now){const progress=Math.min(1,(now-start)/2200);starCtx.clearRect(0,0,700,250);const glow=starCtx.createRadialGradient(350,125,10,350,125,330);glow.addColorStop(0,"rgba(169,154,244,.18)");glow.addColorStop(1,"rgba(20,12,45,0)");starCtx.fillStyle=glow;starCtx.fillRect(0,0,700,250);let segments=[];paths.forEach(path=>{for(let i=1;i<path.length;i++)segments.push([path[i-1],path[i]]);});const visible=progress*segments.length;segments.forEach((segment,index)=>{if(index>visible)return;const local=Math.min(1,visible-index),[a,b]=segment;starCtx.strokeStyle="rgba(255,225,145,.72)";starCtx.lineWidth=2;starCtx.beginPath();starCtx.moveTo(a[0],a[1]);starCtx.lineTo(a[0]+(b[0]-a[0])*local,a[1]+(b[1]-a[1])*local);starCtx.stroke();});paths.flat().forEach((point,index)=>{if(index/paths.flat().length>progress+.12)return;const pulse=2+Math.sin(now/180+index)*1.5;starCtx.fillStyle=index%4===0?"#ff7592":"#fff0bd";starCtx.fillRect(point[0]-pulse,point[1]-pulse,pulse*2,pulse*2);});if(progress<1)finalConstellationFrame=requestAnimationFrame(frame);}
  finalConstellationFrame=requestAnimationFrame(frame);
}

function finishFinalCinematic(){
  finalTimers.forEach(clearTimeout);finalTimers=[];const cinematic=$("#finalCinematic"),content=$("#finalContent");cinematic.classList.add("done");cinematic.style.setProperty("opacity","0","important");cinematic.style.setProperty("visibility","hidden","important");content.classList.remove("waiting");content.classList.add("revealed");
  if(state.secretSolved&&!$(".secret-ending")){const bonus=document.createElement("span");bonus.className="secret-ending";bonus.textContent="P.S.: em algum lugar do futuro, nós ainda estamos escolhendo um ao outro.";$(".final-letter").append(bonus);}
  successChime();burstConfetti(42);setTimeout(()=>$(".proposal-panel").scrollIntoView({behavior:"smooth",block:"center"}),900);
}

$("#skipFinalCinematic").addEventListener("click",finishFinalCinematic);

// Proposal
let noAttempts=0;
function escapeNo(event){event?.preventDefault();noAttempts+=1;const button=$("#declineButton"),phrases=["opa","esse botão corre","Rebeca… 👀","não vale!","agora virou SIM"];
  button.textContent=phrases[Math.min(noAttempts-1,phrases.length-1)];button.classList.add("escape");const width=button.offsetWidth||90,height=button.offsetHeight||50;button.style.left=`${12+Math.random()*(window.innerWidth-width-24)}px`;button.style.top=`${80+Math.random()*(window.innerHeight-height-130)}px`;
  if(noAttempts>=5){button.className="accept-button";button.style.cssText="";button.innerHTML="<span>SIM TAMBÉM!</span><small>o botão se rendeu</small>";button.removeEventListener("pointerenter",escapeNo);button.removeEventListener("click",escapeNo);button.addEventListener("click",acceptProposal);}
}
$("#declineButton").addEventListener("pointerenter",escapeNo);$("#declineButton").addEventListener("click",escapeNo);$("#acceptButton").addEventListener("click",acceptProposal);
function acceptProposal(){
  $("#proposalPanel").style.display="none";$("#acceptedPanel").classList.add("show");$("#acceptedPanel").scrollIntoView({behavior:"smooth",block:"center"});burstConfetti(110);successChime();if(navigator.vibrate)navigator.vibrate([90,50,140,60,190]);
}

function burstConfetti(amount){
  const colors=["#ff4f78","#ff725e","#ffd05a","#76d9b3","#a99af4","#fff7e8"];
  confetti({particleCount:amount,spread:82,startVelocity:42,gravity:.8,scalar:.95,colors,origin:{y:.62},disableForReducedMotion:true});
  if(amount>60){setTimeout(()=>confetti({particleCount:Math.round(amount*.55),angle:60,spread:55,origin:{x:0,y:.72},colors}),180);setTimeout(()=>confetti({particleCount:Math.round(amount*.55),angle:120,spread:55,origin:{x:1,y:.72},colors}),260);}
}

$("#shareMoment").addEventListener("click",async()=>{const data={title:"Missão Rebeca ✦",text:"Missão concluída: Rebeca + Rafael 💘",url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);$("#shareMoment").textContent="momento copiado ♡";}}catch(error){if(error.name!=="AbortError")$("#shareMoment").textContent="guardei no coração ♡";}});

const planetPositions=[[50,12],[79,24],[87,55],[67,78],[36,81],[12,58],[18,25]];
function openGalaxyMap(){
  const glyphCount=state.glyphs.filter(Boolean).length;
  storyContent.innerHTML=`
    <div class="cockpit-header"><span>PAINEL DA NAVE · PINGO-1</span><i></i><i></i><i></i></div>
    <h2>Mapa <em>galáctico</em></h2>
    <p class="modal-copy">Escolha uma órbita já descoberta para revisitá-la. O computador insiste que o destino final continua sendo “extremamente suspeito”.</p>
    <div class="galaxy-cockpit">
      <div class="radar-ring r1"></div><div class="radar-ring r2"></div><div class="radar-sweep"></div>
      <div class="map-core">R + R</div>
      ${scenes.map((scene,index)=>`<button class="map-planet p${index}${index===state.scene?" current":""}" style="--px:${planetPositions[index][0]}%;--py:${planetPositions[index][1]}%" data-map-scene="${index}" ${index>state.highestScene?"disabled":""}><i>${["⌁","☀","♥","✦","∞","⚡","?"][index]}</i><span>${scene.title}</span><small>${index>state.highestScene?"BLOQUEADO":index===state.scene?"VOCÊ ESTÁ AQUI":"VIAJAR"}</small></button>`).join("")}
    </div>
    <div class="cockpit-readouts"><span><small>ÓRBITAS</small><b>${state.highestScene+1}/7</b></span><span><small>SELOS</small><b>${state.fragments.filter(Boolean).length}/6</b></span><span><small>SINAIS ?</small><b>${glyphCount}/3</b></span></div>
    <div class="secret-frequency ${glyphCount===3?"ready":""}"><i>⌁</i><div><small>FREQUÊNCIA NÃO REGISTRADA</small><strong>${state.secretSolved?"Mensagem do futuro decifrada":glyphCount===3?"Três símbolos respondendo":"Sinal incompleto · procure símbolos discretos"}</strong></div>${glyphCount===3?`<button id="openCipher" type="button">${state.secretSolved?"RELER":"DECIFRAR"}</button>`:""}</div>
    <button class="modal-main-button map-close" type="button">fechar painel e continuar ✦</button>`;
  if(!storyModal.open)storyModal.showModal();storyModal.scrollTop=0;
  document.querySelectorAll("[data-map-scene]:not(:disabled)").forEach(button=>button.addEventListener("click",()=>{const next=Number(button.dataset.mapScene);storyModal.close();if(next!==state.scene)transitionTo(next,250);}));
  $(".map-close").addEventListener("click",()=>storyModal.close());if($("#openCipher"))$("#openCipher").addEventListener("click",openCipherMission);
}

function openCipherMission(){
  if(state.secretSolved){
    storyContent.innerHTML=`<div class="modal-mission-tag">ARQUIVO Ω · ANO DESCONHECIDO</div><div class="decoded-heart">♡</div><h2>A mensagem veio<br /><em>depois do final</em></h2><p class="modal-copy">“Rebeca, se você está lendo isto, a primeira viagem deu certo. Rafael ainda ri das piadas ruins do Pingo e vocês ainda escolhem um ao outro em todos os universos possíveis.”</p><div class="future-signature">ASSINADO: VOCÊS DO FUTURO · coordenada ∞</div><button class="modal-main-button cipher-close" type="button">guardar no coração ✦</button>`;
    $(".cipher-close").addEventListener("click",()=>storyModal.close());return;
  }
  storyContent.innerHTML=`<div class="modal-mission-tag">MISSÃO Ω · NÃO CONSTA NO MAPA</div><h2>A cifra dos<br /><em>três ecos</em></h2><p class="modal-copy">Os símbolos deixaram uma instrução: <strong>“primeiro o que sente, depois o que guia, por fim o que espera.”</strong></p><div class="cipher-display" id="cipherDisplay"><span>·</span><span>·</span><span>·</span></div><div class="cipher-symbols"><button data-cipher="☽">☽<small>ESPERA</small></button><button data-cipher="✦">✦<small>GUIA</small></button><button data-cipher="♡">♡<small>SENTE</small></button></div><p class="puzzle-feedback" id="cipherFeedback">a frequência está ouvindo</p><button class="modal-main-button cipher-back" type="button">voltar ao mapa</button>`;
  if(!storyModal.open)storyModal.showModal();
  const answer=["♡","✦","☽"];let cipherIndex=0;
  document.querySelectorAll("[data-cipher]").forEach(button=>button.addEventListener("click",()=>{
    const value=button.dataset.cipher;if(value===answer[cipherIndex]){document.querySelectorAll("#cipherDisplay span")[cipherIndex].textContent=value;button.disabled=true;tone(520+cipherIndex*130,.22,"sine",.04);cipherIndex+=1;if(cipherIndex===3){state.secretSolved=true;$("#cipherFeedback").textContent="LINHA DO TEMPO OCULTA ENCONTRADA";showToast("MISSÃO SECRETA CONCLUÍDA","Uma mensagem de vocês do futuro","∞");setTimeout(openCipherMission,1300);}}else{$("#cipherFeedback").textContent="a frequência embaralhou — o coração vem primeiro";tone(145,.18,"square",.02);cipherIndex=0;document.querySelectorAll("#cipherDisplay span").forEach(node=>node.textContent="·");document.querySelectorAll("[data-cipher]").forEach(node=>node.disabled=false);}
  }));
  $(".cipher-back").addEventListener("click",openGalaxyMap);
}

// React HUD actions
function toggleSound() {
  soundOn = !soundOn;
  if(soundOn){ensureAudio();successChime();restartMusic();}else{clearInterval(musicTimer);musicTimer=null;}
  emitHudUpdate();
}

function openAlbum() {
  const found = state.secretNotes.filter(Boolean).length;
  storyContent.innerHTML = `
    <div class="album-header"><button class="album-x" type="button" aria-label="Fechar diário">×</button><div class="modal-mission-tag">DIÁRIO DE BORDO · ${found}/7</div><h2>Coisas que eu<br /><em>queria te dizer</em></h2><p>Uma página está escondida em cada órbita. Elas não são obrigatórias — mas curiosidade sempre ganha presente.</p></div>
    <div class="album-grid">${secretNotes.map((note,index)=>state.secretNotes[index]
      ? `<article class="album-note found"><small>${String(index+1).padStart(2,"0")}</small><strong>${note.title.split(" · ")[1]}</strong><p>${note.text}</p></article>`
      : `<article class="album-note locked"><small>${String(index+1).padStart(2,"0")}</small><strong>AINDA PERDIDO NO ESPAÇO</strong><p>procure uma página brilhando pelo planeta</p></article>`).join("")}</div>
    <button class="modal-main-button album-close" type="button">voltar para a aventura ✦</button>`;
  storyModal.showModal();
  storyModal.scrollTop = 0;
  $(".album-x").addEventListener("click",()=>storyModal.close());
  $(".album-close").addEventListener("click",()=>storyModal.close());
}

const installModal=$("#installModal");let deferredPrompt=null;
async function openInstallHelp(){const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;if(standalone)return;if(deferredPrompt&&!/iPad|iPhone|iPod/.test(navigator.userAgent)){deferredPrompt.prompt();return;}installModal.showModal();}
document.querySelectorAll(".cover-screen .install-trigger").forEach(button=>button.addEventListener("click",openInstallHelp));
$(".modal-close").addEventListener("click",()=>installModal.close());$(".install-ok").addEventListener("click",()=>installModal.close());installModal.addEventListener("click",event=>{if(event.target===installModal)installModal.close();});window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredPrompt=event;});

createRoot($("#reactHudControls")).render(<HudControls/>);
requestAnimationFrame(emitHudUpdate);

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js"));

// Local-only scene preview for visual QA; never activates on the published surprise.
const localPreviewValue = new URLSearchParams(location.search).get("_scene");
const localPreviewScene = ["localhost","127.0.0.1"].includes(location.hostname) && localPreviewValue !== null ? Number(localPreviewValue) : NaN;
if (Number.isInteger(localPreviewScene) && localPreviewScene >= 0 && localPreviewScene < scenes.length) {
  setTimeout(()=>{
    state.scene = localPreviewScene;
    state.highestScene = localPreviewScene;
    state.fragments = state.fragments.map((_,index)=>index < localPreviewScene);
    if(new URLSearchParams(location.search).get("_secret")==="1")state.glyphs=[true,true,true];
    state.running = true;
    rebuildPhysics(localPreviewScene);
    setActiveScreen(gameScreen);
    updateHud();showRibbon();announceScene(localPreviewScene);render();
  },40);
}

const localFinalPreview=["localhost","127.0.0.1"].includes(location.hostname)&&new URLSearchParams(location.search).get("_final")==="1";
if(localFinalPreview)setTimeout(()=>{state.secretSolved=new URLSearchParams(location.search).get("_secret")==="1";setActiveScreen(finalScreen);runFinalCinematic();},60);
const localMapPreview=["localhost","127.0.0.1"].includes(location.hostname)&&new URLSearchParams(location.search).get("_map")==="1";
if(localMapPreview)setTimeout(()=>{if(new URLSearchParams(location.search).get("_secret")==="1")state.glyphs=[true,true,true];openGalaxyMap();},180);
const localCipherPreview=["localhost","127.0.0.1"].includes(location.hostname)&&new URLSearchParams(location.search).get("_cipher")==="1";
if(localCipherPreview)setTimeout(()=>{state.glyphs=[true,true,true];openCipherMission();},200);
