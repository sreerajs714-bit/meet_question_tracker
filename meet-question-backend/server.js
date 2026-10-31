import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import transcriptionRoutes from "./routes/transcriptionRoutes.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Meet Question Tracker Backend Running",
  });
});

app.use("/api", transcriptionRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
