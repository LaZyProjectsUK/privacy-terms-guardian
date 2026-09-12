import { Router } from "express";
import { analysePolicy } from "../analysis";
import { findAlternatives } from "../alternatives";
import { getProfile, saveProfile } from "../privacy-profile";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.post("/analyse", async (req, res) => {
  try {
    const { policyText } = req.body as { policyText?: string };
    if (!policyText) {
      return res.status(400).json({ error: "policyText is required" });
    }
    const result = await analysePolicy(policyText);
    res.json(result);
  } catch (err) {
    console.error("[analyse] failed:", err);
    res.status(502).json({ error: "analysis_failed", detail: String(err) });
  }
});

router.post("/alternatives", async (req, res) => {
  try {
    const { siteDescription, userId } = req.body as {
      siteDescription?: string;
      userId?: string;
    };
    if (!siteDescription) {
      return res.status(400).json({ error: "siteDescription is required" });
    }
    const profile = getProfile(userId ?? "anonymous");
    const result = await findAlternatives(siteDescription, profile);
    res.json(result);
  } catch (err) {
    console.error("[alternatives] failed:", err);
    res.status(502).json({ error: "alternatives_failed", detail: String(err) });
  }
});

router.get("/privacy-profile/:userId", (req, res) => {
  res.json(getProfile(req.params.userId));
});

router.put("/privacy-profile/:userId", (req, res) => {
  try {
    const profile = saveProfile(req.params.userId, req.body);
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: "invalid_profile", detail: String(err) });
  }
});
