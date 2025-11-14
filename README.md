# Krishi Mitra

Krishi Mitra is a web platform built to give farmers clear, reliable and usable information. It combines AI-generated crop advisory, image-based disease detection, live weather data and a simple market linkage system. The goal is to help farmers make better decisions with less guesswork.

**Live Demo:** https://krishi-miitra.vercel.app/

---

## Features

### Farm Advisory (AI)
Select a crop, location and season.  
The system uses Gemini to generate a structured advisory that includes:

- Crop diagnosis  
- Best practices  
- Common challenges  
- Fertilizer strategy  
- Irrigation schedule  
- Harvesting guidance  

The output is specific to the crop and region, not generic text.

---

### Disease Detection (Image Upload)
Upload a photo of a leaf or plant.  
Gemini Vision analyzes the image and returns:

- Clear diagnosis  
- Confidence score  
- Direct treatment steps  

Example:  
**Diagnosis:** Severe Leaf Blight  
**Confidence:** 85%  
**Advice:** Remove infected debris, apply broad-spectrum fungicide, avoid overhead watering, improve air movement.

---

### Live Weather
A quick weather tool that lets farmers check any city’s current conditions.  
Useful for irrigation, spraying, and field planning.

---

### Market Linkage
A simple space for farmers to track crop listings:

- Crop name  
- Quantity  
- Unit  
- Expected price  

Farmers can edit or delete their entries.  
Data is stored in Supabase.

---

## Tech Stack

**Frontend**  
- React  
- Vite  
- Tailwind CSS  

**APIs & Services**  
- Gemini API (advisory + disease detection)  
- Weather API (live weather)  
- Supabase (database + auth)  
- Google OAuth  
- Web3Forms (contact form)

**Deployment**  
- Vercel  

---

## Environment Variables

The project requires the following:

VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_GEMINI_API_KEY
VITE_WEATHER_API_KEY
VITE_WEB3FORMS_API_KEY
VITE_GOOGLE_CLIENT_ID
VITE_GOOGLE_CLIENT_SECRET


Add them to a `.env` file before running the project locally.

---

## Getting Started

Clone the repository:

git clone https://github.com/neevlila/krishi-miitra.git
cd krishi-miitra

Install dependencies:

npm install

Run locally:

npm run dev
