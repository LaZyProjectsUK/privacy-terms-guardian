import "dotenv/config";
import cors from "cors";
import express from "express";
import { router } from "./routes";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", router);

const port = process.env.PORT ?? 8787;
app.listen(port, () => {
  console.log(`Privacy Guardian backend listening on :${port}`);
});
