export async function transcribeAudio(audioBuffer, mimeType) {
  try {
    const formData = new FormData();

    formData.append("model", "whisper-large-v3");
    formData.append("language", "en");
    formData.append("temperature", "0");
    formData.append(
      "prompt",
      "This is a technical software engineering interview. Technical terms include JavaScript, closure, hoisting, promises, callbacks, Node.js, React, MongoDB, and data structures.",
    );

    // Convert the audio buffer into a Blob
    const audioBlob = new Blob([audioBuffer], {
      type: mimeType || "audio/webm",
    });

    // Attach audio file
    formData.append("file", audioBlob, "meeting-audio.webm");

    // Send request to Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.text();

      throw new Error(`Groq API Error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    console.log("Transcription:", result.text);

    return result.text;
  } catch (error) {
    console.error("Transcription Service Error:", error);

    throw error;
  }
}
