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
    pct === 100 ? "Perfekt! Du kan allt! 🌟" :
    pct >= 70 ? `${pct}% rätt. Snyggt jobbat!` :
    pct >= 40 ? `${pct}% rätt. Fortsätt öva!` :
    `${pct}% rätt. Kör en runda till, det blir bättre!`;
}

$("start-quiz").addEventListener("click", startQuiz);
$("restart-quiz").addEventListener("click", startQuiz);

// ---------- Start ----------
renderCards();
