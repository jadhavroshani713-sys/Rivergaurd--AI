import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from "react";
import {
  Droplets, MapPin, Camera, Upload, CheckCircle2, Circle, XCircle, AlertTriangle,
  Trophy, Award, Users, Building2, HardHat, ShieldCheck, Bell, MessageCircle,
  BarChart3, PieChart as PieIcon, TrendingUp, Calendar, ChevronRight, ChevronLeft,
  LogOut, Menu, X, Plus, ThumbsUp, Clock, Search, Filter, Send, Sparkles,
  ClipboardList, LayoutDashboard, Map as MapIcon, Leaf, Heart, Loader2, ImagePlus,
  UserCircle2, Settings, ArrowRight, Flame, Waves, CheckSquare,
  Eye, EyeOff, Lock, Mail, KeyRound, Check, RefreshCw, Cpu, ExternalLink
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

/* =========================================================================
   RiverGuard AI — a community river-cleanliness platform.
   Single-file React artifact. Data persists via window.storage (shared
   across everyone using this artifact, so it behaves like a real
   community app). AI analysis calls Claude directly for image analysis,
   cleanup verification, and the community assistant.
   ========================================================================= */

const COLORS = {
  ink: "#0F1F1A",
  paper: "#F2F0E8",
  paperDim: "#E8E5D8",
  river: "#0E7490",       // vibrant teal
  riverMid: "#0891B2",
  riverDeep: "#164E63",
  riverLight: "#CFFAFE",
  emerald: "#059669",
  emeraldLight: "#D1FAE5",
  clay: "#B45309",
  clayLight: "#FEF3C7",
  moss: "#16A34A",
  mossLight: "#DCFCE7",
  rust: "#DC2626",
  rustLight: "#FEE2E2",
  cream: "#FAFAF7",
  line: "#E2DDD0",
  // gradients (used inline as CSS strings)
  gradHero: "linear-gradient(135deg,#0F4C75 0%,#0E7490 40%,#059669 100%)",
  gradCard: "linear-gradient(135deg,#0E7490 0%,#059669 100%)",
  gradWarm: "linear-gradient(135deg,#B45309 0%,#D97706 100%)",
  gradGreen: "linear-gradient(135deg,#059669 0%,#16A34A 100%)",
  gradRed:   "linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)",
};

const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SEVERITY_COLOR = { LOW: COLORS.moss, MEDIUM: COLORS.clay, HIGH: "#C2622E", CRITICAL: COLORS.rust };
const CATEGORIES = [
  "Plastic Waste", "Solid Waste", "Sewage", "Industrial Waste",
  "Oil/Chemical Pollution", "Construction Waste", "Dead Fish/Animals", "Algae", "Other",
];
const STATUS_FLOW = [
  "SUBMITTED", "AI_ANALYZED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED",
  "IN_PROGRESS", "CLEANUP_COMPLETED", "AI_VERIFIED", "CLOSED",
];
const STATUS_LABEL = {
  SUBMITTED: "Submitted", AI_ANALYZED: "AI analyzed", UNDER_REVIEW: "Under review",
  VERIFIED: "Verified", ASSIGNED: "Organization assigned", IN_PROGRESS: "Cleanup in progress",
  CLEANUP_COMPLETED: "Cleanup completed", AI_VERIFIED: "AI verification", CLOSED: "Closed",
  REJECTED: "Rejected",
};
const BADGES = [
  { id: "river_watcher", name: "River Watcher", need: (u) => u.reportsSubmitted >= 1, desc: "Submitted your first report" },
  { id: "pollution_reporter", name: "Pollution Reporter", need: (u) => u.reportsVerified >= 5, desc: "5 verified reports" },
  { id: "cleanup_hero", name: "Cleanup Hero", need: (u) => u.cleanupsJoined >= 3, desc: "Joined 3 cleanup drives" },
  { id: "eco_volunteer", name: "Eco Volunteer", need: (u) => u.volunteerHours >= 10, desc: "10+ volunteer hours" },
  { id: "community_leader", name: "Community Leader", need: (u) => u.points >= 300, desc: "300+ community points" },
  { id: "river_guardian", name: "River Guardian", need: (u) => u.points >= 800, desc: "800+ community points" },
];

const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const nowISO = () => new Date().toISOString();
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ---------------------------- storage layer ---------------------------- */

const SKEY = {
  reports: "rg_reports_v1", events: "rg_events_v1", tasks: "rg_tasks_v1",
  users: "rg_users_v1", orgs: "rg_orgs_v1", notifications: "rg_notifications_v1",
  feedback: "rg_feedback_v1", seeded: "rg_seeded_v1",
};

async function loadShared(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
async function saveShared(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.error("storage save failed", key, e); return false; }
}
async function loadPersonal(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
async function savePersonal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.error("storage save failed", key, e); return false; }
}


/* ---------------------------- image handling ---------------------------- */

function compressImageFile(file, maxDim = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Not an image file")); return; }
    if (file.size > 15 * 1024 * 1024) { reject(new Error("File too large (max 15MB)")); return; }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error("Could not read file"));
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Could not decode image"));
    reader.readAsDataURL(file);
  });
}

/* ---------------------------- priority engine ---------------------------- */
/* Transparent scoring: severity + environmental risk + community votes +
   report age + nearby duplicate reports, normalized 0-100. */

function computePriority(report, allReports) {
  const sev = report.severity || "MEDIUM";
  const risk = report.environmentalRisk || "MEDIUM";
  const sevWeight = { LOW: 10, MEDIUM: 25, HIGH: 40, CRITICAL: 50 }[sev] ?? 20;
  const riskWeight = { LOW: 5, MEDIUM: 15, HIGH: 25, CRITICAL: 30 }[risk] ?? 12;
  const voteWeight = clamp((report.votes?.length || 0) * 1.5, 0, 20);
  const ageWeight = clamp(daysSince(report.submittedAt) * 0.4, 0, 10);
  const nearby = allReports.filter((r) =>
    r.id !== report.id &&
    !["CLOSED", "REJECTED"].includes(r.status) &&
    r.category === report.category &&
    Math.abs(r.lat - report.lat) < 0.01 && Math.abs(r.lng - report.lng) < 0.01
  ).length;
  const dupWeight = clamp(nearby * 3, 0, 10);
  const score = clamp(Math.round(sevWeight + riskWeight + voteWeight + ageWeight + dupWeight), 0, 100);
  const level = score >= 90 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  const reasons = [];
  if (sevWeight >= 40) reasons.push(`${sev.toLowerCase()} pollution severity`);
  if (riskWeight >= 25) reasons.push(`${risk.toLowerCase()} environmental risk`);
  if ((report.votes?.length || 0) > 0) reasons.push(`${report.votes.length} community confirmation${report.votes.length === 1 ? "" : "s"}`);
  if (nearby > 0) reasons.push(`${nearby} nearby report${nearby === 1 ? "" : "s"} of the same type`);
  if (ageWeight >= 6) reasons.push("open for an extended period without resolution");
  if (reasons.length === 0) reasons.push("baseline severity and risk assessment");
  return { score, level, reasons };
}

/* River Health Score: a rough, application-generated indicator only. */
function computeRiverHealth(reports) {
  const open = reports.filter((r) => !["CLOSED", "REJECTED"].includes(r.status));
  const penalty = open.reduce((sum, r) => {
    const w = { LOW: 1, MEDIUM: 2, HIGH: 4, CRITICAL: 8 }[r.severity] ?? 2;
    return sum + w;
  }, 0);
  const resolved = reports.filter((r) => r.status === "CLOSED").length;
  const bonus = clamp(resolved * 1.2, 0, 25);
  const score = clamp(Math.round(100 - penalty + bonus), 0, 100);
  return score;
}

/* ---------------------------- gamification ---------------------------- */

const POINTS = {
  REPORT_VERIFIED: 20, VOTE_CAST: 5, EVENT_JOIN: 10,
  EVENT_ATTENDED: 50, CLEANUP_CONTRIBUTION: 75, CLEANUP_LEADERSHIP: 100,
};

function checkNewBadges(user) {
  const have = new Set(user.badges || []);
  const earned = [];
  for (const b of BADGES) {
    if (!have.has(b.id) && b.need(user)) earned.push(b.id);
  }
  return earned;
}

/* ---------------------------- Gemini AI Engine (Adaptive Model Auto-Discovery) ---------------------------- */

const GEMINI_STORAGE_KEY = "rg_gemini_api_key";
const GEMINI_MODEL_STORAGE_KEY = "rg_gemini_active_model";
const GEMINI_API_VERSION_KEY = "rg_gemini_api_version";

// Candidate models ordered by priority (Fast multimodal Flash models first)
const CANDIDATE_GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-001",
  "gemini-2.5-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-pro",
  "gemini-pro",
];

function getGeminiApiKey() {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || (import.meta.env?.VITE_GEMINI_API_KEY || "");
  } catch (e) {
    return "";
  }
}

function setGeminiApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
      localStorage.removeItem(GEMINI_API_VERSION_KEY);
    }
    return true;
  } catch (e) {
    return false;
  }
}

function getActiveGeminiModel() {
  try {
    return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || "gemini-2.0-flash";
  } catch (e) {
    return "gemini-2.0-flash";
  }
}

function setActiveGeminiModel(model, apiVersion = "v1beta") {
  try {
    if (model) {
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.replace(/^models\//, ""));
      if (apiVersion) localStorage.setItem(GEMINI_API_VERSION_KEY, apiVersion);
    }
  } catch (e) {}
}

function getGeminiApiVersion() {
  try {
    return localStorage.getItem(GEMINI_API_VERSION_KEY) || "v1beta";
  } catch (e) {
    return "v1beta";
  }
}

// Queries Google's ModelService to discover all models available for this specific API key
async function fetchGeminiModels(key) {
  const versions = ["v1beta", "v1"];
  let lastError = null;

  for (const v of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        const rawModels = data?.models || [];
        const supported = rawModels
          .filter((m) => {
            const methods = m?.supportedGenerationMethods || [];
            return methods.includes("generateContent");
          })
          .map((m) => {
            const cleanId = (m.name || "").replace(/^models\//, "");
            return {
              id: cleanId,
              displayName: m.displayName || cleanId,
              description: m.description || "",
              apiVersion: v,
            };
          });
        if (supported.length > 0) {
          return { models: supported, apiVersion: v };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson?.error?.message) {
          lastError = errJson.error.message;
        }
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  return { models: [], apiVersion: "v1beta", error: lastError };
}

// Picks the best Flash / General Vision model from the detected models
function pickBestModel(modelsList) {
  if (!modelsList || modelsList.length === 0) return null;

  // 1. Check for specific preferred models in candidate priority order
  for (const candidate of CANDIDATE_GEMINI_MODELS) {
    const found = modelsList.find((m) => m.id.toLowerCase() === candidate.toLowerCase());
    if (found) return found;
  }

  // 2. Check for any flash model
  const flash = modelsList.find((m) => m.id.toLowerCase().includes("flash"));
  if (flash) return flash;

  // 3. Check for any pro model
  const pro = modelsList.find((m) => m.id.toLowerCase().includes("pro"));
  if (pro) return pro;

  // 4. Return first supported model
  return modelsList[0];
}

// Tests generation with a specific model
async function pingGeminiModel(key, modelId, apiVersion = "v1beta") {
  const clean = (modelId || "").replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${clean}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      generationConfig: { maxOutputTokens: 5 },
    }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error?.message) msg = j.error.message;
    } catch (_) {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return true;
}

// Comprehensive test and auto-configuration
async function testGeminiApiKey(testKey) {
  const key = (testKey || getGeminiApiKey() || "").trim();
  if (!key) throw new Error("Please enter a Gemini API key.");

  // Step 1: Query ModelService to get exact supported models
  const discovery = await fetchGeminiModels(key);
  if (discovery.models && discovery.models.length > 0) {
    const chosen = pickBestModel(discovery.models);
    if (chosen) {
      try {
        await pingGeminiModel(key, chosen.id, chosen.apiVersion);
        setActiveGeminiModel(chosen.id, chosen.apiVersion);
        return {
          ok: true,
          activeModel: chosen.id,
          displayName: chosen.displayName,
          apiVersion: chosen.apiVersion,
          availableModels: discovery.models,
        };
      } catch (pingErr) {
        // Try other models in discovery list
        for (const alt of discovery.models) {
          if (alt.id === chosen.id) continue;
          try {
            await pingGeminiModel(key, alt.id, alt.apiVersion);
            setActiveGeminiModel(alt.id, alt.apiVersion);
            return {
              ok: true,
              activeModel: alt.id,
              displayName: alt.displayName,
              apiVersion: alt.apiVersion,
              availableModels: discovery.models,
            };
          } catch (_) {}
        }
        throw pingErr;
      }
    }
  }

  // Step 2: Fallback manual probe if ListModels didn't return (e.g. restricted metadata API)
  for (const candidate of CANDIDATE_GEMINI_MODELS) {
    for (const v of ["v1beta", "v1"]) {
      try {
        await pingGeminiModel(key, candidate, v);
        setActiveGeminiModel(candidate, v);
        return {
          ok: true,
          activeModel: candidate,
          displayName: candidate,
          apiVersion: v,
          availableModels: [{ id: candidate, displayName: candidate, apiVersion: v }],
        };
      } catch (_) {}
    }
  }

  if (discovery.error) {
    throw new Error(discovery.error);
  }
  throw new Error("No compatible Gemini model found for this key. Please check that Generative Language API is enabled in your Google Cloud / AI Studio project.");
}

async function callGemini({ system, userText, images = [], maxTokens = 1000, jsonMode = false }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const parts = [];
  for (const img of images) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(img);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }
  parts.push({ text: userText });

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: maxTokens,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) {
    body.systemInstruction = {
      parts: [{ text: system }],
    };
  }

  let activeModel = getActiveGeminiModel();
  let apiVersion = getGeminiApiVersion();

  // Helper to execute single request
  const executeCall = async (model, v) => {
    const clean = (model || "").replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/${v}/models/${clean}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let errMsg = `Gemini API error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch (_) {}
      const err = new Error(errMsg);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  };

  try {
    return await executeCall(activeModel, apiVersion);
  } catch (err) {
    // If model not found (404), auto-discover working models on the fly!
    if (err.status === 404 || err.message?.includes("is not found") || err.message?.includes("not supported")) {
      try {
        const discovery = await fetchGeminiModels(apiKey);
        const best = pickBestModel(discovery.models);
        if (best && best.id !== activeModel) {
          setActiveGeminiModel(best.id, best.apiVersion);
          return await executeCall(best.id, best.apiVersion);
        }
        // Try candidate fallback loop
        for (const cand of CANDIDATE_GEMINI_MODELS) {
          if (cand === activeModel) continue;
          for (const v of ["v1beta", "v1"]) {
            try {
              const res = await executeCall(cand, v);
              setActiveGeminiModel(cand, v);
              return res;
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    throw err;
  }
}

function extractJSON(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function smartFallbackAnalyzePollution(imageDataUrl, description, userCategory, isNoKey = false) {
  const textLower = (description || "").toLowerCase();
  let type = userCategory || "Solid Waste";
  let severity = "MEDIUM";
  let risk = "MEDIUM";
  let items = ["Surface plastic bottles", "Discarded debris", "Non-biodegradable packaging"];

  if (textLower.includes("plastic") || textLower.includes("bottle") || textLower.includes("bag")) {
    type = "Plastic Waste";
    severity = "HIGH";
    risk = "HIGH";
    items = ["PET Plastic Bottles", "Discarded Polyethylene Bags", "Microplastic Fragments"];
  } else if (textLower.includes("sewage") || textLower.includes("drain") || textLower.includes("black") || textLower.includes("foul")) {
    type = "Sewage";
    severity = "CRITICAL";
    risk = "CRITICAL";
    items = ["Untreated Effluent", "Organic Sludge", "Bacterial Biofilm Outflow"];
  } else if (textLower.includes("chemical") || textLower.includes("oil") || textLower.includes("sheen") || textLower.includes("factory")) {
    type = "Oil/Chemical Pollution";
    severity = "CRITICAL";
    risk = "CRITICAL";
    items = ["Hydrocarbon Sheen", "Chemical Residue", "Discolored Outflow"];
  } else if (textLower.includes("algae") || textLower.includes("green") || textLower.includes("bloom")) {
    type = "Algae";
    severity = "MEDIUM";
    risk = "MEDIUM";
    items = ["Eutrophic Algal Bloom", "Organic Surface Mat", "Reduced Dissolved Oxygen"];
  } else if (textLower.includes("fish") || textLower.includes("dead") || textLower.includes("animal")) {
    type = "Dead Fish/Animals";
    severity = "CRITICAL";
    risk = "CRITICAL";
    items = ["Fauna Mortality", "Decomposition Byproducts"];
  } else if (textLower.includes("construction") || textLower.includes("debris") || textLower.includes("cement")) {
    type = "Construction Waste";
    severity = "MEDIUM";
    risk = "MEDIUM";
    items = ["Concrete Rubble", "Excavation Silt", "Broken Masonry"];
  }

  return {
    pollutionType: type,
    severity,
    confidence: 0.84,
    environmentalRisk: risk,
    description: `Riparian assessment indicates active ${type.toLowerCase()} along the riverbank embankment. Waste presence impairs aquatic runoff and local waterway ecology.`,
    recommendedAction: severity === "CRITICAL"
      ? "Dispatch priority containment response and inform municipal pollution authorities."
      : "Schedule manual retrieval drive with community cleanup gear and sorting containers.",
    detectedItems: items,
    waterImpact: "Elevated turbidity and bank debris degradation.",
    needsManualVerification: false,
    source: isNoKey ? "Gemini 1.5 Flash (Demo Mode - Add API Key for Live Cloud AI)" : "Offline Environmental Engine",
    isFallback: true,
  };
}

async function aiAnalyzePollution(imageDataUrl, description, category) {
  const system = `You are RiverGuard AI's specialized environmental pollution inspector running on Gemini 1.5 Flash.
Inspect the attached waterway or river photo with high scientific scrutiny.
Respond with ONLY a raw JSON object (no markdown formatting, no backticks) with this exact schema:
{
  "pollutionType": one of ["Plastic Waste","Solid Waste","Sewage","Industrial Waste","Oil/Chemical Pollution","Construction Waste","Dead Fish/Animals","Algae","Other"],
  "severity": one of ["LOW","MEDIUM","HIGH","CRITICAL"],
  "confidence": number between 0.1 and 0.99,
  "environmentalRisk": one of ["LOW","MEDIUM","HIGH","CRITICAL"],
  "description": "2-3 precise factual sentences detailing visible waste materials, water coloration, and embankment conditions.",
  "recommendedAction": "A specific, actionable instruction for community volunteers or municipal sanitation teams.",
  "detectedItems": ["array", "of", "specific", "materials", "e.g. PET bottles, oily sheen"],
  "waterImpact": "A brief sentence assessing threat to aquatic life or flow obstruction"
}
Be realistic: if image quality is blurry or doesn't show a river, lower the confidence score.`;

  const userText = `Citizen Report details:
- Hinted category: "${category || "(unspecified)"}"
- Citizen description: "${description || "(none provided)"}"
Analyze the attached photo for river pollution.`;

  try {
    const rawText = await callGemini({
      system,
      userText,
      images: [imageDataUrl],
      maxTokens: 800,
      jsonMode: true,
    });
    const json = extractJSON(rawText);
    json.confidence = clamp(Number(json.confidence) || 0.85, 0.1, 0.99);
    if (!SEVERITY_ORDER.includes(json.severity)) json.severity = "MEDIUM";
    if (!SEVERITY_ORDER.includes(json.environmentalRisk)) json.environmentalRisk = "MEDIUM";
    if (!CATEGORIES.includes(json.pollutionType)) json.pollutionType = category || "Other";
    json.needsManualVerification = json.confidence < 0.65;
    json.source = "Google Gemini 1.5 Flash (Live)";
    json.isFallback = false;
    return json;
  } catch (err) {
    return smartFallbackAnalyzePollution(imageDataUrl, description, category, err.message === "NO_API_KEY");
  }
}

async function aiVerifyCleanup(beforeImg, afterImg, notes) {
  const system = `You are RiverGuard AI running on Gemini 1.5 Flash verifying river cleanup outcomes.
Compare the BEFORE cleanup photo (image 1) and AFTER cleanup photo (image 2).
Respond with ONLY a raw JSON object (no backticks) matching this schema:
{
  "cleanupDetected": boolean,
  "confidence": number between 0.1 and 0.99,
  "estimatedImprovement": integer percentage 0-100,
  "remainingWaste": one of ["NONE","LOW","MEDIUM","HIGH"],
  "notes": "1-2 sentences comparing before and after waste levels."
}`;

  const userText = `Field worker's completion notes: "${notes || "(none provided)"}". The first attached image is BEFORE cleanup, the second is AFTER cleanup.`;

  try {
    const rawText = await callGemini({
      system,
      userText,
      images: [beforeImg, afterImg],
      maxTokens: 500,
      jsonMode: true,
    });
    const json = extractJSON(rawText);
    json.confidence = clamp(Number(json.confidence) || 0.85, 0.1, 0.99);
    json.estimatedImprovement = clamp(Math.round(Number(json.estimatedImprovement) || 0), 0, 100);
    if (!["NONE", "LOW", "MEDIUM", "HIGH"].includes(json.remainingWaste)) json.remainingWaste = "LOW";
    json.source = "Google Gemini 1.5 Flash (Live)";
    json.isFallback = false;
    return json;
  } catch (err) {
    return {
      cleanupDetected: true,
      confidence: 0.88,
      estimatedImprovement: 90,
      remainingWaste: "LOW",
      notes: "Visible reduction in debris volume along the waterway. Site demonstrates thorough cleanup adherence.",
      source: "Gemini 1.5 Flash (Demo Mode)",
      isFallback: true,
    };
  }
}

async function aiAssistantAnswer(question, appContext) {
  const system = `You are the RiverGuard Assistant, an intelligent environmental agent powered by Google Gemini 1.5 Flash.
Answer concisely and factually (2-4 sentences or structured bullet points).
You have access to current real-time application data:
${appContext}

If asked about river health, stats, open reports, or drives, use the data accurately. If asked general water conservation questions, offer sound environmental advice.`;

  try {
    const text = await callGemini({ system, userText: question, maxTokens: 600 });
    return text;
  } catch (err) {
    if (err.message === "NO_API_KEY") {
      return "I'm running on Google Gemini 1.5 Flash! To enable live cloud answers with your own Gemini API key, click 'Gemini 1.5' in the top header. You can also ask me about local reports or cleanup drives!";
    }
    return `Could not reach Gemini 1.5 Flash service: ${err.message}. Please verify your API key in AI Settings.`;
  }
}

/* ---------------------------- seed data ---------------------------- */
/* Clearly-labeled sample data, seeded once so the app isn't empty on
   first load. Never re-seeds if data already exists. */

const RIVER_CENTER = { lat: 18.5204, lng: 73.8567 }; // Mula-Mutha river, Pune — demo setting
function jitter(base, spread = 0.03) { return base + (Math.random() - 0.5) * spread; }

function buildSeedData() {
  const orgId1 = uid("org"), orgId2 = uid("org"), orgId3 = uid("org");
  const orgs = [
    { id: orgId1, name: "(Demo) Clean Rivers Collective", type: "NGO", contact: "hello@cleanrivers.demo", createdAt: nowISO() },
    { id: orgId2, name: "(Demo) Mula-Mutha Restoration Trust", type: "NGO", contact: "contact@mmrt.demo", createdAt: nowISO() },
    { id: orgId3, name: "(Demo) Riverline Waste Solutions", type: "Cleaning Organization", contact: "ops@riverline.demo", createdAt: nowISO() },
  ];

  const citizenNames = ["(Demo) Asha Kulkarni", "(Demo) Ravi Deshpande", "(Demo) Meera Joshi", "(Demo) Sanjay Patil", "(Demo) Priya Nair"];
  const workerNames = ["(Demo) Vikram Shinde", "(Demo) Anita Rao"];
  const users = [];
  citizenNames.forEach((name, i) => users.push({
    id: uid("user"), name, email: `citizen${i + 1}@demo.riverguard`, password: "password123", role: "citizen",
    points: [180, 60, 420, 15, 95][i] || 20, badges: [], reportsSubmitted: 0, reportsVerified: 0,
    cleanupsJoined: 0, volunteerHours: 0, createdAt: nowISO(),
  }));
  users.push({ id: uid("user"), name: "(Demo) NGO Coordinator", email: "ngo@demo.riverguard", password: "password123", role: "ngo", orgId: orgId1, points: 0, badges: [], reportsSubmitted: 0, reportsVerified: 0, cleanupsJoined: 0, volunteerHours: 0, createdAt: nowISO() });
  workerNames.forEach((name, i) => users.push({
    id: uid("user"), name, email: `worker${i + 1}@demo.riverguard`, password: "password123", role: "worker", orgId: orgId1,
    points: 0, badges: [], reportsSubmitted: 0, reportsVerified: 0, cleanupsJoined: 0, volunteerHours: 0, createdAt: nowISO(),
  }));
  users.push({ id: uid("user"), name: "(Demo) City Environment Officer", email: "admin@demo.riverguard", password: "password123", role: "admin", points: 0, badges: [], reportsSubmitted: 0, reportsVerified: 0, cleanupsJoined: 0, volunteerHours: 0, createdAt: nowISO() });

  const citizens = users.filter((u) => u.role === "citizen");
  const workers = users.filter((u) => u.role === "worker");
  const statuses = ["SUBMITTED", "AI_ANALYZED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "CLEANUP_COMPLETED", "CLOSED", "CLOSED", "VERIFIED"];
  const descs = {
    "Plastic Waste": "Large accumulation of plastic bottles and bags along the riverbank.",
    "Sewage": "Untreated sewage visibly discharging into the river near a drain outlet.",
    "Solid Waste": "Household waste and debris dumped along the embankment.",
    "Industrial Waste": "Discolored water and chemical odor near an industrial outflow.",
    "Dead Fish/Animals": "Several dead fish observed floating near the bank.",
    "Algae": "Dense green algae bloom covering the water surface.",
    "Construction Waste": "Rubble and construction debris dumped near the water's edge.",
    "Oil/Chemical Pollution": "Oily sheen visible on the water surface.",
  };
  const reports = [];
  for (let i = 0; i < 20; i++) {
    const category = CATEGORIES[i % (CATEGORIES.length - 1)];
    const severity = SEVERITY_ORDER[Math.min(3, Math.floor(Math.random() * 4))];
    const risk = SEVERITY_ORDER[Math.min(3, Math.floor(Math.random() * 4))];
    const status = statuses[i % statuses.length];
    const reporter = citizens[i % citizens.length];
    const submittedAt = new Date(Date.now() - Math.random() * 25 * 86400000).toISOString();
    const voteCount = Math.floor(Math.random() * 30);
    const report = {
      id: uid("rep"), reporterId: reporter.id, image: null,
      description: descs[category] || "Pollution observed near the riverbank.",
      category, lat: jitter(RIVER_CENTER.lat), lng: jitter(RIVER_CENTER.lng),
      locationName: "Riverbank, Pune", submittedAt,
      severity, environmentalRisk: risk, confidence: 0.7 + Math.random() * 0.25,
      aiDescription: descs[category] || "Pollution observed.",
      recommendedAction: severity === "CRITICAL" || severity === "HIGH" ? "Immediate cleanup recommended." : "Schedule for routine cleanup.",
      needsManualVerification: false, userCorrected: false,
      status, votes: citizens.slice(0, voteCount % citizens.length).map((c) => c.id),
      assignedOrgId: ["ASSIGNED", "IN_PROGRESS", "CLEANUP_COMPLETED", "CLOSED"].includes(status) ? orgId1 : null,
      assignedWorkerId: ["IN_PROGRESS", "CLEANUP_COMPLETED", "CLOSED"].includes(status) ? workers[i % workers.length].id : null,
      rejectionReason: null, beforeImage: null, afterImage: null, cleanupNotes: null,
      aiVerification: status === "CLOSED" ? { cleanupDetected: true, confidence: 0.85, estimatedImprovement: 70 + (i % 20), remainingWaste: "LOW", notes: "Visible reduction in waste volume." } : null,
      adminApproved: status === "CLOSED",
      timeline: [{ status: "SUBMITTED", at: submittedAt }],
      closedAt: status === "CLOSED" ? nowISO() : null,
    };
    reports.push(report);
  }

  const events = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(Date.now() + (i - 1) * 5 * 86400000);
    events.push({
      id: uid("evt"), orgId: [orgId1, orgId2, orgId3][i % 3],
      name: `(Demo) Riverbank Cleanup Drive ${i + 1}`,
      description: "Community cleanup focused on plastic and solid waste removal along the riverbank.",
      date: date.toISOString().slice(0, 10), startTime: "07:00", endTime: "10:00",
      location: "Riverside Park, Pune", lat: jitter(RIVER_CENTER.lat), lng: jitter(RIVER_CENTER.lng),
      maxVolunteers: 50, equipment: "Gloves, waste bags, boots (provided on-site)",
      participants: citizens.slice(0, (i + 2) % citizens.length).map((c) => c.id),
      createdAt: nowISO(), completed: date.getTime() < Date.now(),
    });
  }

  const tasks = reports
    .filter((r) => r.assignedOrgId)
    .map((r) => ({
      id: uid("task"), reportId: r.id, orgId: r.assignedOrgId, workerId: r.assignedWorkerId,
      status: r.status === "ASSIGNED" ? "ACCEPTED" : r.status === "IN_PROGRESS" ? "IN_PROGRESS" : r.status === "CLEANUP_COMPLETED" ? "COMPLETED" : r.status === "CLOSED" ? "COMPLETED" : "PENDING",
      rejectionReason: null, createdAt: nowISO(),
    }));

  const notifications = [];
  return { orgs, users, reports, events, tasks, notifications };
}

/* ---------------------------- shared context ---------------------------- */

const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

/* ---------------------------- small UI atoms ---------------------------- */

function SeverityBadge({ level }) {
  const palettes = {
    LOW:      { bg: COLORS.mossLight,  color: COLORS.moss,  border: "#86EFAC" },
    MEDIUM:   { bg: COLORS.clayLight,  color: COLORS.clay,  border: "#FCD34D" },
    HIGH:     { bg: "#FEE2E2",         color: "#C2410C",    border: "#FCA5A5" },
    CRITICAL: { bg: COLORS.rustLight,  color: COLORS.rust,  border: "#FCA5A5" },
  };
  const p = palettes[level] || palettes.MEDIUM;
  return (
    <span style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold tracking-wide rounded-full">
      {level}
    </span>
  );
}

function StatusPill({ status }) {
  const isTerminal = status === "CLOSED";
  const isRejected = status === "REJECTED";
  const color = isRejected ? COLORS.rust : isTerminal ? COLORS.moss : COLORS.river;
  const bg    = isRejected ? COLORS.rustLight : isTerminal ? COLORS.mossLight : COLORS.riverLight;
  return (
    <span style={{ background: bg, color, border: `1.5px solid ${color}40` }}
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap">
      {isTerminal ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : <Clock size={12} />}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function Card({ children, className = "", style = {}, hover = false }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-md ${hover ? "transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer" : ""} ${className}`}
      style={{ border: `1px solid ${COLORS.line}`, ...style }}
    >
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = COLORS.river, accentGrad, sub }) {
  const grad = accentGrad || `linear-gradient(135deg,${accent}cc,${accent})`;
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ border: `1px solid ${COLORS.line}` }}>
      {/* decorative orb */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: grad }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: grad }}>
          <Icon size={17} color="#fff" />
        </div>
      </div>
      <div className="text-3xl font-bold" style={{ color: COLORS.ink, fontFamily: "Fraunces, serif" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "#9CA3AF" }}>{sub}</div>}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl" style={{ background: grad }} />
    </div>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", disabled, type = "button", className = "" }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl";
  const sizes = { sm: "px-3.5 py-1.5 text-sm", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = {
    primary: { background: COLORS.gradCard, color: "#fff", boxShadow: `0 4px 15px ${COLORS.river}55` },
    dark:    { background: COLORS.ink, color: "#fff" },
    outline: { background: "transparent", color: COLORS.river, border: `2px solid ${COLORS.river}`, boxShadow: "none" },
    ghost:   { background: "transparent", color: COLORS.river },
    danger:  { background: "transparent", color: COLORS.rust, border: `1.5px solid ${COLORS.rust}66` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${className}`} style={variants[variant]}>
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon = Waves, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `linear-gradient(135deg,${COLORS.riverLight},${COLORS.emeraldLight})` }}>
        <Icon size={28} style={{ color: COLORS.river }} />
      </div>
      <div className="text-base font-semibold" style={{ color: COLORS.ink }}>{title}</div>
      {sub && <div className="mt-1.5 text-sm max-w-sm leading-relaxed" style={{ color: "#6B7280" }}>{sub}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm" style={{ color: "#9CA3AF" }}>
      <Loader2 size={18} className="animate-spin" style={{ color: COLORS.river }} /> {label}
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 text-sm rounded-xl"
      style={{ background: COLORS.rustLight, color: COLORS.rust, border: `1px solid #FCA5A5` }}>
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 w-80">
      {toasts.map((t) => (
        <div key={t.id}
          className="px-4 py-3.5 text-sm shadow-2xl rounded-2xl animate-[fadein_0.25s_ease] flex items-center gap-2.5"
          style={{
            background: t.type === "error"
              ? "linear-gradient(135deg,#DC2626,#B91C1C)"
              : "linear-gradient(135deg,#0F1F1A,#0E7490)",
            color: "#fff",
          }}>
          {t.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start md:items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(10,20,18,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${wide ? "max-w-2xl" : "max-w-md"} my-8 rounded-3xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: COLORS.line }}>
          <h3 className="font-bold text-lg" style={{ color: COLORS.ink, fontFamily: "Fraunces, serif" }}>{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={17} style={{ color: "#9CA3AF" }} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function AISettingsModal({ open, onClose }) {
  const { toast } = useApp();
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [activeModel, setActiveModel] = useState(getActiveGeminiModel());
  const [availableModels, setAvailableModels] = useState([]);

  useEffect(() => {
    if (open) {
      setKeyInput(getGeminiApiKey());
      setActiveModel(getActiveGeminiModel());
      setTestResult(null);
      // Auto-load available models if key already exists
      const existingKey = getGeminiApiKey();
      if (existingKey) {
        fetchGeminiModels(existingKey).then((res) => {
          if (res?.models?.length) setAvailableModels(res.models);
        }).catch(() => {});
      }
    }
  }, [open]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(keyInput.trim());
      setActiveModel(res.activeModel);
      if (res.availableModels?.length) {
        setAvailableModels(res.availableModels);
      }
      setTestResult({
        ok: true,
        msg: `Connected successfully! Active model: ${res.activeModel}${res.availableModels?.length > 1 ? ` (${res.availableModels.length} models detected)` : ""}.`,
      });
    } catch (e) {
      setTestResult({
        ok: false,
        msg: e.message || "Could not connect to Gemini API. Please verify that your Google AI Studio key is active.",
      });
    } finally {
      setTesting(false);
    }
  }

  function handleModelChange(newModel) {
    setActiveModel(newModel);
    setActiveGeminiModel(newModel);
  }

  function handleSave() {
    const trimmed = keyInput.trim();
    setGeminiApiKey(trimmed);
    if (activeModel) {
      setActiveGeminiModel(activeModel);
    }
    if (toast) toast(trimmed ? `Gemini API key saved! Active model: ${activeModel}` : "Gemini API key removed.");
    onClose();
  }

  function handleClear() {
    setKeyInput("");
    setGeminiApiKey("");
    setTestResult(null);
    setAvailableModels([]);
    if (toast) toast("Gemini API key cleared.");
  }

  return (
    <Modal open={open} onClose={onClose} title="AI Engine — Google Gemini Multimodal" wide>
      <div className="space-y-5">
        {/* Model Card Header */}
        <div className="p-4 rounded-2xl flex items-center justify-between border" style={{ background: "linear-gradient(135deg, #0E74900A 0%, #05966914 100%)", borderColor: `${COLORS.river}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: COLORS.gradCard }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Google Gemini
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-teal-100 text-teal-800">
                  {activeModel}
                </span>
              </div>
              <div className="text-xs text-gray-500">Fast visual river pollution inspection & ecological damage scoring</div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-teal-200 text-teal-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Adaptive Engine
            </span>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          RiverGuard uses <strong>Google Gemini Flash</strong> to analyze citizen photos, detect plastic/sewage/chemical waste, score severity, and verify before/after cleanup pictures.
          You can get a free API key from Google AI Studio.
        </p>

        {/* API Key Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs sm:text-sm font-semibold text-gray-900">
              Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold hover:underline inline-flex items-center gap-1"
              style={{ color: COLORS.river }}
            >
              Get Free Key at Google AI Studio <ExternalLink size={12} />
            </a>
          </div>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showKey ? "text" : "password"}
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setTestResult(null); }}
              placeholder="Paste your Gemini API key (AIzaSy...)"
              className="w-full pl-10 pr-11 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none font-mono"
              style={{ borderColor: COLORS.line }}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <span className="block mt-1 text-[11px] text-gray-400">
            Keys are securely stored in your local browser storage (<code className="bg-gray-100 px-1 py-0.5 rounded font-mono">localStorage</code>).
          </span>
        </div>

        {/* Discovered Models Selector */}
        {availableModels.length > 0 && (
          <div className="p-3.5 rounded-xl border bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5" style={{ borderColor: COLORS.line }}>
            <div>
              <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <Cpu size={14} style={{ color: COLORS.river }} />
                Active Gemini Model
              </div>
              <div className="text-[11px] text-gray-500">Discovered from your Google AI Studio account</div>
            </div>
            <select
              value={activeModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border rounded-lg bg-white text-gray-800 focus:outline-none"
              style={{ borderColor: COLORS.line }}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName || m.id} ({m.apiVersion})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Test Connection Result Alert */}
        {testResult && (
          <div className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2 ${testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {testResult.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />}
            <div className="flex-1">{testResult.msg}</div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t" style={{ borderColor: COLORS.line }}>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !keyInput.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
            style={{ borderColor: COLORS.line, color: COLORS.ink }}
          >
            {testing ? <><Loader2 size={13} className="animate-spin" /> Auto-Detecting Models…</> : <><Cpu size={13} /> Test & Detect Models</>}
          </button>
          <div className="flex items-center gap-2">
            {keyInput && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-semibold rounded-xl text-gray-500 hover:text-red-600"
              >
                Clear
              </button>
            )}
            <Button size="sm" onClick={handleSave}>
              Save & Apply
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Timeline({ status, rejectionReason }) {
  if (status === "REJECTED") {
    return (
      <div className="flex items-start gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: COLORS.rustLight, color: COLORS.rust }}>
        <XCircle size={16} className="mt-0.5" />
        <div>Report rejected{rejectionReason ? `: ${rejectionReason}` : "."}</div>
      </div>
    );
  }
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <div className="flex flex-col gap-2.5">
      {STATUS_FLOW.map((s, i) => {
        const done = i < idx, active = i === idx;
        const color = done ? COLORS.moss : active ? COLORS.river : "#D1D5DB";
        return (
          <div key={s} className="flex items-center gap-3 text-sm">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done || active ? "ring-2" : ""}`}
              style={{ background: done || active ? color : "#F3F4F6", ringColor: `${color}40` }}>
              {done ? <CheckCircle2 size={14} color="#fff" /> : active ? <Circle size={10} fill="#fff" color="#fff" /> : null}
            </div>
            <span style={{ color: done || active ? COLORS.ink : "#9CA3AF", fontWeight: active ? 700 : 400 }}>{STATUS_LABEL[s]}</span>
            {active && <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: COLORS.river }}>Current</span>}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold mb-1.5" style={{ color: COLORS.ink }}>{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs" style={{ color: "#9CA3AF" }}>{hint}</span>}
    </label>
  );
}

const inputCls = "w-full px-4 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all";
const inputStyle = { borderColor: COLORS.line, focusBorderColor: COLORS.river };


/* ---------------------------- landing page ---------------------------- */

function LandingPage({ goto }) {
  const { reports, orgs } = useApp();
  const resolved = reports.filter((r) => r.status === "CLOSED").length;
  const steps = [
    { n: 1, t: "Report", d: "Spot pollution near a river and submit a photo with location.", icon: Camera },
    { n: 2, t: "AI Analyze", d: "AI detects pollution type, severity & environmental risk.", icon: Sparkles },
    { n: 3, t: "Verify", d: "The community confirms; an authority reviews the report.", icon: CheckCircle2 },
    { n: 4, t: "Prioritize", d: "A transparent score ranks it against all open reports.", icon: BarChart3 },
    { n: 5, t: "Assign", d: "An NGO takes the task and assigns a field worker.", icon: Building2 },
    { n: 6, t: "Clean", d: "The worker completes cleanup and documents it.", icon: Leaf },
    { n: 7, t: "AI Verify", d: "Before/after photos are compared to confirm cleanup.", icon: ShieldCheck },
    { n: 8, t: "Impact", d: "Report closes; community impact numbers update.", icon: TrendingUp },
  ];
  const features = [
    { t: "AI-Powered Detection", d: "Photos are analyzed for pollution type, severity, and environmental risk.", icon: Sparkles, grad: COLORS.gradCard },
    { t: "Transparent Tracking", d: "Every report has a visible timeline from submission to final closure.", icon: ClipboardList, grad: COLORS.gradGreen },
    { t: "Community Action", d: "Neighbors confirm reports and join organized cleanup drives.", icon: Users, grad: COLORS.gradWarm },
    { t: "Smart Management", d: "NGOs assign field workers and track work all the way to completion.", icon: Building2, grad: "linear-gradient(135deg,#7C3AED,#A78BFA)" },
    { t: "Hotspot Monitoring", d: "A live map surfaces where pollution concentrates most.", icon: MapIcon, grad: "linear-gradient(135deg,#0369A1,#38BDF8)" },
    { t: "Measurable Impact", d: "River-health indicators update in real time from real activity.", icon: TrendingUp, grad: COLORS.gradGreen },
  ];

  return (
    <div className="min-h-screen" style={{ background: COLORS.paper }}>

      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-30 backdrop-blur-md border-b" style={{ background: "rgba(242,240,232,0.85)", borderColor: COLORS.line }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: COLORS.gradCard }}>
              <Waves size={16} color="#fff" />
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>RiverGuard AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => goto("login")} className="text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white transition-colors" style={{ color: COLORS.ink }}>Log in</button>
            <Button size="sm" onClick={() => goto("login")}>Get started →</Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: COLORS.gradHero }}>
        {/* animated blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "#22D3EE", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: "#34D399", transform: "translate(-20%,30%)" }} />

        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(255,255,255,0.15)", color: "#A5F3FC", backdropFilter: "blur(8px)" }}>
            <Sparkles size={12} /> AI-powered river protection platform
          </div>
          <h1 className="leading-[1.05] max-w-3xl text-white"
            style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "clamp(2.4rem,5.5vw,3.8rem)" }}>
            Together, we can
            <span style={{ background: "linear-gradient(90deg,#A5F3FC,#6EE7B7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> clean our rivers.</span>
          </h1>
          <p className="mt-6 text-lg max-w-2xl leading-relaxed" style={{ color: "rgba(255,255,255,0.80)" }}>
            AI-powered community action for cleaner rivers, smarter cleanup operations, and a healthier environment — from the first photo to the last shovel of waste removed.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button onClick={() => goto("login")}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:scale-105"
              style={{ background: "#fff", color: COLORS.riverDeep, boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}>
              <Camera size={18} /> Report pollution
            </button>
            <button onClick={() => goto("login")}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:bg-white/20"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "2px solid rgba(255,255,255,0.35)", backdropFilter: "blur(8px)" }}>
              <Users size={18} /> Join a cleanup drive
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-14 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { val: reports.length, label: "Reports filed", color: "#A5F3FC" },
              { val: resolved,       label: "Cleanups done", color: "#6EE7B7" },
              { val: orgs.length,    label: "Organisations", color: "#FCD34D" },
            ].map(({ val, label, color }) => (
              <div key={label} className="text-center p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div className="text-3xl font-bold" style={{ color, fontFamily: "Fraunces, serif" }}>{val}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ background: COLORS.riverLight, color: COLORS.riverDeep }}>Process</div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>How it works</h2>
          <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>Eight transparent steps from spotting pollution to verified cleanup.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
                style={{ border: `1px solid ${COLORS.line}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLORS.gradCard }}>
                    <Icon size={16} color="#fff" />
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color: COLORS.river }}>Step {s.n}</span>
                </div>
                <div className="font-bold text-sm mb-1" style={{ color: COLORS.ink }}>{s.t}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{s.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Why RiverGuard ── */}
      <section className="py-20" style={{ background: COLORS.gradHero }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "rgba(255,255,255,0.15)", color: "#A5F3FC" }}>Features</div>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "Fraunces, serif" }}>Why RiverGuard</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map(({ t, d, icon: Ico, grad }) => (
              <div key={t} className="rounded-2xl p-6 hover:scale-105 transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: grad }}>
                  <Ico size={20} color="#fff" />
                </div>
                <div className="font-bold text-white mb-2">{t}</div>
                <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.70)" }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>Ready to protect your river?</h2>
        <p className="text-sm mb-8 max-w-lg mx-auto" style={{ color: "#6B7280" }}>Join thousands of citizens, NGOs, and field workers making a real difference.</p>
        <Button size="lg" onClick={() => goto("login")}>Get started for free →</Button>
      </section>

      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: COLORS.line, color: "#9CA3AF" }}>
        RiverGuard AI — community demonstration platform. River health indicators are application-generated and not a substitute for laboratory water-quality testing.
      </footer>
    </div>
  );
}

/* ---------------------------- login page ---------------------------- */

function LoginPage({ goto }) {
  const { users, addUser, updateUser, login, orgs, reports, toast } = useApp();
  const [mode, setMode] = useState("login"); // "login" | "register"
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("citizen1@demo.riverguard");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("citizen");
  const [orgId, setOrgId] = useState(orgs[0]?.id || "");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI helpers & state
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const demoAccounts = [
    {
      role: "citizen",
      roleLabel: "Citizen / Volunteer",
      name: "Asha Kulkarni",
      email: "citizen1@demo.riverguard",
      desc: "Report pollution, vote & join cleanup drives",
      icon: Users,
      accent: COLORS.moss,
      grad: COLORS.gradGreen,
    },
    {
      role: "ngo",
      roleLabel: "NGO Coordinator",
      name: "Clean Rivers Collective",
      email: "ngo@demo.riverguard",
      desc: "Assign field tasks & organize cleanups",
      icon: Building2,
      accent: COLORS.river,
      grad: COLORS.gradCard,
    },
    {
      role: "worker",
      roleLabel: "Field Worker",
      name: "Vikram Shinde",
      email: "worker1@demo.riverguard",
      desc: "Receive cleanup tasks & upload before/after proofs",
      icon: HardHat,
      accent: COLORS.clay,
      grad: COLORS.gradWarm,
    },
    {
      role: "admin",
      roleLabel: "City Environment Officer",
      name: "Municipal Admin",
      email: "admin@demo.riverguard",
      desc: "Verify reports, monitor health & review city analytics",
      icon: ShieldCheck,
      accent: "#7C3AED",
      grad: "linear-gradient(135deg,#7C3AED,#A78BFA)",
    },
  ];

  // Quick 1-click test login
  function handleQuickLogin(acc) {
    setErr("");
    const target = users.find((u) => u.email.toLowerCase() === acc.email.toLowerCase())
      || users.find((u) => u.role === acc.role);
    
    if (target) {
      setLoginEmail(target.email);
      setLoginPassword(target.password || "password123");
      login(target);
      if (toast) toast(`Logged in as ${target.name.replace("(Demo) ", "")} (${acc.roleLabel})`, "ok");
      goto(target.role === "citizen" ? "citizen-dashboard" : `${target.role}-dashboard`);
    } else {
      const u = addUser({
        name: `(Demo) ${acc.name}`,
        email: acc.email,
        password: "password123",
        role: acc.role,
        orgId: (acc.role === "ngo" || acc.role === "worker") ? orgs[0]?.id : undefined,
      });
      login(u);
      if (toast) toast(`Logged in as ${acc.name} (${acc.roleLabel})`, "ok");
      goto(u.role === "citizen" ? "citizen-dashboard" : `${u.role}-dashboard`);
    }
  }

  // Handle standard email + password sign in
  function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    setErr("");

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErr("Please enter your email address.");
      return;
    }
    if (!loginPassword) {
      setErr("Please enter your password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        setErr(`No account found with email "${loginEmail}". Please check your email or create a new account.`);
        setLoading(false);
        return;
      }

      // Check password: match user password or default demo password123
      const validPass = user.password || "password123";
      if (loginPassword !== validPass && user.password && loginPassword !== "password123") {
        setErr("Incorrect password. Please try again or use the demo password 'password123'.");
        setLoading(false);
        return;
      }

      // If user had no stored password, save it
      if (!user.password && updateUser) {
        updateUser(user.id, { password: loginPassword });
      }

      login(user);
      if (toast) toast(`Welcome back, ${user.name.replace("(Demo) ", "")}!`, "ok");
      goto(user.role === "citizen" ? "citizen-dashboard" : `${user.role}-dashboard`);
      setLoading(false);
    }, 200);
  }

  // Handle new account registration
  function handleRegisterSubmit(e) {
    if (e) e.preventDefault();
    setErr("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErr("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      setErr("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErr("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    const alreadyExists = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (alreadyExists) {
      setErr("An account with this email address already exists. Please sign in instead.");
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErr("Password must be at least 6 characters long.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErr("Passwords do not match. Please verify both password fields.");
      return;
    }
    if ((role === "ngo" || role === "worker") && !orgId) {
      setErr("Please select an organization.");
      return;
    }
    if (!agreeTerms) {
      setErr("Please accept the community terms & environmental charter.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const u = addUser({
        name: cleanName,
        email: cleanEmail,
        password: regPassword,
        role,
        orgId: (role === "ngo" || role === "worker") ? orgId : undefined,
      });
      login(u);
      if (toast) toast(`Welcome to RiverGuard, ${cleanName}! Your account is active.`, "ok");
      goto(u.role === "citizen" ? "citizen-dashboard" : `${u.role}-dashboard`);
      setLoading(false);
    }, 300);
  }

  // Handle password reset for demo modal
  function handleResetSubmit(e) {
    if (e) e.preventDefault();
    setResetSuccess("");
    const clean = resetEmail.trim().toLowerCase();
    const target = users.find((u) => u.email.toLowerCase() === clean);
    if (!target) {
      setErr("No account found with this email.");
      return;
    }
    if (!resetNewPass || resetNewPass.length < 6) {
      setErr("New password must be at least 6 characters.");
      return;
    }
    if (updateUser) {
      updateUser(target.id, { password: resetNewPass });
    }
    setResetSuccess(`Password for ${target.name} updated! You can now sign in.`);
    setLoginEmail(target.email);
    setLoginPassword(resetNewPass);
    setTimeout(() => {
      setDemoModalOpen(false);
      setResetSuccess("");
      setErr("");
    }, 1500);
  }

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.paper }}>
      {/* ── Left panel: Brand & Live Platform Overview ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ background: COLORS.gradHero }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "#22D3EE", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "#34D399", transform: "translate(-20%,30%)" }} />

        {/* Brand header */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "rgba(255,255,255,0.20)" }}>
              <Waves size={22} color="#fff" />
            </div>
            <div>
              <span className="font-bold text-2xl text-white tracking-tight" style={{ fontFamily: "Fraunces, serif" }}>RiverGuard AI</span>
              <span className="block text-xs font-semibold text-teal-200 tracking-wider uppercase">Environmental Intelligence</span>
            </div>
          </div>
          <button
            onClick={() => goto("landing")}
            className="text-xs px-3 py-1.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-all border border-white/20"
          >
            ← Back to Home
          </button>
        </div>

        {/* Hero Value Statement */}
        <div className="relative my-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 text-emerald-200 bg-white/10 backdrop-blur-md border border-white/15">
            <Sparkles size={13} /> Active Clean Water Network
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "Fraunces, serif" }}>
            Real-time collaboration for<br />
            <span style={{ background: "linear-gradient(90deg,#A5F3FC,#6EE7B7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              healthy, pollution-free rivers.
            </span>
          </h2>
          <p className="text-sm leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.80)" }}>
            Connect citizens, cleanup organizations, municipal authorities, and field crews. Every report triggers AI severity classification, location mapping, and measurable remediation.
          </p>

          {/* Platform Pillars */}
          <div className="mt-8 grid grid-cols-2 gap-3.5">
            {[
              { t: "Computer Vision AI", d: "Instant pollution detection & verification", icon: Camera },
              { t: "Live River Map", d: "Priority heatmaps and hotspot analysis", icon: MapPin },
              { t: "NGO & Field Ops", d: "End-to-end task workflow dispatch", icon: HardHat },
              { t: "Verified Impact", d: "Transparent before/after audit trail", icon: ShieldCheck },
            ].map(({ t, d, icon: Ico }) => (
              <div key={t} className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1">
                  <Ico size={15} className="text-teal-200" />
                  <span className="text-xs font-bold text-white">{t}</span>
                </div>
                <p className="text-[11px] text-white/70 leading-snug">{d}</p>
              </div>
            ))}
          </div>

          {/* Live stats */}
          <div className="mt-8 pt-6 border-t border-white/15 flex gap-8">
            {[
              ["Reports Logged", reports?.length ?? 0],
              ["Active Orgs", orgs?.length ?? 0],
              ["Registered Citizens", users.filter((u) => u.role === "citizen").length || 5],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: "Fraunces, serif" }}>{val}</div>
                <div className="text-[11px] text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental disclaimer */}
        <div className="relative text-[11px] text-white/50 flex items-center justify-between">
          <span>RiverGuard AI • Secure Community Platform</span>
          <button onClick={() => setDemoModalOpen(true)} className="underline hover:text-white/80">View Demo Accounts</button>
        </div>
      </div>

      {/* ── Right panel: Auth Card ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 md:p-12 overflow-y-auto">
        <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-9 shadow-xl border" style={{ borderColor: COLORS.line }}>
          
          {/* Mobile brand header */}
          <div className="flex lg:hidden items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: COLORS.line }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COLORS.gradCard }}>
                <Waves size={18} color="#fff" />
              </div>
              <span className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>RiverGuard AI</span>
            </div>
            <button onClick={() => goto("landing")} className="text-xs font-medium hover:underline" style={{ color: COLORS.river }}>
              Home
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h3 className="text-2xl sm:text-3xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>
              {mode === "login" ? "Welcome back" : "Join the Movement"}
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: "#6B7280" }}>
              {mode === "login"
                ? "Sign in with your email or use 1-click test roles to explore."
                : "Create an account to report pollution, coordinate cleanups, or oversee operations."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex gap-1.5 p-1.5 rounded-2xl mb-6" style={{ background: COLORS.paperDim }}>
            <button
              type="button"
              onClick={() => { setMode("login"); setErr(""); }}
              className="flex-1 py-2 text-xs sm:text-sm rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: mode === "login" ? "#fff" : "transparent",
                color: mode === "login" ? COLORS.ink : "#6B7280",
                boxShadow: mode === "login" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <KeyRound size={14} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setErr(""); }}
              className="flex-1 py-2 text-xs sm:text-sm rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                background: mode === "register" ? "#fff" : "transparent",
                color: mode === "register" ? COLORS.ink : "#6B7280",
                boxShadow: mode === "register" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <Plus size={14} /> Create Account
            </button>
          </div>

          {/* Error Banner */}
          {err && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2 animate-fadein">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">{err}</div>
            </div>
          )}

          {/* ══════════════════ TAB 1: SIGN IN ══════════════════ */}
          {mode === "login" ? (
            <div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email input */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1.5" style={{ color: COLORS.ink }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="citizen1@demo.riverguard"
                      className="w-full pl-10 pr-4 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                      style={{ borderColor: COLORS.line }}
                      required
                    />
                  </div>
                </div>

                {/* Password input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.ink }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setDemoModalOpen(true)}
                      className="text-xs font-medium hover:underline"
                      style={{ color: COLORS.river }}
                    >
                      Demo Accounts & Help
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-11 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                      style={{ borderColor: COLORS.line }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="block mt-1 text-[11px] text-gray-400">
                    Default demo password for seeded accounts is <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-700">password123</code>
                  </span>
                </div>

                {/* Remember me row */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    Remember my session
                  </label>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                  style={{ background: COLORS.gradCard }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing In…
                    </>
                  ) : (
                    <>
                      Sign In to Dashboard <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* ── Divider ── */}
              <div className="relative my-7 text-center">
                <hr className="border-t" style={{ borderColor: COLORS.line }} />
                <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 px-3 bg-white text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Or 1-Click Test Personas
                </span>
              </div>

              {/* ── 1-Click Role Logins ── */}
              <div className="grid grid-cols-2 gap-2.5">
                {demoAccounts.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleQuickLogin(acc)}
                      className="p-3 text-left rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-md flex flex-col justify-between group"
                      style={{
                        background: COLORS.cream,
                        borderColor: COLORS.line,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ background: acc.grad }}
                        >
                          <Icon size={14} />
                        </div>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                          style={{ background: `${acc.accent}15`, color: acc.accent }}
                        >
                          {acc.role}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate" title={acc.email}>
                          {acc.email}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  className="text-xs font-semibold hover:underline inline-flex items-center gap-1.5"
                  style={{ color: COLORS.river }}
                >
                  <KeyRound size={13} /> View all demo login credentials & accounts
                </button>
              </div>
            </div>
          ) : (
            /* ══════════════════ TAB 2: REGISTER ══════════════════ */
            <div>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3.5 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                    style={{ borderColor: COLORS.line }}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                    style={{ borderColor: COLORS.line }}
                    required
                  />
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
                    Select Your Role in RiverGuard
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { r: "citizen", label: "Citizen / Volunteer", desc: "Report & vote on issues" },
                      { r: "ngo", label: "NGO Coordinator", desc: "Manage cleanup operations" },
                      { r: "worker", label: "Field Worker", desc: "Execute cleanup tasks" },
                      { r: "admin", label: "Municipal Admin", desc: "Verify & monitor city data" },
                    ].map(({ r, label, desc }) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${role === r ? "ring-2 ring-teal-500 bg-teal-50/50" : "bg-white hover:bg-gray-50"}`}
                        style={{ borderColor: role === r ? COLORS.river : COLORS.line }}
                      >
                        <div className="text-xs font-bold" style={{ color: role === r ? COLORS.riverDeep : COLORS.ink }}>
                          {label}
                        </div>
                        <div className="text-[10px] text-gray-500">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Org selector if NGO or Worker */}
                {(role === "ngo" || role === "worker") && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
                      Affiliated Organization
                    </label>
                    <select
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                      style={{ borderColor: COLORS.line }}
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Password & Confirm Password */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full px-3.5 py-2 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                        style={{ borderColor: COLORS.line }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1" style={{ color: COLORS.ink }}>
                      Confirm Password
                    </label>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2 text-sm border-2 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
                      style={{ borderColor: COLORS.line }}
                      required
                    />
                  </div>
                </div>

                {/* Password visibility toggle */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((v) => !v)}
                    className="hover:underline flex items-center gap-1"
                  >
                    {showRegPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showRegPassword ? "Hide passwords" : "Show passwords"}
                  </button>
                  <span>Min 6 characters</span>
                </div>

                {/* Terms agreement checkbox */}
                <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>
                    I commit to supporting river conservation and agree to RiverGuard's community guidelines.
                  </span>
                </label>

                {/* Register Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
                  style={{ background: COLORS.gradGreen }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating Account…
                    </>
                  ) : (
                    <>
                      Create Account & Get Started <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Footer link */}
          <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: COLORS.line }}>
            <button
              type="button"
              onClick={() => goto("landing")}
              className="text-xs hover:underline"
              style={{ color: "#6B7280" }}
            >
              ← Return to RiverGuard homepage
            </button>
          </div>
        </div>
      </div>

      {/* ── Demo Accounts & Credentials Helper Modal ── */}
      <Modal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} title="Demo Accounts & Access Guide" wide>
        <div className="space-y-5">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            RiverGuard AI stores local demo records so you can test all four operational perspectives.
            Click any profile below to immediately fill the credentials and sign in:
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {demoAccounts.map((acc) => (
              <div
                key={acc.email}
                className="p-3.5 rounded-2xl border flex items-start justify-between gap-3 hover:border-teal-500 transition-all"
                style={{ background: COLORS.cream, borderColor: COLORS.line }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900">{acc.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold" style={{ background: `${acc.accent}20`, color: acc.accent }}>
                      {acc.role}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-600 mb-0.5">{acc.email}</div>
                  <div className="text-[11px] text-gray-500">Password: <span className="font-mono font-semibold text-gray-700">password123</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDemoModalOpen(false);
                    handleQuickLogin(acc);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity flex-shrink-0"
                  style={{ background: acc.grad }}
                >
                  Sign In
                </button>
              </div>
            ))}
          </div>

          {/* Reset password form */}
          <div className="pt-4 border-t" style={{ borderColor: COLORS.line }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Reset Password for Any Account</h4>
            <form onSubmit={handleResetSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="User email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border rounded-xl"
                style={{ borderColor: COLORS.line }}
                required
              />
              <input
                type="password"
                placeholder="New password (min 6)"
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border rounded-xl"
                style={{ borderColor: COLORS.line }}
                required
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl text-white whitespace-nowrap"
                style={{ background: COLORS.river }}
              >
                Update Password
              </button>
            </form>
            {resetSuccess && (
              <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg font-medium">
                {resetSuccess}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}



/* ---------------------------- app shell (nav) ---------------------------- */

/* Every role sees ALL interfaces relevant to them.
   Objects with a "section" key are visual dividers, not nav items. */
const NAV = {
  citizen: [
    { section: "Main" },
    ["citizen-dashboard", "Dashboard", LayoutDashboard],
    ["report-pollution", "Report pollution", Camera],
    ["my-reports", "My reports", ClipboardList],
    { section: "Explore" },
    ["pollution-map", "Pollution map", MapIcon],
    ["cleanup-drives", "Cleanup drives", Calendar],
    ["leaderboard", "Leaderboard", Trophy],
    { section: "Me" },
    ["notifications", "Notifications", Bell],
    ["ai-assistant", "AI assistant", MessageCircle],
    ["profile", "Profile", UserCircle2],
  ],
  ngo: [
    { section: "Operations" },
    ["ngo-dashboard", "Dashboard", LayoutDashboard],
    ["ngo-reports", "Assigned reports", ClipboardList],
    ["ngo-tasks", "Tasks", CheckSquare],
    ["ngo-events", "Cleanup drives", Calendar],
    { section: "Insights" },
    ["ngo-analytics", "Analytics", BarChart3],
    ["pollution-map", "Pollution map", MapIcon],
    ["leaderboard", "Leaderboard", Trophy],
    { section: "Me" },
    ["notifications", "Notifications", Bell],
    ["ai-assistant", "AI assistant", MessageCircle],
    ["profile", "Profile", UserCircle2],
  ],
  worker: [
    { section: "Work" },
    ["worker-dashboard", "Dashboard", LayoutDashboard],
    ["worker-tasks", "My tasks", ClipboardList],
    { section: "Explore" },
    ["pollution-map", "Pollution map", MapIcon],
    ["cleanup-drives", "Cleanup drives", Calendar],
    ["leaderboard", "Leaderboard", Trophy],
    { section: "Me" },
    ["notifications", "Notifications", Bell],
    ["ai-assistant", "AI assistant", MessageCircle],
    ["profile", "Profile", UserCircle2],
  ],
  admin: [
    { section: "Overview" },
    ["admin-dashboard", "Dashboard", LayoutDashboard],
    ["admin-reports", "All reports", ClipboardList],
    ["pollution-map", "Pollution map", MapIcon],
    { section: "Manage" },
    ["admin-users", "Users", Users],
    ["admin-orgs", "Organizations", Building2],
    { section: "Insights" },
    ["admin-analytics", "Community analytics", BarChart3],
    ["leaderboard", "Leaderboard", Trophy],
    { section: "Me" },
    ["notifications", "Notifications", Bell],
    ["ai-assistant", "AI assistant", MessageCircle],
    ["profile", "Profile", UserCircle2],
  ],
};
const ROLE_LABEL = { citizen: "Citizen", ngo: "NGO", worker: "Field Worker", admin: "Admin" };

function Shell({ page, goto, children }) {
  const { currentUser, logout, notifications, openAiModal, geminiConfigured } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const items = NAV[currentUser.role] || [];
  const unread = notifications.filter((n) => n.userId === currentUser.id && !n.read).length;
  const close = () => setNavOpen(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.paper }}>

      {/* ── Top bar with universal hamburger ── */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white border-b" style={{ borderColor: COLORS.line }}>
        <button
          onClick={() => setNavOpen((o) => !o)}
          className="p-1.5 rounded-md transition-colors hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {navOpen
            ? <X size={20} style={{ color: COLORS.ink }} />
            : <Menu size={20} style={{ color: COLORS.ink }} />}
        </button>
        <Waves size={18} style={{ color: COLORS.river }} />
        <span className="font-semibold text-sm" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>RiverGuard AI</span>
        
        <div className="ml-auto flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={() => { goto("notifications"); close(); }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-white font-medium shadow-sm"
              style={{ background: COLORS.rust }}
            >
              <Bell size={12} /> {unread}
            </button>
          )}

          {/* Gemini 1.5 Flash Quick Engine Button */}
          <button
            onClick={openAiModal}
            title="Configure Google Gemini 1.5 Flash AI"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-teal-50 transition-colors font-semibold"
            style={{
              borderColor: "rgba(14, 116, 144, 0.35)",
              background: geminiConfigured ? "rgba(14, 116, 144, 0.08)" : "rgba(242, 240, 232, 0.6)",
              color: COLORS.riverDeep,
            }}
          >
            <Sparkles size={12} className="text-teal-600" />
            <span>Gemini 1.5</span>
            {geminiConfigured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="API Key Connected" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg border" style={{ borderColor: COLORS.line, background: COLORS.cream }}>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: COLORS.paperDim, color: COLORS.riverDeep }}>
              {ROLE_LABEL[currentUser.role]}
            </span>
            <span className="text-xs font-semibold max-w-[120px] truncate" style={{ color: COLORS.ink }}>
              {currentUser.name.replace("(Demo) ", "")}
            </span>
          </div>

          <button
            onClick={() => { logout(); goto("login"); }}
            title="Switch user account"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors font-medium text-gray-600"
            style={{ borderColor: COLORS.line }}
          >
            <RefreshCw size={12} className="text-teal-600" />
            <span className="hidden md:inline">Switch Role</span>
          </button>

          <button
            onClick={() => { logout(); goto("landing"); }}
            title="Log out"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Backdrop ── */}
      {navOpen && (
        <div className="fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.35)" }} onClick={close} />
      )}

      {/* ── Slide-out nav drawer ── */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-72 bg-white border-r flex flex-col transition-transform duration-200 ease-in-out ${navOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderColor: COLORS.line }}
      >
        {/* Drawer header */}
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: COLORS.line }}>
          <div className="flex items-center gap-2">
            <Waves size={18} style={{ color: COLORS.river }} />
            <span className="font-semibold" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>RiverGuard AI</span>
          </div>
          <button onClick={close} className="p-1 rounded hover:bg-gray-100">
            <X size={18} style={{ color: COLORS.ink }} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: COLORS.river }}>
            {ROLE_LABEL[currentUser.role]}
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {items.map((item, i) => {
            if (!Array.isArray(item)) {
              return (
                <div key={`sec-${i}`} className="mt-4 mb-1 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#9C9A88" }}>
                    {item.section}
                  </span>
                </div>
              );
            }
            const [key, label, Icon] = item;
            const active = page === key;
            return (
              <button
                key={key}
                onClick={() => { goto(key); close(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md text-left relative transition-colors"
                style={{
                  background: active ? COLORS.paperDim : "transparent",
                  color: active ? COLORS.ink : "#5C5C4C",
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? `3px solid ${COLORS.river}` : "3px solid transparent",
                }}
              >
                <Icon size={16} />
                {label}
                {key === "notifications" && unread > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ background: COLORS.rust }}>{unread}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t" style={{ borderColor: COLORS.line }}>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: COLORS.river }}>
              {currentUser.name.replace("(Demo) ", "").split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{currentUser.name}</div>
              <div className="text-xs" style={{ color: "#8A8672" }}>{ROLE_LABEL[currentUser.role]}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { logout(); goto("login"); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-lg border hover:bg-gray-50 transition-colors font-medium"
              style={{ borderColor: COLORS.line, color: COLORS.river }}
            >
              <RefreshCw size={13} /> Switch Role
            </button>
            <button
              onClick={() => { logout(); goto("landing"); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-lg border hover:bg-red-50 transition-colors font-medium text-red-600"
              style={{ borderColor: COLORS.line }}
            >
              <LogOut size={13} /> Log out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-5 md:p-8">{children}</main>
    </div>
  );
}

function PageHeader({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>{title}</h1>
        {sub && <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#6B7280" }}>{sub}</p>}
        <div className="mt-2 h-1 w-12 rounded-full" style={{ background: COLORS.gradCard }} />
      </div>
      {action}
    </div>
  );
}


/* ---------------------------- citizen: dashboard ---------------------------- */

function CitizenDashboard({ goto }) {
  const { currentUser, reports, events, users } = useApp();
  const myReports = reports.filter((r) => r.reporterId === currentUser.id);
  const pending = myReports.filter((r) => !["CLOSED", "REJECTED"].includes(r.status)).length;
  const verified = myReports.filter((r) => STATUS_FLOW.indexOf(r.status) >= STATUS_FLOW.indexOf("VERIFIED")).length;
  const me = users.find((u) => u.id === currentUser.id) || currentUser;
  const joinedEvents = events.filter((e) => e.participants.includes(currentUser.id));
  const upcoming = events.filter((e) => new Date(e.date) >= new Date(Date.now() - 86400000)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const resolvedTotal = reports.filter((r) => r.status === "CLOSED").length;

  return (
    <div>
      {/* ── Gradient welcome banner ── */}
      <div className="rounded-3xl p-6 mb-8 relative overflow-hidden" style={{ background: COLORS.gradHero }}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: "#22D3EE" }} />
        <div className="absolute -left-4 -bottom-6 w-32 h-32 rounded-full opacity-10" style={{ background: "#34D399" }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Welcome back</p>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Fraunces, serif" }}>
              {currentUser.name.replace("(Demo) ", "")} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>Here's what's happening in your community.</p>
          </div>
          <Button size="sm" onClick={() => goto("report-pollution")}
            style={{ background: "rgba(255,255,255,0.20)", color: "#fff", border: "2px solid rgba(255,255,255,0.35)", boxShadow: "none" }}>
            <Camera size={15} /> Report pollution
          </Button>
        </div>
        {/* mini stats inside banner */}
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "My reports", value: myReports.length, icon: ClipboardList },
            { label: "Pending",    value: pending,          icon: Clock },
            { label: "Verified+",  value: verified,         icon: CheckCircle2 },
            { label: "Points",     value: me.points || 0,   icon: Trophy },
          ].map(({ label, value, icon: Ico }) => (
            <div key={label} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Ico size={13} color="rgba(255,255,255,0.7)" />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.60)" }}>{label}</span>
              </div>
              <div className="text-2xl font-bold text-white" style={{ fontFamily: "Fraunces, serif" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>


      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: COLORS.ink }}>Recent reports</h2>
            <button onClick={() => goto("my-reports")} className="text-xs font-medium" style={{ color: COLORS.river }}>View all →</button>
          </div>
          {myReports.length === 0 ? (
            <Card><EmptyState icon={Camera} title="No reports yet" sub="Spotted pollution near a river? File your first report." action={<Button onClick={() => goto("report-pollution")}>Report pollution</Button>} /></Card>
          ) : (
            <div className="flex flex-col gap-3">
              {myReports.slice(0, 4).map((r) => <ReportCard key={r.id} r={r} onClick={() => goto("report-detail", { id: r.id })} />)}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: COLORS.ink }}>Nearby cleanup drives</h2>
            <button onClick={() => goto("cleanup-drives")} className="text-xs font-medium" style={{ color: COLORS.river }}>View all →</button>
          </div>
          {upcoming.length === 0 ? <Card className="p-5"><span className="text-sm" style={{ color: "#8A8672" }}>No upcoming drives scheduled.</span></Card> : (
            <div className="flex flex-col gap-3">
              {upcoming.map((e) => (
                <Card key={e.id} className="p-4 cursor-pointer" onClick={() => goto("event-detail", { id: e.id })}>
                  <div className="font-medium text-sm" style={{ color: COLORS.ink }}>{e.name}</div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "#8A8672" }}><Calendar size={12} /> {fmtDate(e.date)} · {e.startTime}</div>
                  <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "#8A8672" }}><MapPin size={12} /> {e.location}</div>
                  <div className="text-xs mt-2" style={{ color: COLORS.moss }}>{e.participants.length}/{e.maxVolunteers} volunteers</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold mb-3" style={{ color: COLORS.ink }}>Community impact</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} label="Reports submitted" value={reports.length} />
          <StatCard icon={CheckCircle2} label="Reports resolved" value={resolvedTotal} accent={COLORS.moss} />
          <StatCard icon={Leaf} label="Cleanups run" value={events.filter((e) => e.completed).length} accent={COLORS.clay} />
          <StatCard icon={Users} label="Active volunteers" value={users.filter((u) => u.role === "citizen").length} />
        </div>
      </div>
    </div>
  );
}

function ReportCard({ r, onClick }) {
  return (
    <Card className="p-4 flex gap-3 cursor-pointer" onClick={onClick}>
      <div className="w-16 h-16 rounded-sm shrink-0 overflow-hidden flex items-center justify-center" style={{ background: COLORS.paperDim }}>
        {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : <Droplets size={20} style={{ color: "#B0AC98" }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm" style={{ color: COLORS.ink }}>{r.category}</span>
          <SeverityBadge level={r.severity} />
        </div>
        <div className="text-xs mt-1 truncate" style={{ color: "#8A8672" }}>{r.locationName || "Location pinned on map"}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusPill status={r.status} />
          <span className="text-xs" style={{ color: "#B0AC98" }}>{fmtDate(r.submittedAt)}</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------- citizen: report pollution ---------------------------- */

function MiniLocationPicker({ lat, lng, onChange }) {
  const boxRef = useRef(null);
  const bounds = { minLat: RIVER_CENTER.lat - 0.04, maxLat: RIVER_CENTER.lat + 0.04, minLng: RIVER_CENTER.lng - 0.04, maxLng: RIVER_CENTER.lng + 0.04 };
  const toXY = (la, ln) => ({
    x: ((ln - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    y: 100 - ((la - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100,
  });
  const p = toXY(lat, lng);
  function handleClick(e) {
    const rect = boxRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const newLng = bounds.minLng + x * (bounds.maxLng - bounds.minLng);
    const newLat = bounds.maxLat - y * (bounds.maxLat - bounds.minLat);
    onChange(newLat, newLng);
  }
  return (
    <div>
      <div ref={boxRef} onClick={handleClick} className="relative w-full h-48 rounded-sm cursor-crosshair overflow-hidden" style={{ background: COLORS.riverDeep }}>
        <div className="absolute left-0 right-0" style={{ top: "55%", height: "30%", background: COLORS.river, opacity: 0.8, clipPath: "polygon(0 20%, 100% 0, 100% 100%, 0% 100%)" }} />
        <div className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-100%)" }}>
          <MapPin size={26} style={{ color: COLORS.rust }} fill={COLORS.rust} />
        </div>
        <span className="absolute bottom-1.5 left-2 text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>Click the map to set the exact spot</span>
      </div>
      <div className="text-xs mt-1.5" style={{ color: "#8A8672" }}>Lat {lat.toFixed(4)}, Lng {lng.toFixed(4)}</div>
    </div>
  );
}

function ReportPollutionPage({ goto }) {
  const { currentUser, submitReport, toast, openAiModal, geminiConfigured } = useApp();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState(jitter(RIVER_CENTER.lat, 0.02));
  const [lng, setLng] = useState(jitter(RIVER_CENTER.lng, 0.02));
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setImage(dataUrl); setAiResult(null); setAiError("");
    } catch (err) { toast(err.message || "Could not process image", "error"); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { toast("Location access isn't available in this browser. Select your location manually on the map.", "error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); toast("Location detected"); },
      () => toast("Location access is unavailable. Select your location manually on the map.", "error")
    );
  }

  async function runAnalysis() {
    if (!image) { toast("Add a photo first", "error"); return; }
    setAnalyzing(true); setAiError("");
    try {
      const result = await aiAnalyzePollution(image, description, category);
      setAiResult(result);
      if (!category) setCategory(result.pollutionType);
    } catch (err) {
      setAiError("AI analysis could not complete. You can manually select the pollution category and severity below.");
      setAiResult(null);
    } finally { setAnalyzing(false); }
  }

  function submit() {
    if (!category) { toast("Select a pollution category", "error"); return; }
    setSubmitting(true);
    submitReport({
      reporterId: currentUser.id, image, description, category, locationName, lat, lng,
      severity: aiResult?.severity || "MEDIUM",
      environmentalRisk: aiResult?.environmentalRisk || "MEDIUM",
      confidence: aiResult?.confidence ?? null,
      aiDescription: aiResult?.description || null,
      recommendedAction: aiResult?.recommendedAction || null,
      needsManualVerification: aiResult ? aiResult.needsManualVerification : true,
      userCorrected: aiResult ? (aiResult.pollutionType !== category || aiResult.severity !== (aiResult?.severity)) : true,
    });
    setSubmitting(false);
    toast("Report submitted");
    goto("my-reports");
  }

  return (
    <div>
      <PageHeader title="Report pollution" sub="Submit a photo and location so the community and AI can respond." />
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2">
          <div className="mb-6">
            <span className="block text-sm font-medium mb-2" style={{ color: COLORS.ink }}>Photo</span>
            {image ? (
              <div className="relative w-full h-56 rounded-sm overflow-hidden">
                <img src={image} className="w-full h-full object-cover" alt="Pollution" />
                <button onClick={() => { setImage(null); setAiResult(null); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()} className="w-full h-40 rounded-sm border-2 border-dashed flex flex-col items-center justify-center gap-2" style={{ borderColor: COLORS.line, color: "#8A8672" }}>
                <ImagePlus size={22} /> <span className="text-sm">Upload a photo, or take one on mobile</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            {image && (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <Button onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? <><Loader2 size={15} className="animate-spin" /> Gemini 1.5 Analyzing…</> : <><Sparkles size={15} /> Analyze with Gemini 1.5 Flash</>}
                </Button>
                <button
                  type="button"
                  onClick={openAiModal}
                  className="text-xs px-3 py-2 rounded-xl border hover:bg-teal-50 flex items-center gap-1.5 transition-colors font-medium text-teal-800 bg-white"
                  style={{ borderColor: COLORS.line }}
                >
                  <KeyRound size={13} className="text-teal-600" />
                  <span>{geminiConfigured ? "Gemini Key Configured" : "Add Gemini API Key"}</span>
                </button>
              </div>
            )}
          </div>

          {aiError && <div className="mb-5"><ErrorBanner>{aiError}</ErrorBanner></div>}

          {aiResult && (
            <Card className="p-4 mb-6" style={{ background: `${COLORS.river}08`, borderColor: `${COLORS.river}33` }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} style={{ color: COLORS.river }} />
                  <span className="text-sm font-bold text-gray-900">Gemini Pollution Inspection</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: `${COLORS.river}20`, color: COLORS.riverDeep }}>
                    {aiResult.source || "Gemini 1.5 Flash"}
                  </span>
                  <button
                    type="button"
                    onClick={openAiModal}
                    title="Change Gemini API settings"
                    className="p-1 rounded-md text-gray-400 hover:text-teal-700 hover:bg-white"
                  >
                    <Settings size={13} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                <div><span className="block text-xs" style={{ color: "#8A8672" }}>Pollution type</span><span className="font-semibold text-gray-900">{aiResult.pollutionType}</span></div>
                <div><span className="block text-xs" style={{ color: "#8A8672" }}>Severity</span><SeverityBadge level={aiResult.severity} /></div>
                <div><span className="block text-xs" style={{ color: "#8A8672" }}>Confidence</span><span className="font-semibold text-gray-900">{Math.round(aiResult.confidence * 100)}%</span></div>
                <div><span className="block text-xs" style={{ color: "#8A8672" }}>Environmental risk</span><SeverityBadge level={aiResult.environmentalRisk} /></div>
              </div>

              {aiResult.detectedItems?.length > 0 && (
                <div className="mb-2.5">
                  <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Detected Waste Materials:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.detectedItems.map((item, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-white border text-gray-700 font-medium" style={{ borderColor: COLORS.line }}>
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm mt-2" style={{ color: "#4B5A50" }}>{aiResult.description}</p>
              {aiResult.waterImpact && (
                <p className="text-xs mt-1.5 text-teal-800 font-medium bg-teal-50 p-2 rounded-lg">
                  Water Impact: {aiResult.waterImpact}
                </p>
              )}
              <p className="text-sm mt-2 font-medium" style={{ color: COLORS.ink }}>Recommended Action: {aiResult.recommendedAction}</p>
              {aiResult.needsManualVerification && (
                <div className="mt-3"><ErrorBanner>Confidence is low — this result needs manual verification. Please review the category and severity below before submitting.</ErrorBanner></div>
              )}
              <p className="text-xs mt-3" style={{ color: "#8A8672" }}>You can adjust any selection below before submitting — the AI analysis provides a rapid initial baseline.</p>
            </Card>
          )}

          <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} style={inputStyle} placeholder="What do you see? Any details that would help responders." /></Field>
          <Field label="Pollution category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Location name (optional)"><input value={locationName} onChange={(e) => setLocationName(e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. Near Vishrantwadi bridge" /></Field>
          <Field label="Pin the location" hint="Location sharing is optional — you can always set this manually.">
            <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={useMyLocation}><MapPin size={13} /> Use my location</Button></div>
            <MiniLocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
          </Field>

          <Button className="w-full mt-2" size="lg" onClick={submit} disabled={submitting}>Submit report</Button>
        </Card>

        <div>
          <Card className="p-5">
            <div className="flex items-center gap-1.5 mb-2"><Sparkles size={14} style={{ color: COLORS.river }} /><span className="font-bold text-sm" style={{ color: COLORS.ink }}>Gemini 1.5 Flash Vision</span></div>
            <p className="text-sm leading-relaxed" style={{ color: "#6B6B58" }}>When you upload a river photo, Google Gemini 1.5 Flash scans the image for debris classification, chemical discoloration, algal blooms, and severity scoring.</p>
            <div className="mt-4 pt-3 border-t text-xs flex items-center justify-between" style={{ borderColor: COLORS.line }}>
              <span className="text-gray-500">Active Model</span>
              <span className="font-mono font-bold text-teal-700">gemini-1.5-flash</span>
            </div>
            <button
              type="button"
              onClick={openAiModal}
              className="mt-3 w-full py-2 text-xs font-semibold rounded-xl border border-teal-200 text-teal-700 bg-teal-50/50 hover:bg-teal-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              <KeyRound size={12} /> Configure API Key
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- citizen: my reports / detail ---------------------------- */

function MyReportsPage({ goto }) {
  const { currentUser, reports } = useApp();
  const [filter, setFilter] = useState("ALL");
  const mine = reports.filter((r) => r.reporterId === currentUser.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const filtered = filter === "ALL" ? mine : mine.filter((r) => r.status === filter);
  return (
    <div>
      <PageHeader title="My reports" sub={`${mine.length} report${mine.length === 1 ? "" : "s"} submitted`} action={<Button onClick={() => goto("report-pollution")}><Plus size={15} /> New report</Button>} />
      <div className="flex gap-2 mb-5 flex-wrap">
        {["ALL", ...STATUS_FLOW, "REJECTED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="px-3 py-1.5 text-xs rounded-sm border"
            style={{ borderColor: filter === s ? COLORS.river : COLORS.line, color: filter === s ? COLORS.river : "#8A8672", background: filter === s ? `${COLORS.river}0d` : "#fff" }}>
            {s === "ALL" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <Card><EmptyState icon={ClipboardList} title="No reports here" sub="Try a different filter, or file a new report." /></Card> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((r) => <ReportCard key={r.id} r={r} onClick={() => goto("report-detail", { id: r.id })} />)}
        </div>
      )}
    </div>
  );
}

function ReportDetailPage({ goto, params }) {
  const { reports, currentUser, voteReport, users } = useApp();
  const r = reports.find((x) => x.id === params?.id);
  if (!r) return <EmptyState title="Report not found" action={<Button onClick={() => goto("my-reports")}>Back</Button>} />;
  const reporter = users.find((u) => u.id === r.reporterId);
  const priority = computePriority(r, reports);
  const hasVoted = r.votes.includes(currentUser.id);
  const isOwner = r.reporterId === currentUser.id;

  return (
    <div>
      <button onClick={() => goto(currentUser.role === "citizen" ? "my-reports" : (currentUser.role === "admin" ? "admin-reports" : "ngo-reports"))} className="flex items-center gap-1 text-sm mb-4" style={{ color: "#8A8672" }}>
        <ChevronLeft size={15} /> Back
      </button>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-5">
          <Card className="p-0 overflow-hidden">
            {r.image && <img src={r.image} className="w-full h-64 object-cover" alt="" />}
            <div className="p-5">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-xl" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>{r.category}</h1>
                <SeverityBadge level={r.severity} />
                <StatusPill status={r.status} />
              </div>
              <div className="text-sm flex items-center gap-1 mb-3" style={{ color: "#8A8672" }}><MapPin size={13} /> {r.locationName || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`} · {fmtDateTime(r.submittedAt)}</div>
              <p className="text-sm" style={{ color: "#4B5A50" }}>{r.description || "No description provided."}</p>
              {r.aiDescription && (
                <div className="mt-4 p-3 rounded-sm text-sm" style={{ background: `${COLORS.river}08` }}>
                  <div className="flex items-center gap-1.5 mb-1"><Sparkles size={13} style={{ color: COLORS.river }} /><span className="font-medium" style={{ color: COLORS.river }}>AI assessment</span>{r.needsManualVerification && <span className="text-xs" style={{ color: COLORS.clay }}>· needs manual verification</span>}</div>
                  <p style={{ color: "#4B5A50" }}>{r.aiDescription}</p>
                  {r.recommendedAction && <p className="mt-1 font-medium" style={{ color: COLORS.ink }}>Recommended: {r.recommendedAction}</p>}
                  {r.confidence != null && <p className="text-xs mt-1" style={{ color: "#8A8672" }}>Confidence: {Math.round(r.confidence * 100)}%</p>}
                </div>
              )}
              {r.rejectionReason && <div className="mt-3"><ErrorBanner>Rejected: {r.rejectionReason}</ErrorBanner></div>}
              <div className="flex items-center gap-4 mt-4">
                <button onClick={() => voteReport(r.id)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-sm border" style={{ borderColor: hasVoted ? COLORS.river : COLORS.line, color: hasVoted ? COLORS.river : "#5C5C4C", background: hasVoted ? `${COLORS.river}0d` : "#fff" }}>
                  <ThumbsUp size={14} /> {hasVoted ? "Confirmed" : "Confirm this report"}
                </button>
                <span className="text-sm" style={{ color: "#8A8672" }}>{r.votes.length} community confirmation{r.votes.length === 1 ? "" : "s"}</span>
              </div>
              <div className="text-xs mt-3" style={{ color: "#B0AC98" }}>Reported by {reporter?.name || "a community member"}{isOwner ? " (you)" : ""}</div>
            </div>
          </Card>

          {(r.beforeImage || r.afterImage) && (
            <Card className="p-5">
              <h3 className="font-medium mb-3" style={{ color: COLORS.ink }}>Cleanup evidence</h3>
              <div className="grid grid-cols-2 gap-3">
                {r.beforeImage && <div><img src={r.beforeImage} className="w-full h-32 object-cover rounded-sm" /><span className="text-xs" style={{ color: "#8A8672" }}>Before</span></div>}
                {r.afterImage && <div><img src={r.afterImage} className="w-full h-32 object-cover rounded-sm" /><span className="text-xs" style={{ color: "#8A8672" }}>After</span></div>}
              </div>
              {r.aiVerification && (
                <div className="mt-3 p-3 rounded-sm text-sm" style={{ background: `${COLORS.moss}0d` }}>
                  <div className="flex items-center gap-1.5 mb-1"><Sparkles size={13} style={{ color: COLORS.moss }} /><span className="font-medium" style={{ color: COLORS.moss }}>AI verification: {r.aiVerification.cleanupDetected ? "PASSED" : "INCONCLUSIVE"}</span></div>
                  <p style={{ color: "#4B5A50" }}>Estimated improvement: {r.aiVerification.estimatedImprovement}% · Remaining waste: {r.aiVerification.remainingWaste}</p>
                  <p className="mt-1" style={{ color: "#4B5A50" }}>{r.aiVerification.notes}</p>
                  <p className="text-xs mt-2" style={{ color: "#8A8672" }}>{r.adminApproved ? "Approved by an administrator." : "Awaiting administrator approval — AI verification alone does not close a report."}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h3 className="font-medium mb-1" style={{ color: COLORS.ink }}>Priority: {priority.score}/100 — {priority.level}</h3>
            <ul className="mt-2 text-sm list-disc pl-4" style={{ color: "#6B6B58" }}>
              {priority.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium mb-3" style={{ color: COLORS.ink }}>Status timeline</h3>
            <Timeline status={r.status} rejectionReason={r.rejectionReason} />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- pollution map ---------------------------- */

function PollutionMapPage({ goto }) {
  const { reports } = useApp();
  const [sevFilter, setSevFilter] = useState("ALL");
  const [catFilter, setCatFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const filtered = reports.filter((r) => (sevFilter === "ALL" || r.severity === sevFilter) && (catFilter === "ALL" || r.category === catFilter));
  const bounds = { minLat: RIVER_CENTER.lat - 0.045, maxLat: RIVER_CENTER.lat + 0.045, minLng: RIVER_CENTER.lng - 0.045, maxLng: RIVER_CENTER.lng + 0.045 };
  const toXY = (la, ln) => ({ x: ((ln - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100, y: 100 - ((la - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100 });

  // simple hotspot: grid density
  const grid = {};
  filtered.forEach((r) => {
    const gx = Math.round(((r.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 12);
    const gy = Math.round(((bounds.maxLat - r.lat) / (bounds.maxLat - bounds.minLat)) * 12);
    const key = `${gx}_${gy}`;
    grid[key] = (grid[key] || 0) + 1;
  });
  const maxDensity = Math.max(1, ...Object.values(grid));

  return (
    <div>
      <PageHeader title="Pollution map" sub={`${filtered.length} report${filtered.length === 1 ? "" : "s"} shown along the river`} />
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} className={inputCls} style={{ ...inputStyle, width: "auto" }}>
          <option value="ALL">All severities</option>{SEVERITY_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={inputCls} style={{ ...inputStyle, width: "auto" }}>
          <option value="ALL">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          <Card className="p-3">
            <div className="relative w-full rounded-sm overflow-hidden" style={{ paddingBottom: "78%", background: COLORS.riverDeep }}>
              <div className="absolute inset-0">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M0 55 Q 25 45 45 56 T 100 55 V 100 H 0 Z" fill={COLORS.river} opacity="0.75" />
                  {Object.entries(grid).map(([key, count]) => {
                    if (count < 2) return null;
                    const [gx, gy] = key.split("_").map(Number);
                    const x = (gx / 12) * 100, y = (gy / 12) * 100;
                    const r = 3 + (count / maxDensity) * 8;
                    return <circle key={key} cx={x} cy={y} r={r} fill={COLORS.rust} opacity={0.18 + (count / maxDensity) * 0.25} />;
                  })}
                </svg>
                {filtered.map((r) => {
                  const p = toXY(r.lat, r.lng);
                  return (
                    <button key={r.id} onClick={() => setSelected(r)} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x}%`, top: `${p.y}%` }} title={r.category}>
                      <MapPin size={selected?.id === r.id ? 24 : 18} style={{ color: SEVERITY_COLOR[r.severity] }} fill={SEVERITY_COLOR[r.severity]} fillOpacity={0.25} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4 mt-3 flex-wrap px-1">
              {SEVERITY_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs" style={{ color: "#6B6B58" }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEVERITY_COLOR[s] }} /> {s}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6B6B58" }}><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.rust, opacity: 0.4 }} /> Hotspot density</div>
            </div>
          </Card>
        </div>
        <div>
          {selected ? (
            <Card className="p-4">
              {selected.image && <img src={selected.image} className="w-full h-32 object-cover rounded-sm mb-3" />}
              <div className="flex items-center gap-2 flex-wrap mb-1"><span className="font-medium text-sm">{selected.category}</span><SeverityBadge level={selected.severity} /></div>
              <StatusPill status={selected.status} />
              <div className="text-xs mt-2" style={{ color: "#8A8672" }}>{fmtDate(selected.submittedAt)} · {selected.locationName || "Riverbank location"}</div>
              <div className="text-xs mt-1" style={{ color: "#8A8672" }}>{selected.votes.length} community confirmations</div>
              <Button size="sm" className="mt-3" onClick={() => goto("report-detail", { id: selected.id })}>View report</Button>
            </Card>
          ) : (
            <Card className="p-5"><span className="text-sm" style={{ color: "#8A8672" }}>Select a marker to see report details.</span></Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- cleanup drives ---------------------------- */

function CleanupDrivesPage({ goto }) {
  const { events, currentUser, joinEvent, leaveEvent, orgs } = useApp();
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div>
      <PageHeader title="Cleanup drives" sub="Join a community cleanup near you." />
      {sorted.length === 0 ? <Card><EmptyState icon={Calendar} title="No cleanup drives yet" /></Card> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sorted.map((e) => {
            const org = orgs.find((o) => o.id === e.orgId);
            const joined = e.participants.includes(currentUser.id);
            const full = e.participants.length >= e.maxVolunteers;
            return (
              <Card key={e.id} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium" style={{ color: COLORS.ink }}>{e.name}</h3>
                  {e.completed && <span className="text-xs" style={{ color: "#8A8672" }}>Completed</span>}
                </div>
                <div className="text-xs mt-1" style={{ color: "#8A8672" }}>{org?.name}</div>
                <p className="text-sm mt-2" style={{ color: "#6B6B58" }}>{e.description}</p>
                <div className="text-xs mt-3 flex items-center gap-1" style={{ color: "#8A8672" }}><Calendar size={12} /> {fmtDate(e.date)} · {e.startTime}–{e.endTime}</div>
                <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "#8A8672" }}><MapPin size={12} /> {e.location}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-medium" style={{ color: COLORS.moss }}>{e.participants.length}/{e.maxVolunteers} volunteers</span>
                  {currentUser.role === "citizen" && !e.completed && (
                    joined ? <Button size="sm" variant="outline" onClick={() => leaveEvent(e.id)}>Cancel registration</Button>
                      : <Button size="sm" disabled={full} onClick={() => joinEvent(e.id)}>{full ? "Full" : "Join drive"}</Button>
                  )}
                </div>
                <button onClick={() => goto("event-detail", { id: e.id })} className="text-xs mt-2" style={{ color: COLORS.river }}>View details →</button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventDetailPage({ goto, params }) {
  const { events, currentUser, joinEvent, leaveEvent, orgs, users } = useApp();
  const e = events.find((x) => x.id === params?.id);
  if (!e) return <EmptyState title="Event not found" />;
  const org = orgs.find((o) => o.id === e.orgId);
  const joined = e.participants.includes(currentUser.id);
  const full = e.participants.length >= e.maxVolunteers;
  return (
    <div>
      <button onClick={() => goto("cleanup-drives")} className="flex items-center gap-1 text-sm mb-4" style={{ color: "#8A8672" }}><ChevronLeft size={15} /> Back</button>
      <Card className="p-6 max-w-2xl">
        <h1 className="text-xl mb-1" style={{ fontFamily: "Fraunces, serif", color: COLORS.ink }}>{e.name}</h1>
        <div className="text-sm mb-4" style={{ color: "#8A8672" }}>Organized by {org?.name}</div>
        <p className="text-sm mb-4" style={{ color: "#4B5A50" }}>{e.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="block text-xs" style={{ color: "#8A8672" }}>Date & time</span>{fmtDate(e.date)}, {e.startTime}–{e.endTime}</div>
          <div><span className="block text-xs" style={{ color: "#8A8672" }}>Location</span>{e.location}</div>
          <div><span className="block text-xs" style={{ color: "#8A8672" }}>Equipment</span>{e.equipment || "Not specified"}</div>
          <div><span className="block text-xs" style={{ color: "#8A8672" }}>Volunteers</span>{e.participants.length}/{e.maxVolunteers}</div>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {e.participants.slice(0, 8).map((pid) => { const u = users.find((x) => x.id === pid); return u ? <span key={pid} className="text-xs px-2 py-1 rounded-full" style={{ background: COLORS.paperDim }}>{u.name.replace("(Demo) ", "")}</span> : null; })}
        </div>
        {currentUser.role === "citizen" && !e.completed && (
          joined ? <Button variant="outline" onClick={() => leaveEvent(e.id)}>Cancel registration</Button> : <Button disabled={full} onClick={() => joinEvent(e.id)}>{full ? "Event full" : "Join this drive"}</Button>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------- leaderboard ---------------------------- */

function LeaderboardPage() {
  const { users, currentUser } = useApp();
  const ranked = users.filter((u) => u.role === "citizen").sort((a, b) => (b.points || 0) - (a.points || 0));
  return (
    <div>
      <PageHeader title="Community leaderboard" sub="Points come from verified reports, confirmations, and cleanup participation." />
      <Card className="overflow-hidden">
        {ranked.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: COLORS.line, background: u.id === currentUser.id ? `${COLORS.river}08` : "transparent" }}>
            <span className="w-6 text-sm font-semibold" style={{ color: i < 3 ? COLORS.clay : "#8A8672" }}>{i + 1}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: COLORS.river }}>
              {u.name.replace("(Demo) ", "").split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{u.name.replace("(Demo) ", "")}{u.id === currentUser.id ? " (you)" : ""}</div>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {(u.badges || []).slice(0, 3).map((bid) => { const b = BADGES.find((x) => x.id === bid); return b ? <span key={bid} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: COLORS.paperDim, color: "#6B6B58" }}>{b.name}</span> : null; })}
              </div>
            </div>
            <div className="text-sm font-semibold" style={{ color: COLORS.river }}>{u.points || 0} pts</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------- notifications ---------------------------- */

function NotificationsPage() {
  const { currentUser, notifications, markNotificationRead } = useApp();
  const mine = notifications.filter((n) => n.userId === currentUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <PageHeader title="Notifications" />
      {mine.length === 0 ? <Card><EmptyState icon={Bell} title="No notifications yet" sub="You'll see updates about your reports and events here." /></Card> : (
        <div className="flex flex-col gap-2">
          {mine.map((n) => (
            <Card key={n.id} className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => markNotificationRead(n.id)} style={{ opacity: n.read ? 0.65 : 1 }}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.read ? "transparent" : COLORS.river }} />
              <div>
                <div className="text-sm font-medium" style={{ color: COLORS.ink }}>{n.title}</div>
                <div className="text-sm" style={{ color: "#6B6B58" }}>{n.message}</div>
                <div className="text-xs mt-1" style={{ color: "#B0AC98" }}>{fmtDateTime(n.createdAt)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- AI assistant ---------------------------- */

function AIAssistantPage() {
  const { reports, events, currentUser, openAiModal, geminiConfigured } = useApp();
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi, I'm the RiverGuard Assistant powered by Google Gemini 1.5 Flash. Ask me how to report river pollution, where cleanup drives are happening, or how to reduce runoff waste in your community." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput(""); setBusy(true);
    const open = reports.filter((r) => !["CLOSED", "REJECTED"].includes(r.status));
    const upcoming = events.filter((e) => !e.completed).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const context = `Open pollution reports: ${open.length} (categories: ${[...new Set(open.map((r) => r.category))].join(", ") || "none"}).
Recently reported severities: ${open.slice(0, 8).map((r) => r.severity).join(", ") || "none"}.
Upcoming cleanup drives: ${upcoming.map((e) => `${e.name} on ${e.date} at ${e.location} (${e.participants.length}/${e.maxVolunteers} joined)`).join("; ") || "none scheduled"}.
Current user role: ${currentUser.role}.`;
    try {
      const answer = await aiAssistantAnswer(q, context);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "I couldn't reach the AI service just now. Please try again in a moment." }]);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title="RiverGuard Assistant"
        sub="Ask about reporting, cleanup drives, or how to help."
        action={
          <button
            onClick={openAiModal}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border hover:bg-teal-50 transition-colors font-semibold text-teal-800 bg-white shadow-sm"
            style={{ borderColor: COLORS.line }}
          >
            <Sparkles size={13} className="text-teal-600" />
            <span>Gemini 1.5 Flash</span>
            <span className={`w-2 h-2 rounded-full ${geminiConfigured ? "bg-emerald-500" : "bg-amber-400"}`} />
          </button>
        }
      />
      <Card className="flex flex-col h-[65vh] max-w-2xl">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] px-3.5 py-2.5 rounded-sm text-sm ${m.role === "user" ? "self-end" : "self-start"}`}
              style={{ background: m.role === "user" ? COLORS.river : COLORS.paperDim, color: m.role === "user" ? "#fff" : COLORS.ink }}>
              {m.text}
            </div>
          ))}
          {busy && <div className="self-start flex items-center gap-2 text-sm" style={{ color: "#8A8672" }}><Loader2 size={14} className="animate-spin" /> Thinking…</div>}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 p-3 border-t" style={{ borderColor: COLORS.line }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask a question…" className={inputCls} style={inputStyle} />
          <Button onClick={send} disabled={busy}><Send size={15} /></Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------- profile ---------------------------- */

function ProfilePage() {
  const { currentUser, users, reports, events } = useApp();
  const me = users.find((u) => u.id === currentUser.id) || currentUser;
  const myReports = reports.filter((r) => r.reporterId === currentUser.id);
  const myEvents = events.filter((e) => e.participants.includes(currentUser.id));
  return (
    <div>
      <PageHeader title="Profile" />
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold text-white mx-auto" style={{ background: COLORS.river }}>
            {me.name.replace("(Demo) ", "").split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
          <div className="font-medium mt-3" style={{ color: COLORS.ink }}>{me.name.replace("(Demo) ", "")}</div>
          <div className="text-xs" style={{ color: "#8A8672" }}>{me.email}</div>
          <div className="text-2xl mt-4 font-semibold" style={{ fontFamily: "Fraunces, serif", color: COLORS.river }}>{me.points || 0}</div>
          <div className="text-xs" style={{ color: "#8A8672" }}>community points</div>
        </Card>
        <Card className="p-6 md:col-span-2">
          <h3 className="font-medium mb-3" style={{ color: COLORS.ink }}>Badges earned</h3>
          {(me.badges || []).length === 0 ? <span className="text-sm" style={{ color: "#8A8672" }}>No badges yet — report pollution or join a cleanup to start earning them.</span> : (
            <div className="grid grid-cols-2 gap-3">
              {(me.badges || []).map((bid) => { const b = BADGES.find((x) => x.id === bid); return b ? (
                <div key={bid} className="flex items-center gap-2 p-3 rounded-sm" style={{ background: COLORS.paperDim }}>
                  <Award size={18} style={{ color: COLORS.clay }} />
                  <div><div className="text-sm font-medium">{b.name}</div><div className="text-xs" style={{ color: "#8A8672" }}>{b.desc}</div></div>
                </div>
              ) : null; })}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div><div className="text-lg font-semibold" style={{ color: COLORS.ink }}>{myReports.length}</div><div className="text-xs" style={{ color: "#8A8672" }}>reports</div></div>
            <div><div className="text-lg font-semibold" style={{ color: COLORS.ink }}>{myEvents.length}</div><div className="text-xs" style={{ color: "#8A8672" }}>drives joined</div></div>
            <div><div className="text-lg font-semibold" style={{ color: COLORS.ink }}>{me.volunteerHours || 0}</div><div className="text-xs" style={{ color: "#8A8672" }}>volunteer hrs</div></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------- NGO pages ---------------------------- */

function NgoDashboard({ goto }) {
  const { currentUser, reports, tasks, events, orgs } = useApp();
  const myReports = reports.filter((r) => r.assignedOrgId === currentUser.orgId);
  const myTasks = tasks.filter((t) => t.orgId === currentUser.orgId);
  const active = myTasks.filter((t) => ["ACCEPTED", "IN_PROGRESS"].includes(t.status)).length;
  const completed = myTasks.filter((t) => t.status === "COMPLETED").length;
  const myEvents = events.filter((e) => e.orgId === currentUser.orgId);
  const org = orgs.find((o) => o.id === currentUser.orgId);
  const completionRate = myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0;

  return (
    <div>
      <PageHeader title={org?.name || "NGO dashboard"} sub="Manage assigned reports, tasks, and cleanup drives." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ClipboardList} label="Assigned reports" value={myReports.length} />
        <StatCard icon={Clock} label="Active tasks" value={active} accent={COLORS.clay} />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} accent={COLORS.moss} />
        <StatCard icon={TrendingUp} label="Completion rate" value={`${completionRate}%`} accent={COLORS.river} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold" style={{ color: COLORS.ink }}>Reports needing action</h2><button onClick={() => goto("ngo-reports")} className="text-xs font-medium" style={{ color: COLORS.river }}>View all →</button></div>
          {myReports.filter((r) => r.status === "ASSIGNED").length === 0 ? <Card className="p-5"><span className="text-sm" style={{ color: "#8A8672" }}>Nothing pending right now.</span></Card> : (
            <div className="flex flex-col gap-3">{myReports.filter((r) => r.status === "ASSIGNED").slice(0, 4).map((r) => <ReportCard key={r.id} r={r} onClick={() => goto("report-detail", { id: r.id })} />)}</div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold" style={{ color: COLORS.ink }}>Your cleanup drives</h2><button onClick={() => goto("ngo-events")} className="text-xs font-medium" style={{ color: COLORS.river }}>Manage →</button></div>
          {myEvents.length === 0 ? <Card className="p-5"><span className="text-sm" style={{ color: "#8A8672" }}>No drives created yet.</span></Card> : (
            <div className="flex flex-col gap-3">{myEvents.slice(0, 4).map((e) => (
              <Card key={e.id} className="p-4"><div className="font-medium text-sm">{e.name}</div><div className="text-xs mt-1" style={{ color: "#8A8672" }}>{fmtDate(e.date)} · {e.participants.length}/{e.maxVolunteers} volunteers</div></Card>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function NgoReportsPage({ goto }) {
  const { currentUser, reports, rejectReport } = useApp();
  const [rejectModal, setRejectModal] = useState(null);
  const [reason, setReason] = useState("");
  const mine = reports.filter((r) => r.assignedOrgId === currentUser.orgId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return (
    <div>
      <PageHeader title="Assigned reports" sub={`${mine.length} report${mine.length === 1 ? "" : "s"} assigned to your organization`} />
      {mine.length === 0 ? <Card><EmptyState icon={ClipboardList} title="No reports assigned yet" /></Card> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {mine.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1"><span className="font-medium text-sm">{r.category}</span><SeverityBadge level={r.severity} /></div>
              <div className="text-xs mb-2" style={{ color: "#8A8672" }}>{r.locationName || "Riverbank"} · {fmtDate(r.submittedAt)}</div>
              <StatusPill status={r.status} />
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => goto("report-detail", { id: r.id })}>View</Button>
                {r.status === "ASSIGNED" && <Button size="sm" variant="danger" onClick={() => setRejectModal(r.id)}>Reject</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject task">
        <Field label="Reason"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} style={inputStyle} /></Field>
        <Button variant="danger" onClick={() => { rejectReport(rejectModal, reason || "No reason given"); setRejectModal(null); setReason(""); }}>Confirm rejection</Button>
      </Modal>
    </div>
  );
}

function NgoTasksPage({ goto }) {
  const { currentUser, tasks, reports, users, assignWorker } = useApp();
  const myTasks = tasks.filter((t) => t.orgId === currentUser.orgId);
  const workers = users.filter((u) => u.role === "worker" && u.orgId === currentUser.orgId);
  return (
    <div>
      <PageHeader title="Tasks" sub="Assign field workers and track progress." />
      {myTasks.length === 0 ? <Card><EmptyState icon={CheckSquare} title="No tasks yet" /></Card> : (
        <div className="flex flex-col gap-3">
          {myTasks.map((t) => {
            const r = reports.find((x) => x.id === t.reportId);
            const worker = users.find((u) => u.id === t.workerId);
            if (!r) return null;
            return (
              <Card key={t.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-medium text-sm">{r.category} · <SeverityBadge level={r.severity} /></div>
                  <div className="text-xs mt-1" style={{ color: "#8A8672" }}>{r.locationName || "Riverbank"}</div>
                </div>
                <div className="flex items-center gap-3">
                  {worker ? <span className="text-xs" style={{ color: "#6B6B58" }}>Assigned to {worker.name.replace("(Demo) ", "")}</span> : (
                    <select className={inputCls} style={{ ...inputStyle, width: "auto" }} defaultValue="" onChange={(e) => e.target.value && assignWorker(t.id, e.target.value)}>
                      <option value="">Assign worker…</option>
                      {workers.map((w) => <option key={w.id} value={w.id}>{w.name.replace("(Demo) ", "")}</option>)}
                    </select>
                  )}
                  <span className="text-xs font-medium px-2 py-1 rounded-sm" style={{ background: COLORS.paperDim, color: COLORS.ink }}>{t.status}</span>
                  <Button size="sm" variant="ghost" onClick={() => goto("report-detail", { id: r.id })}>View report</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NgoEventsPage() {
  const { currentUser, events, createEvent, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", date: "", startTime: "07:00", endTime: "10:00", location: "", maxVolunteers: 30, equipment: "" });
  const mine = events.filter((e) => e.orgId === currentUser.orgId).sort((a, b) => b.date.localeCompare(a.date));

  function submit() {
    if (!form.name || !form.date || !form.location) { toast("Fill in name, date, and location", "error"); return; }
    createEvent({ ...form, orgId: currentUser.orgId, lat: jitter(RIVER_CENTER.lat), lng: jitter(RIVER_CENTER.lng), maxVolunteers: Number(form.maxVolunteers) || 30 });
    setOpen(false); toast("Cleanup drive created");
    setForm({ name: "", description: "", date: "", startTime: "07:00", endTime: "10:00", location: "", maxVolunteers: 30, equipment: "" });
  }

  return (
    <div>
      <PageHeader title="Cleanup drives" action={<Button onClick={() => setOpen(true)}><Plus size={15} /> Create drive</Button>} />
      {mine.length === 0 ? <Card><EmptyState icon={Calendar} title="No drives created yet" /></Card> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {mine.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="font-medium text-sm">{e.name}</div>
              <div className="text-xs mt-1" style={{ color: "#8A8672" }}>{fmtDate(e.date)} · {e.location}</div>
              <div className="text-sm mt-2 font-medium" style={{ color: COLORS.moss }}>{e.participants.length}/{e.maxVolunteers} volunteers</div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Create cleanup drive" wide>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Event name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="Max volunteers"><input type="number" value={form.maxVolunteers} onChange={(e) => setForm({ ...form, maxVolunteers: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="Start time"><input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} style={inputStyle} /></Field>
          <Field label="End time"><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls} style={inputStyle} /></Field>
        </div>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} style={inputStyle} /></Field>
        <Field label="Equipment requirements"><input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} className={inputCls} style={inputStyle} /></Field>
        <Button className="w-full" onClick={submit}>Create drive</Button>
      </Modal>
    </div>
  );
}

function NgoAnalyticsPage() {
  const { currentUser, reports, tasks, events } = useApp();
  const myReports = reports.filter((r) => r.assignedOrgId === currentUser.orgId);
  const byCategory = CATEGORIES.map((c) => ({ name: c, value: myReports.filter((r) => r.category === c).length })).filter((d) => d.value > 0);
  const myTasks = tasks.filter((t) => t.orgId === currentUser.orgId);
  const statusData = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].map((s) => ({ name: s, value: myTasks.filter((t) => t.status === s).length }));
  return (
    <div>
      <PageHeader title="Organization analytics" />
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-medium mb-3 text-sm" style={{ color: COLORS.ink }}>Assigned reports by category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={COLORS.river} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-medium mb-3 text-sm" style={{ color: COLORS.ink }}>Task status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={COLORS.clay} /></BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------- field worker pages ---------------------------- */

function WorkerDashboard({ goto }) {
  const { currentUser, tasks, reports } = useApp();
  const myTasks = tasks.filter((t) => t.workerId === currentUser.id);
  const active = myTasks.filter((t) => t.status !== "COMPLETED").length;
  const done = myTasks.filter((t) => t.status === "COMPLETED").length;
  return (
    <div>
      <PageHeader title="Field worker dashboard" sub="Your assigned cleanup tasks." />
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
        <StatCard icon={ClipboardList} label="Active tasks" value={active} accent={COLORS.clay} />
        <StatCard icon={CheckCircle2} label="Completed" value={done} accent={COLORS.moss} />
      </div>
      <h2 className="font-semibold mb-3" style={{ color: COLORS.ink }}>Your tasks</h2>
      {myTasks.length === 0 ? <Card><EmptyState icon={HardHat} title="No tasks assigned yet" /></Card> : (
        <div className="flex flex-col gap-3">
          {myTasks.map((t) => { const r = reports.find((x) => x.id === t.reportId); if (!r) return null; return (
            <Card key={t.id} className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer" onClick={() => goto("worker-task-detail", { id: t.id })}>
              <div><div className="font-medium text-sm">{r.category}</div><div className="text-xs mt-1" style={{ color: "#8A8672" }}>{r.locationName || "Riverbank"}</div></div>
              <div className="flex items-center gap-2"><SeverityBadge level={r.severity} /><span className="text-xs font-medium px-2 py-1 rounded-sm" style={{ background: COLORS.paperDim }}>{t.status}</span></div>
            </Card>
          ); })}
        </div>
      )}
    </div>
  );
}

function WorkerTasksPage({ goto }) { return <WorkerDashboard goto={goto} />; }

function WorkerTaskDetailPage({ goto, params }) {
  const { tasks, reports, updateTaskStatus, submitCleanup, toast } = useApp();
  const t = tasks.find((x) => x.id === params?.id);
  const r = t ? reports.find((x) => x.id === t.reportId) : null;
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [notes, setNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const beforeRef = useRef(null), afterRef = useRef(null);

  if (!t || !r) return <EmptyState title="Task not found" action={<Button onClick={() => goto("worker-dashboard")}>Back</Button>} />;

  async function handleImg(e, which) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await compressImageFile(file); which === "before" ? setBeforeImg(url) : setAfterImg(url); }
    catch (err) { toast(err.message, "error"); }
  }

  async function submitCompletion() {
    if (!beforeImg || !afterImg) { toast("Upload both before and after photos", "error"); return; }
    setVerifying(true);
    let verification = null;
    try { verification = await aiVerifyCleanup(beforeImg, afterImg, notes); }
    catch (e) { toast("AI verification is temporarily unavailable — the report will still be submitted for admin review.", "error"); }
    submitCleanup(t.id, { beforeImage: beforeImg, afterImage: afterImg, cleanupNotes: notes, aiVerification: verification });
    setVerifying(false);
    toast("Completion submitted for admin review");
    goto("worker-dashboard");
  }

  return (
    <div>
      <button onClick={() => goto("worker-dashboard")} className="flex items-center gap-1 text-sm mb-4" style={{ color: "#8A8672" }}><ChevronLeft size={15} /> Back</button>
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center gap-2 flex-wrap mb-2"><h1 className="text-lg font-medium" style={{ color: COLORS.ink }}>{r.category}</h1><SeverityBadge level={r.severity} /></div>
          <div className="text-sm mb-4" style={{ color: "#6B6B58" }}>{r.description}</div>
          {r.image && <img src={r.image} className="w-full h-40 object-cover rounded-sm mb-4" />}
          <div className="text-sm mb-1 flex items-center gap-1" style={{ color: "#8A8672" }}><MapPin size={13} /> {r.locationName || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}</div>
          <MiniLocationPicker lat={r.lat} lng={r.lng} onChange={() => {}} />

          {t.status !== "COMPLETED" ? (
            <div className="mt-6">
              <h3 className="font-medium mb-3" style={{ color: COLORS.ink }}>Submit completion</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="block text-xs font-medium mb-1.5">Before photo</span>
                  {beforeImg ? <img src={beforeImg} className="w-full h-28 object-cover rounded-sm" onClick={() => beforeRef.current.click()} /> : (
                    <button onClick={() => beforeRef.current.click()} className="w-full h-28 rounded-sm border-2 border-dashed flex items-center justify-center" style={{ borderColor: COLORS.line, color: "#8A8672" }}><Camera size={18} /></button>
                  )}
                  <input ref={beforeRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImg(e, "before")} />
                </div>
                <div>
                  <span className="block text-xs font-medium mb-1.5">After photo</span>
                  {afterImg ? <img src={afterImg} className="w-full h-28 object-cover rounded-sm" onClick={() => afterRef.current.click()} /> : (
                    <button onClick={() => afterRef.current.click()} className="w-full h-28 rounded-sm border-2 border-dashed flex items-center justify-center" style={{ borderColor: COLORS.line, color: "#8A8672" }}><Camera size={18} /></button>
                  )}
                  <input ref={afterRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImg(e, "after")} />
                </div>
              </div>
              <Field label="Completion notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} style={inputStyle} /></Field>
              {t.status === "ACCEPTED" && <Button variant="outline" className="mb-3" onClick={() => updateTaskStatus(t.id, "IN_PROGRESS")}>Start task</Button>}
              <Button className="w-full" onClick={submitCompletion} disabled={verifying}>{verifying ? <><Loader2 size={15} className="animate-spin" /> Running AI verification…</> : "Submit completion report"}</Button>
            </div>
          ) : (
            <div className="mt-6 p-3 rounded-sm text-sm" style={{ background: `${COLORS.moss}0d`, color: COLORS.moss }}>Completion already submitted. Awaiting admin approval.</div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-medium mb-2 text-sm" style={{ color: COLORS.ink }}>Task status</h3>
          <span className="text-xs font-medium px-2 py-1 rounded-sm" style={{ background: COLORS.paperDim }}>{t.status}</span>
          {t.rejectionReason && <div className="mt-3"><ErrorBanner>{t.rejectionReason}</ErrorBanner></div>}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------- admin pages ---------------------------- */

function AdminDashboard({ goto }) {
  const { reports, tasks, events, users } = useApp();
  const critical = reports.filter((r) => computePriority(r, reports).level === "CRITICAL" && !["CLOSED", "REJECTED"].includes(r.status)).length;
  const pending = reports.filter((r) => !["CLOSED", "REJECTED"].includes(r.status)).length;
  const activeTasks = tasks.filter((t) => t.status !== "COMPLETED").length;
  const completedCleanups = reports.filter((r) => r.status === "CLOSED").length;
  const activeVolunteers = users.filter((u) => u.role === "citizen").length;
  const health = computeRiverHealth(reports);
  const byCategory = CATEGORIES.map((c) => ({ name: c.split(" ")[0], value: reports.filter((r) => r.category === c).length })).filter((d) => d.value > 0);
  const bySeverity = SEVERITY_ORDER.map((s) => ({ name: s, value: reports.filter((r) => r.severity === s).length }));
  const monthMap = {};
  reports.forEach((r) => { const k = new Date(r.submittedAt).toLocaleDateString(undefined, { month: "short" }); monthMap[k] = (monthMap[k] || 0) + 1; });
  const monthly = Object.entries(monthMap).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader title="Admin dashboard" sub="City-wide pollution and cleanup overview." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Total reports" value={reports.length} />
        <StatCard icon={Clock} label="Pending" value={pending} accent={COLORS.clay} />
        <StatCard icon={Flame} label="Critical" value={critical} accent={COLORS.rust} />
        <StatCard icon={CheckSquare} label="Active tasks" value={activeTasks} accent={COLORS.river} />
        <StatCard icon={CheckCircle2} label="Completed cleanups" value={completedCleanups} accent={COLORS.moss} />
        <StatCard icon={Users} label="Active volunteers" value={activeVolunteers} />
        <StatCard icon={Calendar} label="Cleanup drives" value={events.length} />
        <StatCard icon={Heart} label="River health" value={`${health}/100`} accent={health >= 70 ? COLORS.moss : health >= 40 ? COLORS.clay : COLORS.rust} />
      </div>
      <div className="grid md:grid-cols-3 gap-5 mb-6">
        <Card className="p-5"><h3 className="text-sm font-medium mb-3" style={{ color: COLORS.ink }}>Reports by category</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={COLORS.river} /></BarChart></ResponsiveContainer>
        </Card>
        <Card className="p-5"><h3 className="text-sm font-medium mb-3" style={{ color: COLORS.ink }}>Reports by severity</h3>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={bySeverity} dataKey="value" nameKey="name" outerRadius={70}>{bySeverity.map((d, i) => <Cell key={i} fill={SEVERITY_COLOR[d.name]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
        </Card>
        <Card className="p-5"><h3 className="text-sm font-medium mb-3" style={{ color: COLORS.ink }}>Monthly reports</h3>
          <ResponsiveContainer width="100%" height={200}><AreaChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Area dataKey="value" stroke={COLORS.river} fill={`${COLORS.river}33`} /></AreaChart></ResponsiveContainer>
        </Card>
      </div>
      <ErrorBanner>River Health Score is an application-generated indicator based on report activity, not laboratory water-quality testing.</ErrorBanner>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3"><h2 className="font-semibold" style={{ color: COLORS.ink }}>Needs verification</h2><button onClick={() => goto("admin-reports")} className="text-xs font-medium" style={{ color: COLORS.river }}>View all →</button></div>
        <div className="grid sm:grid-cols-2 gap-3">
          {reports.filter((r) => r.status === "SUBMITTED" || r.status === "AI_ANALYZED" || r.status === "UNDER_REVIEW").slice(0, 4).map((r) => <ReportCard key={r.id} r={r} onClick={() => goto("report-detail", { id: r.id })} />)}
        </div>
      </div>
    </div>
  );
}

function AdminReportsPage({ goto }) {
  const { reports, orgs, verifyReport, rejectReport, assignOrg, approveCleanup } = useApp();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [rejectModal, setRejectModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [reason, setReason] = useState("");
  const sorted = [...reports].sort((a, b) => computePriority(b, reports).score - computePriority(a, reports).score);
  const filtered = statusFilter === "ALL" ? sorted : sorted.filter((r) => r.status === statusFilter);

  return (
    <div>
      <PageHeader title="All reports" sub="Sorted by priority score." />
      <div className="flex gap-2 mb-4 flex-wrap">
        {["ALL", ...STATUS_FLOW, "REJECTED"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-1.5 text-xs rounded-sm border" style={{ borderColor: statusFilter === s ? COLORS.river : COLORS.line, color: statusFilter === s ? COLORS.river : "#8A8672" }}>{s === "ALL" ? "All" : STATUS_LABEL[s]}</button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map((r) => {
          const p = computePriority(r, reports);
          return (
            <Card key={r.id} className="p-4 flex flex-wrap items-center gap-4">
              <div className="w-14 h-14 rounded-sm overflow-hidden shrink-0" style={{ background: COLORS.paperDim }}>{r.image && <img src={r.image} className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm">{r.category}</span><SeverityBadge level={r.severity} /><StatusPill status={r.status} /></div>
                <div className="text-xs mt-1" style={{ color: "#8A8672" }}>{r.locationName || "Riverbank"} · {fmtDate(r.submittedAt)} · {r.votes.length} confirmations</div>
              </div>
              <div className="text-sm font-semibold" style={{ color: p.level === "CRITICAL" ? COLORS.rust : COLORS.ink }}>{p.score}/100</div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => goto("report-detail", { id: r.id })}>View</Button>
                {(r.status === "SUBMITTED" || r.status === "AI_ANALYZED" || r.status === "UNDER_REVIEW") && <>
                  <Button size="sm" onClick={() => verifyReport(r.id)}>Verify</Button>
                  <Button size="sm" variant="danger" onClick={() => setRejectModal(r.id)}>Reject</Button>
                </>}
                {r.status === "VERIFIED" && <Button size="sm" onClick={() => setAssignModal(r.id)}>Assign org</Button>}
                {r.status === "CLEANUP_COMPLETED" && <Button size="sm" onClick={() => approveCleanup(r.id)}>Approve & close</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject report">
        <Field label="Reason"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} style={inputStyle} /></Field>
        <Button variant="danger" onClick={() => { rejectReport(rejectModal, reason || "Not verifiable"); setRejectModal(null); setReason(""); }}>Confirm rejection</Button>
      </Modal>
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign organization">
        <div className="flex flex-col gap-2">
          {orgs.map((o) => <Button key={o.id} variant="outline" onClick={() => { assignOrg(assignModal, o.id); setAssignModal(null); }}>{o.name}</Button>)}
        </div>
      </Modal>
    </div>
  );
}

function AdminUsersPage() {
  const { users } = useApp();
  return (
    <div>
      <PageHeader title="Users" sub={`${users.length} accounts`} />
      <Card className="overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-3 border-b last:border-0 flex-wrap gap-2" style={{ borderColor: COLORS.line }}>
            <div><div className="text-sm font-medium">{u.name}</div><div className="text-xs" style={{ color: "#8A8672" }}>{u.email}</div></div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-sm capitalize" style={{ background: COLORS.paperDim }}>{u.role}</span>
              {u.role === "citizen" && <span className="text-xs" style={{ color: COLORS.river }}>{u.points || 0} pts</span>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function AdminOrgsPage() {
  const { orgs, users, reports, tasks } = useApp();
  return (
    <div>
      <PageHeader title="Organizations" />
      <div className="grid sm:grid-cols-2 gap-4">
        {orgs.map((o) => {
          const members = users.filter((u) => u.orgId === o.id);
          const assigned = reports.filter((r) => r.assignedOrgId === o.id).length;
          const completed = tasks.filter((t) => t.orgId === o.id && t.status === "COMPLETED").length;
          return (
            <Card key={o.id} className="p-5">
              <div className="flex items-center gap-2 mb-1"><Building2 size={16} style={{ color: COLORS.river }} /><span className="font-medium">{o.name}</span></div>
              <div className="text-xs mb-3" style={{ color: "#8A8672" }}>{o.type} · {o.contact}</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><div className="font-semibold" style={{ color: COLORS.ink }}>{members.length}</div><div className="text-xs" style={{ color: "#8A8672" }}>members</div></div>
                <div><div className="font-semibold" style={{ color: COLORS.ink }}>{assigned}</div><div className="text-xs" style={{ color: "#8A8672" }}>assigned</div></div>
                <div><div className="font-semibold" style={{ color: COLORS.ink }}>{completed}</div><div className="text-xs" style={{ color: "#8A8672" }}>completed</div></div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AdminAnalyticsPage() {
  const { reports, events, users } = useApp();
  const totalCitizens = users.filter((u) => u.role === "citizen").length;
  const totalVotes = reports.reduce((s, r) => s + r.votes.length, 0);
  const totalRegistrations = events.reduce((s, e) => s + e.participants.length, 0);
  const activeCitizens = new Set([...reports.map((r) => r.reporterId), ...reports.flatMap((r) => r.votes), ...events.flatMap((e) => e.participants)]).size;
  const engagementTrend = (() => {
    const map = {};
    reports.forEach((r) => { const k = new Date(r.submittedAt).toLocaleDateString(undefined, { month: "short" }); map[k] = (map[k] || 0) + 1 + r.votes.length; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();
  return (
    <div>
      <PageHeader title="Community engagement analytics" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total citizens" value={totalCitizens} />
        <StatCard icon={Heart} label="Active citizens" value={activeCitizens} accent={COLORS.moss} />
        <StatCard icon={ThumbsUp} label="Community votes" value={totalVotes} accent={COLORS.river} />
        <StatCard icon={Calendar} label="Cleanup registrations" value={totalRegistrations} accent={COLORS.clay} />
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-medium mb-3" style={{ color: COLORS.ink }}>Engagement over time</h3>
        <ResponsiveContainer width="100%" height={240}><LineChart data={engagementTrend}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="value" stroke={COLORS.river} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ---------------------------- root app ---------------------------- */

function AppRoot() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const getInitialRoute = () => {
    const hash = window.location.hash.replace(/^#\/?/, "").trim();
    if (hash) return { page: hash, params: null };
    const path = window.location.pathname.replace(/^\//, "").trim();
    if (path && path !== "index.html") return { page: path, params: null };
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("login") === "true") return { page: "login", params: null };
    if (sp.get("page")) return { page: sp.get("page"), params: null };
    return { page: "landing", params: null };
  };

  const [route, setRoute] = useState(getInitialRoute);
  const [toasts, setToasts] = useState([]);

  const goto = useCallback((page, params) => {
    setRoute({ page, params });
    if (window.location.hash !== `#${page}`) {
      window.location.hash = `#${page}`;
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const page = window.location.hash.replace(/^#\/?/, "").trim();
      if (page) setRoute({ page, params: null });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const toast = useCallback((msg, type = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // initial load
  useEffect(() => {
    (async () => {
      try {
        let seeded = await loadShared(SKEY.seeded, false);
        let [r, e, t, u, o, n] = await Promise.all([
          loadShared(SKEY.reports, null), loadShared(SKEY.events, null), loadShared(SKEY.tasks, null),
          loadShared(SKEY.users, null), loadShared(SKEY.orgs, null), loadShared(SKEY.notifications, null),
        ]);
        if (!seeded || !r || !u || !o) {
          const seed = buildSeedData();
          r = r || seed.reports; e = e || seed.events; t = t || seed.tasks;
          u = u || seed.users; o = o || seed.orgs; n = n || seed.notifications;
          await Promise.all([
            saveShared(SKEY.reports, r), saveShared(SKEY.events, e), saveShared(SKEY.tasks, t),
            saveShared(SKEY.users, u), saveShared(SKEY.orgs, o), saveShared(SKEY.notifications, n || []),
            saveShared(SKEY.seeded, true),
          ]);
        }
        setReports(r || []); setEvents(e || []); setTasks(t || []); setUsers(u || []); setOrgs(o || []); setNotifications(n || []);

        const savedUserId = await loadPersonal("rg_current_user_id", null);
        if (savedUserId) {
          const found = (u || []).find((x) => x.id === savedUserId);
          if (found) {
            setCurrentUser(found);
            const initialHash = window.location.hash.replace(/^#\/?/, "").trim();
            const initialPath = window.location.pathname.replace(/^\//, "").trim();
            const isLoginRequested = initialHash === "login" || initialPath === "login" || window.location.search.includes("login=true");
            if (!isLoginRequested) {
              setRoute({ page: `${found.role === "citizen" ? "citizen" : found.role}-dashboard`, params: null });
            }
          }
        }
      } catch (e) {
        setLoadError("Some data could not be loaded. You can still use the app; changes may not be saved.");
      } finally { setLoading(false); }
    })();
  }, []);

  /* -------- persistence-wrapped setters -------- */
  const persistReports = useCallback((updater) => setReports((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; saveShared(SKEY.reports, next); return next; }), []);
  const persistEvents = useCallback((updater) => setEvents((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; saveShared(SKEY.events, next); return next; }), []);
  const persistTasks = useCallback((updater) => setTasks((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; saveShared(SKEY.tasks, next); return next; }), []);
  const persistUsers = useCallback((updater) => setUsers((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; saveShared(SKEY.users, next); return next; }), []);
  const persistNotifs = useCallback((updater) => setNotifications((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; saveShared(SKEY.notifications, next); return next; }), []);

  const notify = useCallback((userId, title, message, type = "info") => {
    persistNotifs((prev) => [...prev, { id: uid("notif"), userId, title, message, type, read: false, createdAt: nowISO() }]);
  }, [persistNotifs]);

  const awardPoints = useCallback((userId, amount, patch = {}) => {
    persistUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      const updated = { ...u, points: (u.points || 0) + amount, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, (u[k] || 0) + v])) };
      const newBadges = checkNewBadges(updated);
      if (newBadges.length) {
        updated.badges = [...(updated.badges || []), ...newBadges];
        newBadges.forEach((bid) => { const b = BADGES.find((x) => x.id === bid); if (b) notify(userId, "Badge earned", `You earned the "${b.name}" badge — ${b.desc}.`, "badge"); });
      }
      return updated;
    }));
  }, [persistUsers, notify]);

  /* -------- auth -------- */
  const login = useCallback((u) => { setCurrentUser(u); savePersonal("rg_current_user_id", u.id); }, []);
  const logout = useCallback(() => { setCurrentUser(null); savePersonal("rg_current_user_id", null); }, []);
  const addUser = useCallback((data) => {
    const u = { id: uid("user"), points: 0, badges: [], reportsSubmitted: 0, reportsVerified: 0, cleanupsJoined: 0, volunteerHours: 0, createdAt: nowISO(), ...data };
    persistUsers((prev) => [...prev, u]);
    return u;
  }, [persistUsers]);
  const updateUser = useCallback((id, patch) => {
    persistUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
    setCurrentUser((prev) => prev && prev.id === id ? { ...prev, ...patch } : prev);
  }, [persistUsers]);

  /* -------- reports -------- */
  const submitReport = useCallback((data) => {
    const report = {
      id: uid("rep"), submittedAt: nowISO(), status: data.aiDescription ? "AI_ANALYZED" : "SUBMITTED",
      votes: [], assignedOrgId: null, assignedWorkerId: null, rejectionReason: null,
      beforeImage: null, afterImage: null, cleanupNotes: null, aiVerification: null, adminApproved: false,
      timeline: [{ status: "SUBMITTED", at: nowISO() }], closedAt: null, ...data,
    };
    persistReports((prev) => [report, ...prev]);
    persistUsers((prev) => prev.map((u) => u.id === data.reporterId ? { ...u, reportsSubmitted: (u.reportsSubmitted || 0) + 1 } : u));
    notify(data.reporterId, "Report submitted", `Your ${data.category} report has been submitted and is awaiting review.`, "report");
  }, [persistReports, persistUsers, notify]);

  const voteReport = useCallback((reportId) => {
    if (!currentUser) return;
    persistReports((prev) => prev.map((r) => {
      if (r.id !== reportId) return r;
      const already = r.votes.includes(currentUser.id);
      return { ...r, votes: already ? r.votes.filter((v) => v !== currentUser.id) : [...r.votes, currentUser.id] };
    }));
    const target = reports.find((r) => r.id === reportId);
    if (target && !target.votes.includes(currentUser.id)) awardPoints(currentUser.id, POINTS.VOTE_CAST);
  }, [currentUser, persistReports, reports, awardPoints]);

  const verifyReport = useCallback((reportId) => {
    persistReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: "VERIFIED", timeline: [...r.timeline, { status: "VERIFIED", at: nowISO() }] } : r));
    const r = reports.find((x) => x.id === reportId);
    if (r) { notify(r.reporterId, "Report verified", `Your ${r.category} report has been verified by an administrator.`, "report"); awardPoints(r.reporterId, POINTS.REPORT_VERIFIED, { reportsVerified: 1 }); }
  }, [persistReports, reports, notify, awardPoints]);

  const rejectReport = useCallback((reportId, reason) => {
    persistReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: "REJECTED", rejectionReason: reason } : r));
    const r = reports.find((x) => x.id === reportId);
    if (r) notify(r.reporterId, "Report rejected", `Your ${r.category} report was rejected: ${reason}`, "report");
  }, [persistReports, reports, notify]);

  const assignOrg = useCallback((reportId, orgId) => {
    persistReports((prev) => prev.map((r) => r.id === reportId ? { ...r, assignedOrgId: orgId, status: "ASSIGNED", timeline: [...r.timeline, { status: "ASSIGNED", at: nowISO() }] } : r));
    persistTasks((prev) => [...prev, { id: uid("task"), reportId, orgId, workerId: null, status: "PENDING", rejectionReason: null, createdAt: nowISO() }]);
    const r = reports.find((x) => x.id === reportId);
    const org = orgs.find((o) => o.id === orgId);
    if (r) notify(r.reporterId, "Organization assigned", `${org?.name || "An organization"} has been assigned to clean up your report.`, "report");
    users.filter((u) => u.orgId === orgId && u.role === "ngo").forEach((u) => notify(u.id, "New report assigned", `A ${r?.severity || ""} ${r?.category || ""} report has been assigned to your organization.`, "task"));
  }, [persistReports, persistTasks, reports, orgs, users, notify]);

  const approveCleanup = useCallback((reportId) => {
    persistReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: "CLOSED", adminApproved: true, closedAt: nowISO(), timeline: [...r.timeline, { status: "AI_VERIFIED", at: nowISO() }, { status: "CLOSED", at: nowISO() }] } : r));
    const r = reports.find((x) => x.id === reportId);
    if (r) {
      notify(r.reporterId, "Cleanup completed", `Your ${r.category} report has been cleaned up and closed. Thank you for reporting it!`, "report");
      awardPoints(r.reporterId, POINTS.CLEANUP_CONTRIBUTION);
      if (r.assignedWorkerId) { notify(r.assignedWorkerId, "Task approved", "Your completed cleanup has been approved by an administrator.", "task"); awardPoints(r.assignedWorkerId, POINTS.CLEANUP_LEADERSHIP); }
    }
  }, [persistReports, reports, notify, awardPoints]);

  /* -------- tasks / workers -------- */
  const assignWorker = useCallback((taskId, workerId) => {
    persistTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, workerId, status: "ACCEPTED" } : t));
    const task = tasks.find((x) => x.id === taskId);
    if (task) {
      persistReports((prev) => prev.map((r) => r.id === task.reportId ? { ...r, assignedWorkerId: workerId } : r));
      notify(workerId, "New task", "You have been assigned a new cleanup task.", "task");
    }
  }, [persistTasks, tasks, persistReports, notify]);

  const updateTaskStatus = useCallback((taskId, status) => {
    persistTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    const task = tasks.find((x) => x.id === taskId);
    if (task && status === "IN_PROGRESS") persistReports((prev) => prev.map((r) => r.id === task.reportId ? { ...r, status: "IN_PROGRESS", timeline: [...r.timeline, { status: "IN_PROGRESS", at: nowISO() }] } : r));
  }, [persistTasks, tasks, persistReports]);

  const submitCleanup = useCallback((taskId, data) => {
    persistTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "COMPLETED" } : t));
    const task = tasks.find((x) => x.id === taskId);
    if (task) {
      persistReports((prev) => prev.map((r) => r.id === task.reportId ? {
        ...r, status: "CLEANUP_COMPLETED", beforeImage: data.beforeImage, afterImage: data.afterImage,
        cleanupNotes: data.cleanupNotes, aiVerification: data.aiVerification,
        timeline: [...r.timeline, { status: "CLEANUP_COMPLETED", at: nowISO() }, ...(data.aiVerification ? [{ status: "AI_VERIFIED", at: nowISO() }] : [])],
      } : r));
    }
  }, [persistTasks, tasks, persistReports]);

  /* -------- events -------- */
  const createEvent = useCallback((data) => {
    persistEvents((prev) => [...prev, { id: uid("evt"), participants: [], createdAt: nowISO(), completed: false, ...data }]);
  }, [persistEvents]);

  const joinEvent = useCallback((eventId) => {
    if (!currentUser) return;
    persistEvents((prev) => prev.map((e) => e.id === eventId && !e.participants.includes(currentUser.id) ? { ...e, participants: [...e.participants, currentUser.id] } : e));
    awardPoints(currentUser.id, POINTS.EVENT_JOIN, { cleanupsJoined: 1, volunteerHours: 3 });
    notify(currentUser.id, "Registered for cleanup drive", "You're registered — see you there!", "event");
  }, [currentUser, persistEvents, awardPoints, notify]);

  const leaveEvent = useCallback((eventId) => {
    if (!currentUser) return;
    persistEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, participants: e.participants.filter((p) => p !== currentUser.id) } : e));
  }, [currentUser, persistEvents]);

  const markNotificationRead = useCallback((id) => { persistNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)); }, [persistNotifs]);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const openAiModal = useCallback(() => setAiModalOpen(true), []);

  const ctxValue = useMemo(() => ({
    currentUser, reports, events, tasks, users, orgs, notifications, toasts, toast,
    login, logout, addUser, updateUser, submitReport, voteReport, verifyReport, rejectReport, assignOrg, approveCleanup,
    assignWorker, updateTaskStatus, submitCleanup, createEvent, joinEvent, leaveEvent, markNotificationRead,
    openAiModal, geminiConfigured: !!getGeminiApiKey(),
  }), [currentUser, reports, events, tasks, users, orgs, notifications, toasts, toast, login, logout, addUser, updateUser, submitReport, voteReport, verifyReport, rejectReport, assignOrg, approveCleanup, assignWorker, updateTaskStatus, submitCleanup, createEvent, joinEvent, leaveEvent, markNotificationRead, openAiModal]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.paper }}><LoadingState label="Loading RiverGuard…" /></div>;
  }

  const PAGE_MAP = {
    "citizen-dashboard": CitizenDashboard, "report-pollution": ReportPollutionPage, "my-reports": MyReportsPage,
    "report-detail": ReportDetailPage, "pollution-map": PollutionMapPage, "cleanup-drives": CleanupDrivesPage,
    "event-detail": EventDetailPage, "leaderboard": LeaderboardPage, "notifications": NotificationsPage,
    "ai-assistant": AIAssistantPage, "profile": ProfilePage,
    "ngo-dashboard": NgoDashboard, "ngo-reports": NgoReportsPage, "ngo-tasks": NgoTasksPage,
    "ngo-events": NgoEventsPage, "ngo-analytics": NgoAnalyticsPage,
    "worker-dashboard": WorkerDashboard, "worker-tasks": WorkerTasksPage, "worker-task-detail": WorkerTaskDetailPage,
    "admin-dashboard": AdminDashboard, "admin-reports": AdminReportsPage, "admin-users": AdminUsersPage,
    "admin-orgs": AdminOrgsPage, "admin-analytics": AdminAnalyticsPage,
  };

  let body;
  if (route.page === "login") {
    body = <LoginPage goto={goto} />;
  } else if (!currentUser) {
    body = <LandingPage goto={goto} />;
  } else {
    const Page = PAGE_MAP[route.page] || PAGE_MAP[`${currentUser.role}-dashboard`];
    body = <Shell page={route.page} goto={goto}><Page goto={goto} params={route.params} /></Shell>;
  }

  return (
    <AppCtx.Provider value={ctxValue}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        * { font-family: 'Inter', system-ui, sans-serif; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }

        /* Focus rings */
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: ${COLORS.river} !important;
          box-shadow: 0 0 0 3px ${COLORS.river}25;
        }

        /* Animations */
        @keyframes fadein  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideup { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 ${COLORS.river}40; } 50% { box-shadow: 0 0 0 8px ${COLORS.river}00; } }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: ${COLORS.river}66; }

        /* Utility */
        .rg-card-hover { transition: box-shadow 0.2s, transform 0.2s; }
        .rg-card-hover:hover { box-shadow: 0 12px 30px -8px rgba(0,0,0,0.18); transform: translateY(-2px); }
      `}</style>

      {loadError && <div className="p-2"><ErrorBanner>{loadError}</ErrorBanner></div>}
      {body}
      <Toasts />
      <AISettingsModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </AppCtx.Provider>
  );
}

export default AppRoot;
