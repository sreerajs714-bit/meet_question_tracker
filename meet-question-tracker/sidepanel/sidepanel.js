import { getQuestions } from "../utils/storage.js";

const questionList = document.getElementById("questionList");
const count = document.getElementById("count");
const exportBtn = document.getElementById("exportBtn");
const recordBtn = document.getElementById("recordBtn");
const clearBtn = document.getElementById("clearBtn");

let isRecording = false;
let isStarting = false;

// Render questions
function renderQuestions(questions) {
  questionList.innerHTML = "";

  count.textContent = `${questions.length} Questions`;

  if (questions.length === 0) {
    questionList.innerHTML = `
            <div class="empty">
                Waiting for interview questions...
            </div>
        `;
    return;
  }

  questions.forEach((question, index) => {
    const card = document.createElement("div");

    card.className = "question";

    const title = document.createElement("p");
    title.textContent = `${index + 1}. ${question.text}`;

    card.append(title);
    questionList.appendChild(card);
  });
}

// Update recording button
function updateRecordButton() {
  if (isRecording) {
    recordBtn.textContent = "Stop Recording";
    recordBtn.classList.add("recording");
  } else {
    recordBtn.textContent = "Record";
    recordBtn.classList.remove("recording");
  }

  recordBtn.disabled = isStarting;
}

// Load questions
async function loadQuestions() {
  const questions = await getQuestions();
  renderQuestions(questions);
}

// Get current recording status
async function checkRecordingStatus() {
  try {
    const status = await chrome.runtime.sendMessage({
      type: "GET_RECORDING_STATUS",
    });

    isRecording = status?.recording || false;
    isStarting = status?.starting || false;

    updateRecordButton();
  } catch (error) {
    console.error("Unable to get recording status:", error);
  }
}

// Listen for question updates
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.questions) {
    renderQuestions(changes.questions.newValue || []);
  }
});

// Listen for recording status updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RECORDING_STARTED") {
    isRecording = true;
    isStarting = false;
    updateRecordButton();
  }

  if (message.type === "RECORDING_STOPPED") {
    isRecording = false;
    isStarting = false;
    updateRecordButton();
  }

  if (message.type === "RECORDING_ERROR") {
    isRecording = false;
    isStarting = false;
    updateRecordButton();

    alert(message.error);
  }
});

// Record / Stop button
recordBtn.addEventListener("click", async () => {
  if (isStarting) return;

  if (isRecording) {
    isStarting = true;
    updateRecordButton();

    await chrome.runtime.sendMessage({
      type: "STOP_RECORDING",
    });
  } else {
    isStarting = true;
    updateRecordButton();

    await chrome.runtime.sendMessage({
      type: "START_RECORDING",
    });
  }
});

// Clear questions
clearBtn.addEventListener("click", async () => {
  const confirmed = confirm("Are you sure you want to clear all questions?");

  if (!confirmed) return;

  await chrome.storage.local.set({
    questions: [],
  });

  renderQuestions([]);

  console.log("All questions cleared");
});

// Export questions
exportBtn.addEventListener("click", async () => {
  const questions = await getQuestions();

  if (questions.length === 0) {
    alert("No questions available to export.");
    return;
  }

  const content = questions
    .map((question, index) => {
      return `${index + 1}. ${question.text}`;
    })
    .join("\n\n");

  const blob = new Blob([content], {
    type: "text/plain",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "interview-questions.txt";
  link.click();

  URL.revokeObjectURL(url);
});

// Initial load
loadQuestions();
checkRecordingStatus();
