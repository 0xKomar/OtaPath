# ☀️ OtaPath — Your Personal Walking Companion & Post-TMS Recovery Journey

> **From Poland with ❤️ in Finland** 🇵🇱 🤝 🇫🇮  
> *Built during a hackathon at the Otaniemi campus (Aalto University, Espoo, Finland).*

---

## 🌱 The Story Behind OtaPath & Why We Chose This Name

The name **OtaPath** brings together place, neuroscience, and personal recovery:
* **“Ota”** comes from **Otaniemi** — the lush, coastal campus of Aalto University in Finland, surrounded by forests, bays, and Alvar Aalto’s warm organic architecture, where this project was born.
* **“Path”** represents both the literal neighborhood streets a patient uncovers step by step on their map and their personal journey back to sustained mental health after hospital discharge.

We combined Polish engineering craft and empathetic product design with the Finnish philosophy of connection to nature (*luontosuhde*) and world-leading brain stimulation research pioneered in Aalto’s labs. The result is **OtaPath** — an app that never feels like a cold medical form, but rather a warm, living travel diary of rediscovering the world around you.

---

## 💡 Why This Problem Matters

Transcranial Magnetic Stimulation (**TMS**) is a breakthrough treatment that lifts patients out of severe, treatment-resistant depression and restores prefrontal neuroplasticity. However, a critical care gap opens the moment a patient is discharged from the hospital:

1. **The Post-TMS Maintenance Gap:** Daily clinic sessions end, and patients are sent home alone. Clinical studies show that without structured maintenance, **roughly 1 in 3 responders relapse within 12 months** (*Dunner et al., 2014*).
2. **Questionnaire Fatigue:** Someone recovering from severe depression lacks the cognitive energy to fill out daily clinical forms (such as PHQ-9). Traditional mood-tracking apps suffer massive drop-off within days.
3. **Silent Early Relapse Drift:** Days before a patient reaches out to their clinic, subtle behavioral shifts appear—their walking radius contracts, their vocal pitch becomes flatter and slower, and their attention narrows toward negative cues.

**OtaPath bridges this gap**—turning post-TMS maintenance into a gentle, real-world exploration game with zero guilt, zero streak penalties, and zero questionnaires.

---

## ✨ How OtaPath Helps (Core Capabilities)

### 1. 🗺️ Real-World Exploration Map & Graded Micro-Quests (Behavioral Activation)
* Instead of judging the user, OtaPath clears golden mist off their neighborhood map as they walk—turning daily steps into a low-pressure discovery game.
* **Zero Guilt on Hard Days:** No broken streaks or red warning icons. If a patient is having a low-energy morning or is physically unwell (**Sick / Look Out the Window Mode**), OtaPath adapts gently with an indoor sensory task (e.g., *"Look out your window for 60 seconds, capture the light in the sky, and tell your future self one detail you notice"*).
* **Graded Return to Social Life:** Powered by real-time OpenStreetMap data, the app matches destinations to the patient's daily energy—starting with a quiet nearby park (200–400 m), gradually unlocking low-pressure social spaces (cinemas, museums, libraries), and eventually sports clubs.

### 2. 📸 Photo-Hunt & Living Time Capsules (Savoring & Audio Diary)
* At each destination, the patient completes a tiny attentional prompt (e.g., *"Snap one vivid color in nature"*) and records a **10-second voice note** for their future self.
* The photo, voice reflection, and generated soundtrack form a **Time Capsule** pinned to that exact spot on the map—giving speaking into the phone genuine personal meaning rather than feeling like a diagnostic test.

### 3. 🎙️ Passive Voice DSP & Visual Biomarkers (Hidden Diagnostics)
* During the 10-second diary recording, our **Web Audio API** DSP pipeline extracts real acoustic biomarkers: fundamental frequency variance ($F_0$), RMS vocal energy, speech-to-pause ratio, and initiation latency.
* Client-side image analysis measures photo luminance and color vibrancy, while NLP evaluates **sensory savoring richness**. All signals are compared strictly against the patient's own post-TMS discharge baseline.

### 4. 🎧 Personalized ElevenLabs Music + Clinic-Calibrated Brainwaves (IAF)
* Every memory unlocks a bespoke instrumental track generated via **ElevenLabs Music API**, tailored to the patient's chosen musical vibe (Lively Indie Acoustic, Calm Felt Piano, Warm Lo-Fi, or Pure Nature Soundscapes) and current location.
* Layered beneath the music is stereo binaural beat entrainment tuned to the patient's **Individual Alpha Frequency (IAF)** measured via EEG at TMS hospital discharge (or classic `10 Hz Alpha` / `6 Hz Theta` protocols), gently syncing tempo with their walking cadence.

### 5. 🕰️ Memory Echo (Autobiographical Memory Rehabilitation)
* After 7 days, map pins gently dim. Recalling one concrete detail from that walk unblurs the photo and replays the patient's own happy voice note from a good day—adapting clinical Memory Specificity Training (MEST) into an everyday game.

### 6. 🩺 TMS Clinician Portal & Closed-Loop Learning (Contextual Bandit RL)
* Psychiatrists aren't drowned in raw sensor noise. They see a clean triage overview, can view the patient's photos and listen to their voice notes, **manually prescribe custom missions on the patient's map**, or send a warm check-in message in one click.
* Under the hood, a **Contextual Multi-Armed Bandit** learns which places and ElevenLabs musical styles best lift each individual patient's next-day vocal energy and HRV.

---

## 🚀 How to Run & Experience the Demo

### Step 1: Local Setup
```bash
# 1. Clone the repository and install dependencies
npm install

# 2. Configure API keys in .env.local (optional — full offline/synthesizer fallbacks are built in!)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
OPENAI_API_KEY=your_openai_api_key

# 3. Initialize the SQLite database and start the dev server
npx prisma db push
npm run dev
```
