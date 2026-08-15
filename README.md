# 🌱 Krishi-Mitra (कृषि-मित्र)

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Nvidia](https://img.shields.io/badge/NVIDIA_NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://www.nvidia.com/)

A state-of-the-art digital agriculture platform engineered to empower modern farmers with real-time AI-guided crop advisory, instant computer-vision disease diagnosis, and localized climate intelligence. 

Designed with a premium glassmorphic interface, native multi-language translation, and a secure backend-proxy architecture, **Krishi-Mitra** bridge the gap between complex machine learning and accessible, on-the-field action.

---

## ✨ Premium Features

| Feature | Description | Tech Powering |
| :--- | :--- | :--- |
| **🤖 Hybrid AI Chatbot** | Interactive agricultural assistant translating instructions natively into English, Hindi, or Gujarati. | NVIDIA NIM (Nemotron-3-Ultra / Llama-3.1-70B) |
| **📸 Vision Crop Diagnosis** | Snap or upload crop leaves to get instant disease classification and actionable preventative tips. | Google Gemini 3.5 Flash |
| **🌤️ Location Telemetry** | High-contrast, time-aware localized weather reports with humidity, feels-like temperature, and wind speed. | OpenWeather API |
| **🔒 Edge Secure Proxy** | Backend-proxied API tokens ensuring zero exposure of developer credentials to the client browser. | Supabase Deno Edge Functions |
| **🌐 Native Localization** | Instantly swaps between English, Hindi (हिंदी), and Gujarati (ગુજરાતી) with polished accent-aware text layouts. | Context Translation API |

---

## 🏗️ Secure Architecture Flow

To prevent API key exposure and avoid client-side CORS leakage, Krishi-Mitra routes sensitive AI requests through secure serverless edge nodes and keeps secrets outside the browser runtime.

```mermaid
flowchart TD
    Client[Client Browser]
    SupabaseDB[(Supabase Postgres)]
    EdgeFn[Supabase Deno Edge Function]
    Vault[(Secure Secret Vault)]
    NvidiaAPI[NVIDIA NIM API]
    GeminiAPI[Google Gemini API]
    WeatherAPI[OpenWeather API]

    Client -->|1. Auth, session, and farm data| SupabaseDB
    Client -->|2. Secure chat or advisory request| EdgeFn
    EdgeFn -->|3. Read authorized secret| Vault
    EdgeFn -->|4. Proxy model call| NvidiaAPI

    Client -->|5. Upload leaf image| EdgeFn
    EdgeFn -->|6. Verified diagnosis request| GeminiAPI

    Client -->|7. Location weather lookup| WeatherAPI
```

This keeps the browser free from raw API credentials while still allowing authorized model access for chat, diagnosis, and advisory workflows.

---

## ⚡ Mobile SEO & Performance Notes

Krishi-Mitra is optimized for mobile-first performance and Lighthouse analysis.

- Removed blocking external font CSS from the initial critical path
- Deferred non-critical provider initialization until after first paint
- Split large vendor chunks so the landing page loads a lighter initial bundle
- Replaced heavy startup UI patterns with smaller native controls on the first screen
- Kept the app shell lean to reduce render-blocking CSS and unused JavaScript on slow mobile connections

These optimizations are intended to improve first paint, LCP, and overall mobile SEO readiness while preserving the premium app experience.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
* **State & Transitions:** React Router, Tailwind Animations, CSS View Transitions (staggered theme swaps)
* **Backend Database:** Supabase Postgres, Row Level Security (RLS) policies
* **Serverless Edge:** Supabase Deno Deploy Functions
* **AI Engine & Telemetry:** NVIDIA NIM (Llama-3.1-70B Fail-safe), Google Gemini 3.5 Flash, OpenWeather API

---

## 🚀 Getting Started

Follow these steps to spin up the development workspace on your local machine:

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Secrets
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Open `.env` and fill in your developer keys:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co/"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_GEMINI_API_KEY="your-gemini-3.5-flash-key"
VITE_WEATHER_API_KEY="your-openweather-api-key"
VITE_WEB3FORMS_API_KEY="your-web3forms-key"
VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
VITE_GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

> [!WARNING]
> The `.gitignore` file is pre-configured to block pushing `.env` files to GitHub. Never check your real keys into Git!

### 3. Deploy Backend Secrets
To configure the secure edge proxy chatbot on your live Supabase database, set the NVIDIA key secret:
```bash
npx supabase secrets set NVIDIA_API_KEY="your-nvidia-nim-token" --project-ref your-project-ref
```

### 4. Run Locally
```bash
npm run dev
```

---

## 📦 Production Builds

To compile and optimize assets for production hosting (Vercel, Netlify, or AWS):

```bash
npm run build
```

> [!TIP]
> When deploying to **Vercel** or **Netlify**, configure the environment variables under project settings so the compiler can safely inject them during the build stage.

---

## 📝 License & Maintainer

Distributed under the MIT License. Designed and developed by **Neev Lila**.

*For feature requests, bug reports, or project inquiries, please open an issue in the repository.*
