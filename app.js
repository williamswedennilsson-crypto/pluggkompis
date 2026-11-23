// ---------- Lagring ----------
const STORAGE_CARDS = "pluggkompis.cards";
const STORAGE_NOTES = "pluggkompis.notes";

let cards = JSON.parse(localStorage.getItem(STORAGE_CARDS) || "[]");

function saveCards() {
  localStorage.setItem(STORAGE_CARDS, JSON.stringify(cards));
  renderCards();
}

const $ = (id) => document.getElementById(id);

// ---------- Flikar ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    $(tab.dataset.view).classList.add("active");
    if (tab.dataset.view === "quiz") showQuizStart();
    if (tab.dataset.view === "game") showGameStart();
    else stopGame();
  });
});

// ---------- Anteckningar ----------
const notesText = $("notes-text");
notesText.value = localStorage.getItem(STORAGE_NOTES) || "";

let notesTimer;
notesText.addEventListener("input", () => {
  clearTimeout(notesTimer);
  $("notes-status").textContent = "Sparar...";
  notesTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_NOTES, notesText.value);
    $("notes-status").textContent = "Sparat ✓";
  }, 400);
});

// Gör kort av rader som ser ut som "fråga - svar"
$("notes-to-cards").addEventListener("click", () => {
  const lines = notesText.value.split("\n");
  let added = 0;
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+[-–]\s+(.+)$/);
    if (match) {
      cards.push({ id: Date.now() + Math.random(), q: match[1].trim(), a: match[2].trim() });
      added++;
    }
  }
  if (added) saveCards();
  alert(added
    ? `${added} kort skapades!`
    : 'Hittade inga rader i formatet "fråga - svar".');
});

// ---------- Flashcards ----------
$("card-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("q-input").value.trim();
  const a = $("a-input").value.trim();
  if (!q || !a) return;
  cards.push({ id: Date.now(), q, a });
  saveCards();
  $("card-form").reset();
  $("q-input").focus();
});

$("clear-cards").addEventListener("click", () => {
  if (confirm("Vill du radera alla kort?")) {
    cards = [];
    saveCards();
  }
});

function renderCards() {
  const list = $("card-list");
  list.innerHTML = "";
  for (const card of cards) {
    const li = document.createElement("li");
    const text = document.createElement("div");
    const q = document.createElement("div");
    const a = document.createElement("div");
    q.className = "q";
    a.className = "a";
    q.textContent = card.q;
    a.textContent = card.a;
    text.append(q, a);

    const del = document.createElement("button");
    del.className = "del";
    del.title = "Radera kort";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      cards = cards.filter((c) => c.id !== card.id);
      saveCards();
    });

    li.append(text, del);
    list.appendChild(li);
  }
  $("card-count").textContent = cards.length;
  $("cards-empty").classList.toggle("hidden", cards.length > 0);
  $("clear-cards").classList.toggle("hidden", cards.length === 0);
}

// ---------- Quiz ----------
let deck = [];
let index = 0;
let score = 0;

function normalize(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.!?,]+$/, "");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showOnly(id) {
  ["quiz-start", "quiz-play", "quiz-result"].forEach((p) =>
    $(p).classList.toggle("hidden", p !== id)
  );
}

function showQuizStart() {
  showOnly("quiz-start");
  $("start-quiz").disabled = cards.length === 0;
  $("quiz-no-cards").classList.toggle("hidden", cards.length > 0);
}

function startQuiz() {
  if (!cards.length) return;
  deck = shuffle(cards);
  index = 0;
  score = 0;
  showOnly("quiz-play");
  showQuestion();
}

function showQuestion() {
  const card = deck[index];
  $("quiz-progress").textContent = `Fråga ${index + 1} av ${deck.length}`;
  $("quiz-score").textContent = score;
  $("progress-bar").style.width = `${(index / deck.length) * 100}%`;
  $("quiz-question").textContent = card.q;
  $("answer-input").value = "";
  $("answer-input").disabled = false;
  $("check-btn").disabled = false;
  $("feedback").classList.add("hidden");
  $("after-answer").classList.add("hidden");
  $("answer-input").focus();
}

$("answer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("answer-input").disabled) return;
  const card = deck[index];
  const correct = normalize($("answer-input").value) === normalize(card.a);
  if (correct) score++;

  const fb = $("feedback");
  fb.className = "feedback " + (correct ? "good" : "bad");
  fb.textContent = correct ? "Rätt! ✓" : `Fel. Rätt svar: ${card.a}`;

  $("quiz-score").textContent = score;
  $("answer-input").disabled = true;
  $("check-btn").disabled = true;
  $("override-btn").classList.toggle("hidden", correct);
  $("after-answer").classList.remove("hidden");
  $("next-btn").focus();
});

// Om man skrev rätt men med annan stavning/formulering
$("override-btn").addEventListener("click", () => {
  score++;
  $("quiz-score").textContent = score;
  $("feedback").className = "feedback good";
  $("feedback").textContent = "Räknat som rätt ✓";
  $("override-btn").classList.add("hidden");
  $("next-btn").focus();
});

$("next-btn").addEventListener("click", () => {
  index++;
  if (index < deck.length) showQuestion();
  else showResult();
});

function showResult() {
  showOnly("quiz-result");
  const pct = Math.round((score / deck.length) * 100);
  $("final-score").textContent = `${score} / ${deck.length}`;
  $("final-msg").textContent =
    pct === 100 ? (confetti(), "Perfekt! Du kan allt! 🌟") :
    pct >= 70 ? `${pct}% rätt. Snyggt jobbat!` :
    pct >= 40 ? `${pct}% rätt. Fortsätt öva!` :
    `${pct}% rätt. Kör en runda till, det blir bättre!`;
}

$("start-quiz").addEventListener("click", startQuiz);
$("restart-quiz").addEventListener("click", startQuiz);

// ---------- Konfetti ----------
function confetti(n = 120) {
  const colors = ["#7c6cff", "#3ecf8e", "#ff5c7a", "#ffd166", "#4cc9f0"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.8 + Math.random() * 2 + "s";
    c.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

// ---------- Meteorregn ----------
const STORAGE_BEST = "pluggkompis.meteorBest";
const game = {
  running: false,
  meteors: [],
  score: 0,
  lives: 3,
  combo: 0,
  elapsed: 0,
  spawnIn: 0,
  last: 0,
  missed: [],
  bag: [],
  raf: 0,
};

function gameShow(id) {
  ["game-start", "game-play", "game-over"].forEach((p) =>
    $(p).classList.toggle("hidden", p !== id)
  );
}

function showGameStart() {
  if (game.running) return;
  gameShow("game-start");
  $("game-best").textContent = localStorage.getItem(STORAGE_BEST) || 0;
  $("game-go").disabled = cards.length === 0;
  $("game-no-cards").classList.toggle("hidden", cards.length > 0);
}

function nextCard() {
  // "Påse" så att alla kort kommer innan något upprepas
  if (!game.bag.length) game.bag = shuffle(cards);
  return game.bag.pop();
}

function startGame() {
  if (!cards.length) return;
  stopGame();
  Object.assign(game, {
    running: true, meteors: [], score: 0, lives: 3, combo: 0,
    elapsed: 0, spawnIn: 0, last: performance.now(), missed: [], bag: [],
  });
  $("sky").querySelectorAll(".meteor, .points").forEach((m) => m.remove());
  updateHud();
  gameShow("game-play");
  $("game-input").value = "";
  $("game-input").focus();
  game.raf = requestAnimationFrame(tick);
}

function stopGame() {
  game.running = false;
  cancelAnimationFrame(game.raf);
}

function spawnMeteor() {
  const card = nextCard();
  const el = document.createElement("div");
  el.className = "meteor";
  el.textContent = card.q;
  el.style.left = 15 + Math.random() * 70 + "%";
  $("sky").appendChild(el);
  // Fallhastighet (px/s) ökar med tiden
  const speed = 28 + Math.min(game.elapsed * 0.9, 90) + Math.random() * 10;
  game.meteors.push({ card, el, y: -40, speed });
}

function tick(now) {
  if (!game.running) return;
  const dt = Math.min((now - game.last) / 1000, 0.1);
  game.last = now;
  game.elapsed += dt;

  game.spawnIn -= dt;
  if (game.spawnIn <= 0 && game.meteors.length < 6) {
    spawnMeteor();
    game.spawnIn = Math.max(1.4, 4.5 - game.elapsed * 0.04);
  }

  const floor = $("sky").clientHeight - 28;
  for (const m of [...game.meteors]) {
    m.y += m.speed * dt;
    m.el.style.top = m.y + "px";
    if (m.y + m.el.offsetHeight >= floor) impact(m);
  }

  if (game.running) game.raf = requestAnimationFrame(tick);
}

function removeMeteor(m) {
  game.meteors = game.meteors.filter((x) => x !== m);
}

function impact(m) {
  removeMeteor(m);
  m.el.remove();
  game.lives--;
  game.combo = 0;
  game.missed.push(m.card);
  const sky = $("sky");
  sky.classList.remove("shake");
  void sky.offsetWidth;
  sky.classList.add("shake");
  updateHud();
  if (game.lives <= 0) endGame();
}

function updateHud() {
  $("game-score").textContent = game.score;
  $("game-lives").textContent = "❤️".repeat(game.lives) + "🖤".repeat(3 - game.lives);
  const combo = $("game-combo");
  combo.textContent = game.combo >= 2 ? `🔥 Kombo x${game.combo}` : "";
  combo.classList.remove("pop");
  void combo.offsetWidth;
  if (game.combo >= 2) combo.classList.add("pop");
}

$("game-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("game-input");
  const guess = normalize(input.value);
  if (!guess) return;
  // Träffa den meteor som ligger längst ner av de som matchar
  const hit = game.meteors
    .filter((m) => normalize(m.card.a) === guess)
    .sort((a, b) => b.y - a.y)[0];

  if (hit) {
    removeMeteor(hit);
    game.combo++;
    const pts = 10 * game.combo + Math.round(hit.y / 20);
    game.score += pts;
    const p = document.createElement("div");
    p.className = "points";
    p.textContent = "+" + pts;
    p.style.left = hit.el.style.left;
    p.style.top = hit.y + "px";
    $("sky").appendChild(p);
    setTimeout(() => p.remove(), 800);
    hit.el.classList.add("boom");
    setTimeout(() => hit.el.remove(), 400);
    input.value = "";
  } else {
    game.combo = 0;
    input.classList.remove("wrong");
    void input.offsetWidth;
    input.classList.add("wrong");
    input.select();
  }
  updateHud();
});

function endGame() {
  stopGame();
  game.meteors.forEach((m) => m.el.remove());
  game.meteors = [];
  const best = Number(localStorage.getItem(STORAGE_BEST) || 0);
  const record = game.score > best;
  if (record) {
    localStorage.setItem(STORAGE_BEST, game.score);
    confetti();
  }
  $("game-final").textContent = game.score + " poäng";
  $("game-record").textContent = record
    ? "🏆 Nytt rekord!"
    : `Rekord: ${best}`;

  const missed = $("game-missed");
  missed.innerHTML = "";
  const unique = [...new Map(game.missed.map((c) => [c.id, c])).values()];
  if (unique.length) {
    const h = document.createElement("p");
    h.className = "muted";
    h.textContent = "Kort som slog ner – värda att öva på:";
    const ul = document.createElement("ul");
    for (const c of unique) {
      const li = document.createElement("li");
      const a = document.createElement("span");
      a.className = "a";
      a.textContent = c.a;
      li.append(c.q + " → ", a);
      ul.appendChild(li);
    }
    missed.append(h, ul);
  }
  gameShow("game-over");
}

$("game-go").addEventListener("click", startGame);
$("game-again").addEventListener("click", startGame);

// ---------- Start ----------
renderCards();
