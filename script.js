"use strict";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let opened = false;
let letterOpened = false;
let audioContext;
let musicPlaying = false;
let musicTimer;
let nextNoteTime = 0;
let noteIndex = 0;
const activeNotes = new Set();

// Happy Birthday in C major. The accompaniment is generated locally, so the
// page works offline and does not need a music file or a third-party service.
const melody = [
  ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
  ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
  ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
  ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2], [null, 2.5]
];
const frequencies = { G4: 392, A4: 440, B4: 493.883, C5: 523.251, D5: 587.33, E5: 659.255, F5: 698.456, G5: 783.991 };

function playTone(frequency, start, duration) {
  const gain = audioContext.createGain();
  const fundamental = audioContext.createOscillator();
  const overtone = audioContext.createOscillator();
  const overtoneGain = audioContext.createGain();
  fundamental.type = "sine";
  fundamental.frequency.value = frequency;
  overtone.type = "sine";
  overtone.frequency.value = frequency * 2;
  overtoneGain.gain.value = .12;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(.16, start + .014);
  gain.gain.exponentialRampToValueAtTime(.001, start + Math.max(duration, .25) + .3);
  fundamental.connect(gain);
  overtone.connect(overtoneGain);
  overtoneGain.connect(gain);
  gain.connect(audioContext.destination);
  const pair = { fundamental, overtone };
  activeNotes.add(pair);
  fundamental.onended = () => {
    activeNotes.delete(pair);
    fundamental.disconnect();
    overtone.disconnect();
    overtoneGain.disconnect();
    gain.disconnect();
  };
  fundamental.start(start);
  overtone.start(start);
  fundamental.stop(start + duration + .4);
  overtone.stop(start + duration + .4);
}

function scheduleMusic() {
  if (!musicPlaying) return;
  while (nextNoteTime < audioContext.currentTime + .3) {
    const [note, beats] = melody[noteIndex];
    const duration = beats * .43;
    if (note) playTone(frequencies[note], nextNoteTime, duration * .9);
    nextNoteTime += duration;
    noteIndex = (noteIndex + 1) % melody.length;
  }
  musicTimer = window.setTimeout(scheduleMusic, 90);
}

function updateMusicButton() {
  $("music-button").setAttribute("aria-pressed", String(musicPlaying));
  $("music-button").setAttribute("aria-label", musicPlaying ? "暂停生日快乐歌" : "播放生日快乐歌");
  $("music-label").textContent = musicPlaying ? "音乐开" : "音乐关";
}

async function startMusic() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio unavailable");
    if (!audioContext) audioContext = new AudioContextClass();
    await audioContext.resume();
    if (musicPlaying) return;
    musicPlaying = true;
    noteIndex = 0;
    nextNoteTime = audioContext.currentTime + .05;
    scheduleMusic();
    updateMusicButton();
  } catch {
    $("music-label").textContent = "轻点重试";
    $("announcement").textContent = "音乐暂时无法播放，可以点击右上角音乐按钮重试。";
  }
}

function stopMusic() {
  musicPlaying = false;
  window.clearTimeout(musicTimer);
  for (const { fundamental, overtone } of activeNotes) {
    try { fundamental.stop(); overtone.stop(); } catch { /* Already ended. */ }
  }
  activeNotes.clear();
  updateMusicButton();
}

$("music-button").addEventListener("click", () => {
  if (musicPlaying) stopMusic();
  else void startMusic();
});

const logos = ["🎆", "🎇", "✨", "🎉", "🌟", "💫", "✺", "✹"];
const colors = ["#c95c50", "#698b70", "#658cbd", "#d6a444", "#dd8d9b"];
function fireworks(x, y, celebration = false) {
  const layer = $("fireworks");
  // Keep rapid clicks responsive without accumulating hundreds of elements.
  while (layer.childElementCount > 170) layer.firstElementChild.remove();
  const count = celebration ? 5 : 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const logo = document.createElement("span");
    logo.className = "firework-logo";
    logo.textContent = logos[Math.floor(Math.random() * logos.length)];
    logo.style.left = `${x}px`;
    logo.style.top = `${y}px`;
    logo.style.fontSize = `${27 + Math.random() * 49}px`;
    logo.style.color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const distance = reducedMotion.matches ? 18 : 65 + Math.random() * 150;
    logo.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    logo.style.setProperty("--dy", `${Math.sin(angle) * distance - 45}px`);
    logo.style.setProperty("--spin", `${Math.random() * 120 - 60}deg`);
    logo.style.setProperty("--duration", `${1.1 + Math.random() * .6}s`);
    layer.append(logo);
    window.setTimeout(() => logo.remove(), 1800);
  }
  if (reducedMotion.matches) return;
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement("span");
    particle.className = "firework-particle";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.background = colors[i % colors.length];
    const angle = i * Math.PI / 6 + Math.random() * .3;
    const radius = 35 + Math.random() * 75;
    particle.style.setProperty("--px", `${Math.cos(angle) * radius}px`);
    particle.style.setProperty("--py", `${Math.sin(angle) * radius + 25}px`);
    layer.append(particle);
    window.setTimeout(() => particle.remove(), 1100);
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest("button, a")) return;
  fireworks(event.clientX, event.clientY);
});

function openGift() {
  if (opened) return;
  opened = true;
  // Resume audio within the user's click, before waiting for the animation.
  if (!musicPlaying) void startMusic();
  $("gift-button").disabled = true;
  $("open-button").disabled = true;
  $("gift-scene").classList.add("is-opening");
  const bounds = $("gift-button").getBoundingClientRect();
  fireworks(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, true);
  window.setTimeout(() => {
    $("gift-scene").hidden = true;
    $("eyebrow").textContent = "把今天的所有美好，都送给你";
    $("headline").innerHTML = '安行，<br>生日快乐<span class="red-dot">！</span>';
    $("subtitle").textContent = "新的一岁，继续做闪闪发光的自己。";
    $("birthday-scene").hidden = false;
    $("birthday-scene").classList.add("is-visible");
    $("announcement").textContent = "安行，生日快乐！礼物打开了，蛋糕下还有一封给你的信。";
    $("envelope-button").focus({ preventScroll: true });
  }, reducedMotion.matches ? 20 : 550);
}

$("gift-button").addEventListener("click", openGift);
$("open-button").addEventListener("click", openGift);
$("envelope-button").addEventListener("click", () => {
  letterOpened = !letterOpened;
  $("envelope-button").setAttribute("aria-expanded", String(letterOpened));
  $("letter").inert = !letterOpened;
  $("letter").classList.toggle("is-open", letterOpened);
  $("envelope-label").textContent = letterOpened ? "一字一句，都是送给你的祝福" : "还有几句话，想说给你听";
  $("envelope-hint").textContent = letterOpened ? "点击信封 · 好好收藏这份心意 ↑" : "点击信封 · 展开这封信 ↓";
  if (letterOpened) {
    $("announcement").textContent = "祝安行又小一岁！往后的日子里请持续为自己发光发热，继续追寻那心之所向吧！";
    window.setTimeout(() => {
      if (letterOpened) $("letter").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "nearest" });
    }, reducedMotion.matches ? 30 : 1000);
  }
});

// A background tab should not keep playing. Return to the page and tap music
// to restart, avoiding unexpected audio when switching back to the browser.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && musicPlaying) stopMusic();
});
