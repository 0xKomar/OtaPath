# OtaPath

OtaPath is a walking companion and post-TMS recovery project. This repository
contains the application and the editable source and assets for its demo video.

- [Project description](PROJECT_DESCRIPTION.md): purpose, problem, solution,
  features, technology stack, architecture, and prototype scope.
- [Application](OtaPath/README.md): the Next.js patient app, clinician portal,
  API routes, and database schema.
- [Demo video](otapath-video/README.md): the Remotion pitch video, recordings,
  narration, music, and capture scripts.

## Run the application

```bash
cd OtaPath
npm ci
cp .env.local.example .env.local
npm run dev
```

Fill in `.env.local` for the services you want to use. See the application README
and environment template for configuration details.

## Preview or render the video

```bash
cd otapath-video
npm ci
npm run dev
# Export the video:
npm run render
```

See the video README for recording and audio generation instructions.
