// If your frontend is served by Spring Boot from /static, keep API_BASE = "".
// If you run this page from a separate dev server, set it to "http://localhost:8080".
const API_BASE = "";
const API = {
  all: `${API_BASE}/question/allquestion`,
  category: (name) => `${API_BASE}/question/category/${encodeURIComponent(name)}`,
  add: `${API_BASE}/question/add`,
  remove: (id) => `${API_BASE}/question/delete/${id}`
};

let questions = [];
let currentQuestions = [];
let currentIndex = 0;
let selectedAnswer = null;
let score = 0;
let lastQuiz = [];
let toastTimer;

const $ = (id) => document.getElementById(id);
const titleOf = (q) => q.question_title ?? q.questionTitle ?? q.questionTitle;
const rightOf = (q) => q.right_answer ?? q.rightAnswer;
const difficultyOf = (q) => q.difficulty_level ?? q.difficultyLevel ?? "General";
const categoryOf = (q) => q.category ?? "Uncategorised";
const optionsOf = (q) => [q.option1,q.option2,q.option3,q.option4].filter(v => v !== null && v !== undefined && String(v).trim() !== "").map(String);

async function apiFetch(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? {"Content-Type":"application/json"} : {}), ...(options.headers || {}) } });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try { const body = await response.text(); if (body) message += ` — ${body}`; } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function showToast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

function setApiStatus(ok, message) {
  $("apiStatus").textContent = message;
  $("apiStatus").style.color = ok ? "#438b65" : "#bd6a61";
}

async function loadQuestions() {
  setApiStatus(true, "Syncing question bank…");
  try {
    const data = await apiFetch(API.all);
    questions = Array.isArray(data) ? data : [];
    setApiStatus(true, "API connected");
    renderHome(); renderExplore(); renderAdmin();
  } catch (error) {
    setApiStatus(false, "API unavailable");
    $("homeCategories").innerHTML = `<div class="empty-state">Could not load questions. ${escapeHtml(error.message)}<br><br>Check that Spring Boot is running and the API URL is correct.</div>`;
    $("questionGrid").innerHTML = `<div class="empty-state">No connection to the question API.</div>`;
    $("adminQuestionList").innerHTML = `<div class="empty-state">Connect your Spring Boot API to manage questions.</div>`;
    console.error(error);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function uniqueCategories() { return [...new Set(questions.map(categoryOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }

function renderHome() {
  $("totalCount").textContent = questions.length;
  $("categoryCount").textContent = uniqueCategories().length;
  const cats = uniqueCategories();
  $("homeCategories").innerHTML = cats.length ? cats.slice(0,6).map((cat,i) => {
    const count = questions.filter(q=>categoryOf(q)===cat).length;
    return `<button class="category-card" data-category="${escapeHtml(cat)}"><span class="category-symbol">${["✳","⌘","◈","✦","⌁","◇"][i%6]}</span><strong>${escapeHtml(cat)}</strong><small>${count} ${count===1?"question":"questions"} · Start learning →</small></button>`;
  }).join("") : `<div class="empty-state">Your question bank is empty. Add your first question in Manage questions.</div>`;
  $("homeCategories").querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>startQuiz(b.dataset.category)));
}

function renderExplore() {
  const select = $("categoryFilter"), current = select.value;
  select.innerHTML = `<option value="">All topics</option>` + uniqueCategories().map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  select.value = current;
  const term = $("searchInput").value.trim().toLowerCase(), category = select.value, difficulty = $("difficultyFilter").value;
  const filtered = questions.filter(q => {
    const searchable = `${titleOf(q)} ${categoryOf(q)} ${difficultyOf(q)}`.toLowerCase();
    return (!term || searchable.includes(term)) && (!category || categoryOf(q)===category) && (!difficulty || difficultyOf(q).toLowerCase()===difficulty.toLowerCase());
  });
  $("resultCount").textContent = `${filtered.length} ${filtered.length===1?"question":"questions"} found`;
  $("questionGrid").innerHTML = filtered.length ? filtered.map((q,i)=>`<article class="question-card"><div class="question-card-top"><span class="pill">${escapeHtml(difficultyOf(q))}</span><span style="font-size:10px;color:#aaa">${escapeHtml(categoryOf(q))}</span></div><h3>${escapeHtml(titleOf(q) || "Untitled question")}</h3><div class="question-card-bottom"><span>4 answer choices</span><button class="mini-link" data-play-category="${escapeHtml(categoryOf(q))}">Practice topic →</button></div></article>`).join("") : `<div class="empty-state">No questions match those filters. Try another search.</div>`;
  $("questionGrid").querySelectorAll("[data-play-category]").forEach(b=>b.addEventListener("click",()=>startQuiz(b.dataset.playCategory)));
}

function renderAdmin() {
  $("adminCount").textContent = questions.length;
  const list = $("adminQuestionList");
  list.innerHTML = questions.length ? [...questions].reverse().slice(0,40).map(q=>`<div class="admin-question-item"><strong>${escapeHtml(titleOf(q) || "Untitled question")}</strong><small>${escapeHtml(categoryOf(q))} · ${escapeHtml(difficultyOf(q))} · ID ${escapeHtml(q.id)}</small><button class="delete-btn" data-delete="${escapeHtml(q.id)}">Delete question</button></div>`).join("") : `<div class="empty-state">No questions yet. Add one using the form.</div>`;
  list.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteQuestion(btn.dataset.delete)));
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const page = $(name+"Page"); if (page) page.classList.add("active");
  const labels = {home:"Overview",explore:"Explore questions",quiz:"Quiz time",result:"Your results",admin:"Manage questions"};
  $("crumb").textContent = labels[name] || "Overview";
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.nav===name));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.nav)));
$("refreshBtn").addEventListener("click",loadQuestions);

function startQuiz(category = "") {
  let pool = category ? questions.filter(q=>categoryOf(q)===category) : [...questions];
  pool = pool.filter(q=>titleOf(q) && optionsOf(q).length >= 2 && rightOf(q) !== undefined);
  if (!pool.length) { showToast("There are no playable questions in this topic yet."); return; }
  // Shuffle the bank and run up to five questions per round.
  pool = pool.sort(()=>Math.random()-.5).slice(0,Math.min(5,pool.length));
  currentQuestions = pool; lastQuiz = pool; currentIndex = 0; score = 0; selectedAnswer = null;
  $("quizTopic").textContent = category ? category.toUpperCase() : "MIXED QUICK QUIZ";
  $("roundCount").textContent = pool.length;
  showPage("quiz"); renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = currentQuestions[currentIndex], total = currentQuestions.length, pct = Math.round((currentIndex/total)*100);
  selectedAnswer = null;
  $("questionProgress").textContent = `QUESTION ${currentIndex+1} OF ${total}`;
  $("progressPercent").textContent = `${Math.round(((currentIndex+1)/total)*100)}%`;
  $("progressBar").style.width = `${pct}%`;
  $("questionNumber").textContent = `${String(currentIndex+1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;
  $("questionDifficulty").textContent = difficultyOf(q).toUpperCase();
  $("quizQuestion").textContent = titleOf(q);
  $("quizFeedback").textContent = ""; $("quizFeedback").className = "quiz-feedback";
  $("answerHint").textContent = "Choose the best answer.";
  $("nextQuestionBtn").disabled = true; $("nextQuestionBtn").textContent = "Check answer →";
  $("quizOptions").innerHTML = optionsOf(q).map((opt,i)=>`<button class="option-button" data-answer="${escapeHtml(opt)}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${escapeHtml(opt)}</span></button>`).join("");
  $("quizOptions").querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",()=>selectAnswer(btn.dataset.answer,btn)));
}

function selectAnswer(answer, button) {
  if (selectedAnswer !== null) return;
  selectedAnswer = answer;
  const q = currentQuestions[currentIndex], correct = String(rightOf(q)).trim().toLowerCase(), chosen = String(answer).trim().toLowerCase();
  const isCorrect = chosen === correct;
  if (isCorrect) score++;
  $("quizOptions").querySelectorAll(".option-button").forEach(btn=>{
    btn.disabled = true;
    const val = btn.dataset.answer.trim().toLowerCase();
    if (val === correct) btn.classList.add("correct");
    else if (btn === button && !isCorrect) btn.classList.add("wrong");
  });
  $("quizFeedback").textContent = isCorrect ? "Lovely work — that's the correct answer." : `Not quite. The correct answer is: ${rightOf(q)}`;
  $("quizFeedback").classList.add(isCorrect ? "good" : "bad");
  $("answerHint").textContent = isCorrect ? "You got it!" : "Keep going — learning is the win.";
  $("nextQuestionBtn").disabled = false;
  $("nextQuestionBtn").textContent = currentIndex === currentQuestions.length-1 ? "See my results →" : "Next question →";
}

$("nextQuestionBtn").addEventListener("click",()=>{
  if (selectedAnswer === null) return;
  if (currentIndex < currentQuestions.length-1) { currentIndex++; renderQuizQuestion(); }
  else showResults();
});
function showResults() {
  const total = currentQuestions.length, pct = Math.round(score/total*100);
  $("scoreValue").textContent = `${score}/${total}`;
  $("scoreRing").style.setProperty("--score",`${pct*3.6}deg`);
  $("resultTitle").textContent = pct===100 ? "Perfectly brilliant!" : pct>=60 ? "Nicely done!" : "Good effort!";
  $("resultMessage").textContent = pct>=80 ? "You're building some seriously good knowledge." : "Every round is progress. Try again and see what sticks.";
  $("progressBar").style.width = "100%";
  showPage("result");
}
$("startRandomBtn").addEventListener("click",()=>startQuiz());
$("exitQuiz").addEventListener("click",()=>showPage("explore"));
$("retryQuiz").addEventListener("click",()=>startQuiz(lastQuiz.length && lastQuiz.every(q=>categoryOf(q)===categoryOf(lastQuiz[0])) ? categoryOf(lastQuiz[0]) : ""));

$("searchInput").addEventListener("input",renderExplore);
$("categoryFilter").addEventListener("change",renderExplore);
$("difficultyFilter").addEventListener("change",renderExplore);
$("clearFilters").addEventListener("click",()=>{$("searchInput").value="";$("categoryFilter").value="";$("difficultyFilter").value="";renderExplore();});

const form = $("addQuestionForm");
function updateAnswerChoices() {
  const values = ["option1","option2","option3","option4"].map(n=>form.elements[n].value.trim()).filter(Boolean);
  const select = form.elements.right_answer, old = select.value;
  select.innerHTML = `<option value="">Choose the correct option text</option>` + values.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  if (values.includes(old)) select.value = old;
}
["option1","option2","option3","option4"].forEach(n=>form.elements[n].addEventListener("input",updateAnswerChoices));
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await apiFetch(API.add,{method:"POST",body:JSON.stringify(data)});
    form.reset(); updateAnswerChoices(); $("formMessage").textContent="Question saved successfully.";
    showToast("Your question has been added."); await loadQuestions();
  } catch(error) { $("formMessage").textContent=`Could not save: ${error.message}`; }
});
async function deleteQuestion(id) {
  if (!confirm(`Delete question #${id}? This cannot be undone.`)) return;
  try { await apiFetch(API.remove(id),{method:"DELETE"}); showToast("Question deleted."); await loadQuestions(); }
  catch(error) { showToast(`Delete failed: ${error.message}`); }
}

loadQuestions();