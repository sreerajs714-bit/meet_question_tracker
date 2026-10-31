import express from "express";
import multer from "multer";
import { transcribeAudio } from "../services/transcriptionService.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});
router.get("/transcribe", (req, res) => {
  res.json({
    success: true,
    message: "Transcription API is working. Use POST to upload audio.",
  });
});
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required",
      });
    }

    const transcript = await transcribeAudio(
      req.file.buffer,
      req.file.mimetype,
    );

    return res.status(200).json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    return res.status(500).json({
      success: false,
      message: "Transcription failed",
    });
  }
});

export default router;
