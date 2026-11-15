// Records every piece of real OtaPath footage used in the video.
//   node capture/record.mjs            → everything
//   PARTS=broll node capture/record.mjs    → landing + /demo stage only
//   PARTS=journey node capture/record.mjs  → patient journey + clinician closed loop
// Requires: the app on :3100 and the local Supabase stack (see README).
import path from "node:path";
import {
  launch, newContext, startRecorder, openStaged, resetDb, demoCmd,
  sleep, tap, hover, moveTo, typeSlow, ROOT,
} from "./lib.mjs";

const FAST = process.env.FAST === "1"; // dev: skip the patient journey, test the clinician loop
const PARTS = (process.env.PARTS ?? "broll,journey").split(",");
const ASSETS = path.join(ROOT, "capture", "assets");
const VOICE_NOTE =
  "Golden light through the birch leaves, and a bird singing somewhere above me. The air feels soft and warm. I'm glad I came.";
const DOCTOR_NOTE = "Lovely capsule today, Matti. Next step: a quiet coffee among people. No pressure to talk.";
const CHECKIN = "Proud of you for getting outside today, Matti.";

const logErrors = (page, tag) =>
  page.on("console", (m) => m.type() === "error" && !/ERR_FAILED/.test(m.text()) && console.log(`[${tag} console.error]`, m.text().slice(0, 160)));

async function wheel(page, dy, ms = 900) {
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await sleep(15);
  }
}

/* ───────────────────────── b-roll: landing + /demo stage ───────────────────────── */
async function broll() {
  resetDb();
  const browser = await launch();
  const ctx = await newContext(browser, { width: 1600, height: 900, dsf: 1, cursor: "arrow" });
  // companion already named, so the stage phone shows the map straight away
  await ctx.addInitScript(() => {
    try { localStorage.setItem("otapath-dogname", "Ota"); } catch {}
  });

  // landing
  {
    const { page, app } = await openStaged(ctx, { route: "/", w: 1600, h: 900, scale: 1.8, bg: "#FDF8EE" });
    logErrors(page, "landing");
    await app.getByRole("heading", { name: "OtaPath" }).waitFor();
    await sleep(1200);
    const rec = await startRecorder(page, "landing", { quality: 88 });
    await sleep(1600);
    for (const t of ["Guided demo", "Clinician dashboard", "Patient app"]) {
      await hover(page, app.getByRole("heading", { name: t }), { ms: 700 });
      rec.mark(`hover:${t}`);
      await sleep(900);
    }
    await sleep(600);
    await rec.stop();
    await page.close();
  }

  await browser.close();

  // the app's own guided stage: phone + journey deck
  // (one browser per recorded page — only a browser's first window gets the
  //  full, chrome-less viewport in the screencast)
  const browser2 = await launch();
  const ctx2 = await newContext(browser2, { width: 1600, height: 900, dsf: 1, cursor: "arrow" });
  await ctx2.addInitScript(() => {
    try { localStorage.setItem("otapath-dogname", "Ota"); } catch {}
  });
  {
    const ctx = ctx2;
    const { page, app } = await openStaged(ctx, { route: "/demo", w: 1600, h: 900, scale: 1.8, bg: "#F7F7F5" });
    logErrors(page, "stage");
    await app.getByRole("button", { name: /Begin the journey/ }).waitFor();
    await sleep(6000); // let the phone iframe sign in + paint tiles
    const rec = await startRecorder(page, "stage", { quality: 88 });
    await sleep(2600);
    await tap(page, app.getByRole("button", { name: /Begin the journey/ }), { ms: 800 });
    rec.mark("slide:2");
    await sleep(3600);
    const next = app.getByRole("button", { name: "Next slide" });
    for (let i = 3; i <= 9; i++) {
      await tap(page, next, { ms: 500 });
      rec.mark(`slide:${i}`);
      await sleep(3400);
    }
    await rec.stop();
    await page.close();
  }
  await browser2.close();
}

async function openClinic() {
  const browser = await launch();
  const cctx = await newContext(browser, { width: 1600, height: 900, dsf: 1, cursor: "arrow" });
  const C = await openStaged(cctx, { route: "/clinician", w: 1600, h: 900, scale: 1.8, bg: "#1C1917" });
  logErrors(C.page, "clinic");
  await C.app.getByRole("heading", { name: "Caseload" }).waitFor({ timeout: 20000 });
  await C.app.getByRole("button", { name: /Review/ }).first().waitFor();
  return { ...C, cctx, browser };
}

async function reviewMatti(C, opts) {
  const idx = await C.frame.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => /Review/.test(b.textContent ?? ""))
      .findIndex((b) => {
        let el = b.parentElement;
        for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
          const t = el.innerText;
          if (/Matti Virtanen/.test(t)) return !/Eero|Sofia/.test(t);
        }
        return false;
      })
  );
  await tap(C.page, C.app.getByRole("button", { name: /Review/ }).nth(Math.max(0, idx)), opts);
  await C.app.getByText(/Remission stability/i).waitFor({ timeout: 20000 });
}

/* ───────────────────── journey: patient app → clinician closed loop ───────────────────── */
async function journey() {
  resetDb();
  const browser = await launch({ micWav: path.join(ASSETS, "matti-voice.wav") });

  /* ---- clinician, BEFORE today's walk: the drift the dashboard already flagged ---- */
  {
    const C = await openClinic();
    const cp = C.page, ca = C.app;
    await sleep(1500);
    const rec0 = await startRecorder(cp, "clinic-before", { quality: 88 });
    rec0.mark("dash");
    await moveTo(cp, 1500, 520, 600);
    await sleep(2400);
    await reviewMatti(C, { ms: 800, pre: 500 });
    rec0.mark("review");
    await sleep(1200);
    await hover(cp, ca.getByText(/Early Relapse Drift Detected/), { ms: 700 });
    rec0.mark("alert");
    await sleep(3400);
    await hover(cp, ca.getByText("Acoustic voice prosody"), { ms: 600, dy: 150 });
    await sleep(1500);
    await wheel(cp, 520, 1100);
    rec0.mark("charts");
    await sleep(3200);
    await rec0.stop();
    await C.browser.close();
  }

  /* ---- patient phone ---- */
  const pctx = await newContext(browser, { width: 430, height: 900, dsf: 1, cursor: "touch" });
  // Headless Chromium has no dependable speech-to-text backend (and we don't want
  // demo audio sent to a cloud recogniser), so the app takes its built-in
  // "type a few words instead" path. The acoustic analysis still runs on the mic.
  await pctx.addInitScript(() => {
    try {
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
      Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
      Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
    } catch {}
  });
  const { page, app, frame } = await openStaged(pctx, { route: "/app", w: 430, h: 900, scale: 2.4, bg: "#FDF8EE" });
  logErrors(page, "phone");
  await app.locator(".leaflet-container").waitFor({ timeout: 20000 });
  await sleep(900);
  let rec = await startRecorder(page, "phone");

  // 1 · meet the companion
  const nameInput = app.getByPlaceholder("What should we call him?");
  await nameInput.waitFor({ timeout: 15000 });
  rec.mark("name-sheet");
  await sleep(1500);
  await tap(page, nameInput);
  await typeSlow(page, "Ota", 130);
  await sleep(500);
  await tap(page, app.getByRole("button", { name: /his name/ }));
  rec.mark("named");
  await sleep(3200);

  if (!FAST) {
  // 2 · the doctor's quest is already waiting
  const peek = app.locator("button[aria-expanded]").filter({ hasText: /· \d+(\.\d+)? k?m/ }).first();
  await tap(page, peek);
  rec.mark("mission-open");
  await sleep(3800);
  await tap(page, peek);
  rec.mark("mission-closed");
  await sleep(900);

  // 3 · the walk — the app's built-in 550 m walk simulator (same command /demo's remote sends)
  await demoCmd(frame, { t: "walk" });
  rec.mark("walk-start");
  await app.getByText(/lovely 550 m wander/).waitFor({ timeout: 60000 });
  rec.mark("walk-end");
  await sleep(2500);

  // 4 · memory capsule: photo → 10 s voice note → tucked away
  await tap(page, peek);
  await sleep(700);
  await tap(page, app.getByRole("button", { name: /Complete mission/ }));
  rec.mark("capture-open");
  await sleep(1600);
  const chooser = page.waitForEvent("filechooser");
  await tap(page, app.getByRole("button", { name: /Tap to take or upload a photo/ }));
  await (await chooser).setFiles(path.join(ASSETS, "birch-gold.jpg"));
  rec.mark("photo-set");
  await app.getByAltText("Captured moment").waitFor();
  await sleep(2800);
  await tap(page, app.getByRole("button", { name: /next/i }));
  rec.mark("voice-step");
  await sleep(1300);
  await tap(page, app.getByRole("button", { name: "Start recording" }));
  rec.mark("rec-start");
  await app.getByText(/got it ·/).waitFor({ timeout: 20000 });
  rec.mark("rec-stop");
  await sleep(700);
  const ta = app.locator("textarea");
  await tap(page, ta);
  await typeSlow(page, VOICE_NOTE, 16);
  rec.mark("transcript");
  await sleep(900);
  await tap(page, app.getByRole("button", { name: "Tuck it away" }));
  rec.mark("tucked");
  await app.getByText(/Tucked away/).waitFor({ timeout: 20000 });
  rec.mark("result");
  await sleep(3600);
  await tap(page, app.getByRole("button", { name: /Back to the sunshine/ }));
  rec.mark("back-to-map");
  await sleep(4500);

  // 5 · the atlas
  await tap(page, app.getByRole("link", { name: /Atlas/ }));
  rec.mark("atlas");
  await sleep(4500);

  // 6 · memory echo — the week-old cinema capsule, frosted until he looks back
  await tap(page, app.getByRole("button", { name: "Memory echoes" }));
  rec.mark("echo-open");
  await app.getByText(/Do you remember/).waitFor({ timeout: 15000 });
  await sleep(3200);
  await tap(page, app.getByRole("button", { name: /Reveal memory/ }));
  rec.mark("echo-revealed");
  await sleep(3800);
  await tap(page, app.getByRole("button", { name: /Back to the map/ }));
  rec.mark("echo-closed");
  await sleep(1500);
  }
  await rec.stop();

  // on the map, card folded, ready for the clinician's move
  await sleep(1500);
  const openPeek = app.locator('button[aria-expanded="true"]').filter({ hasText: /· \d+(\.\d+)? k?m/ });
  if (await openPeek.count()) await tap(page, openPeek.first());
  await sleep(1500);
  await moveTo(page, 900, 1700, 300);

  /* ---- clinician portal AFTER the capsule (separate browser context, same backend) ---- */
  const C = await openClinic();
  const cp = C.page, ca = C.app;
  await sleep(1200);
  await reviewMatti(C, { ms: 500 });
  await sleep(2500);
  await moveTo(cp, 2300, 900, 400);

  // both recorders share the wall clock → the edit can sync them exactly
  const crec = await startRecorder(cp, "clinic", { quality: 88 });
  rec = await startRecorder(page, "phone2");
  const both = (l) => { crec.mark(l); rec.mark(l); };

  both("detail");
  await sleep(1800);
  await hover(cp, ca.getByText("Acoustic voice prosody"), { ms: 800, dx: 330, dy: 60 });
  await sleep(1500);
  await hover(cp, ca.getByText("NLP savoring & recall"), { ms: 800, dx: 330, dy: 60 });
  both("charts");
  await sleep(2200);

  await tap(cp, ca.getByRole("button", { name: "Memory Capsules" }), { ms: 600 });
  both("capsules");
  await sleep(1600);
  const playBtn = ca.getByRole("button", { name: /^\d+s$/ }).first();
  if (await playBtn.count()) {
    await tap(cp, playBtn, { ms: 700, pre: 400 });
    both("capsule-play");
    await sleep(2800);
  }

  await tap(cp, ca.getByRole("button", { name: /Prescribe custom mission/ }), { ms: 800 });
  both("builder");
  await sleep(1400);
  await C.frame.evaluate(() => window.dispatchEvent(new Event("resize")));
  await sleep(1400);
  await tap(cp, ca.getByRole("button", { name: "Corner café window" }), { ms: 700 });
  both("picked");
  await sleep(1200);
  await tap(cp, ca.getByPlaceholder(/Hi Matti/), { ms: 600 });
  await typeSlow(cp, DOCTOR_NOTE, 14);
  await sleep(700);
  await tap(cp, ca.getByRole("button", { name: /Send to Matti/ }), { ms: 600, pre: 350 });
  both("mission-sent");

  await app.getByText(/sent you a mission/).waitFor({ timeout: 20000 });
  both("mission-landed");
  await sleep(2600);
  const peek2 = app.locator("button[aria-expanded]").filter({ hasText: /· \d+(\.\d+)? k?m/ }).first();
  await tap(page, peek2);
  both("phone-mission-open");
  await sleep(4200);
  await tap(page, peek2);
  await sleep(600);

  await tap(cp, ca.getByPlaceholder(/A short, kind line/), { ms: 700 });
  await typeSlow(cp, CHECKIN, 18);
  await sleep(500);
  await tap(cp, ca.getByRole("button", { name: /Send check-in/ }), { ms: 500, pre: 300 });
  both("nudge-sent");
  await app.getByText(CHECKIN).waitFor({ timeout: 20000 });
  both("nudge-landed");
  await sleep(4500);

  await crec.stop();
  await rec.stop();
  await C.browser.close();
  await browser.close();
}

if (PARTS.includes("broll")) await broll();
if (PARTS.includes("journey")) await journey();
console.log("done");
