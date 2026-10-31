let mediaStream = null;
let audioContext = null;
let recorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen") return;

  if (message.type === "START_RECORDING") {
    startRecording(message.streamId);
  }

  if (message.type === "STOP_RECORDING") {
    stopRecording();
  }
});

async function startRecording(streamId) {
  if (recorder && recorder.state !== "inactive") {
    console.log("Recording is already active");
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    audioContext = new AudioContext();

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(audioContext.destination);

    audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    recorder = new MediaRecorder(mediaStream, {
      mimeType,
    });

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);

        console.log("Audio chunk collected:", event.data.size, "bytes");
      }
    };

    recorder.onerror = (event) => {
      console.error("MediaRecorder error:", event.error);
    };

    recorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunks, {
          type: recorder.mimeType,
        });

        console.log("Complete audio size:", audioBlob.size);

        if (audioBlob.size > 0) {
          await uploadAudio(audioBlob);
        }
      } catch (error) {
        console.error("Audio processing error:", error);
      } finally {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        if (audioContext && audioContext.state !== "closed") {
          await audioContext.close();
        }

        mediaStream = null;
        audioContext = null;
        recorder = null;
        audioChunks = [];

        chrome.runtime.sendMessage({
          type: "RECORDING_STOPPED",
        });
      }
    };

    // Record one complete audio file
    recorder.start();

    chrome.runtime.sendMessage({
      type: "RECORDING_STARTED",
    });

    console.log("Audio recording started");
  } catch (error) {
    console.error("Audio capture error:", error);

    chrome.runtime.sendMessage({
      type: "RECORDING_ERROR",
      error: error.message,
    });

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }

    mediaStream = null;
  }
}

async function uploadAudio(audioBlob) {
  const formData = new FormData();

  const audioFile = new File([audioBlob], "meeting-audio.webm", {
    type: audioBlob.type,
  });

  formData.append("audio", audioFile);

  console.log("Uploading complete audio to backend...");

  const response = await fetch("http://localhost:5000/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Backend error ${response.status}: ${error}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Transcription failed");
  }

  console.log("Transcript received:", data.transcript);

  if (data.transcript && data.transcript.trim()) {
    chrome.runtime.sendMessage({
      type: "TRANSCRIPT",
      text: data.transcript,
      capturedAt: new Date().toISOString(),
    });
  }
}

function stopRecording() {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
    console.log("Stopping recording...");
  }
}

console.log("Offscreen audio script loaded");
