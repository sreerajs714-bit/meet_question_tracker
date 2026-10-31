import {
  extractQuestions,
  normalizeQuestion,
} from "../detector/questionDetector.js";

import { saveQuestion } from "../utils/storage.js";

let recording = false;
let starting = false;

// Create offscreen document
async function createOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({});

  const offscreenExists = contexts.some(
    (context) => context.contextType === "OFFSCREEN_DOCUMENT",
  );

  if (!offscreenExists) {
    await chrome.offscreen.createDocument({
      url: "audio/offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Capture Google Meet tab audio for transcription",
    });

    console.log("Offscreen document created");
  }
}

// Always open the side panel when clicking the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({
      tabId: tab.id,
    });

    console.log("Side panel opened");
  } catch (error) {
    console.error("Side panel error:", error);
  }
});

// Start recording
async function startRecording() {
  if (recording || starting) {
    console.log("Recording already active or starting");
    return;
  }

  starting = true;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url?.startsWith("https://meet.google.com/")) {
      throw new Error("Please open Google Meet first");
    }

    await createOffscreenDocument();

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });

    await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "START_RECORDING",
      streamId,
    });
  } catch (error) {
    console.error("Recording start error:", error.message);

    chrome.runtime.sendMessage({
      type: "RECORDING_ERROR",
      error: error.message,
    });
  } finally {
    starting = false;
  }
}

// Stop recording
function stopRecording() {
  if (!recording) return;

  chrome.runtime.sendMessage({
    target: "offscreen",
    type: "STOP_RECORDING",
  });
}

// Handle messages from side panel and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_RECORDING") {
    startRecording();
  }

  if (message.type === "STOP_RECORDING") {
    stopRecording();
  }

  if (message.type === "GET_RECORDING_STATUS") {
    sendResponse({
      recording,
      starting,
    });
    return true;
  }

  if (message.type === "RECORDING_STARTED") {
    recording = true;
    console.log("Recording started");
  }

  if (message.type === "RECORDING_STOPPED") {
    recording = false;
    console.log("Recording stopped");
  }

  if (message.type === "RECORDING_ERROR") {
    recording = false;
    starting = false;
    console.error("Recording error:", message.error);
  }

  if (message.type === "TRANSCRIPT") {
    (async () => {
      console.log("Received transcript:", message.text);

      const detectedQuestions = extractQuestions(message.text);

      for (const text of detectedQuestions) {
        const question = {
          text,
          normalized: normalizeQuestion(text),
          timestamp: message.capturedAt || Date.now(),
        };

        const saved = await saveQuestion(question);

        if (saved) {
          console.log("Question saved:", text);
        } else {
          console.log("Duplicate question skipped:", text);
        }
      }
    })();
  }
});
