const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

function updateCounts() {
  const text = noteText.value;
  const length = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = `${length} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");
  if (length > 200) {
    charCount.classList.add("over");
  } else if (length > 180) {
    charCount.classList.add("warning");
  }
}

function clearDraft() {
  noteText.value = "";
  updateCounts();
  localStorage.removeItem("draft");
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("draft", noteText.value);
});

noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearDraft();
  }
});

clearBtn.addEventListener("click", clearDraft);

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")) {
    themeToggle.textContent = "Light mode";
    localStorage.setItem("theme", "dark");
  } else {
    themeToggle.textContent = "Dark mode";
    localStorage.setItem("theme", "light");
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const savedDraft = localStorage.getItem("draft");
  if (savedDraft) {
    noteText.value = savedDraft;
  }

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  }
  
  updateCounts();
});