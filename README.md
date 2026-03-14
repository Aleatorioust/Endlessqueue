```markdown
# EndlessQueue 📻

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

**EndlessQueue** is a minimalist, continuous audio playback engine, developed specifically for content creators running long-format live streams (like 24/7 lo-fi radios) using **OBS Studio**. 

Unlike traditional players (like VLC or Foobar2000), EndlessQueue was designed for dynamic management: you can add, remove, and rearrange tracks in real-time without stuttering, ensuring your stream never goes silent.

---

## ✨ Key Features

* 🔀 **Automatic Crossfade (Dual-Engine):** Smooth transitions between songs using two native HTML5 audio instances. No abrupt cuts.
* 🖱️ **Instant Drag & Drop:** Drag dozens of `.mp3`, `.wav`, or `.flac` files directly into the interface to add them to the queue in real-time.
* 🛡️ **Anti-Silence Protection:** If the queue ends, the app enters automatic loop mode (repeating the playlist or the last track).
* ⌨️ **Hotkey Controls:** Add songs to the end of the queue (`CTRL + E`), play next (`CTRL + N`), or skip tracks (`CTRL + S`) quickly.
* 🎛️ **Media Session API:** The browser recognizes the app as a native OS media player. This prevents the background tab from "sleeping" and allows you to use your keyboard's multimedia keys, even when the window is minimized.

---

## 🚀 How to install and run locally

Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

1. Clone this repository:
   ```bash
   git clone [https://github.com/Aleatorioust/Endlessqueue.git](https://github.com/Aleatorioust/Endlessqueue.git)

```

2. Access the project folder:
```bash
cd Endlessqueue

```


3. Install dependencies:
```bash
npm install

```


4. Start the development server:
```bash
npm run dev

```


5. Access `http://localhost:5173` in your browser.

---

## 📡 How to use with OBS Studio

EndlessQueue is extremely lightweight and easy to capture:

1. Start the project locally (`npm run dev`).
2. In OBS Studio, add a new **Window Capture** source pointing to your browser, or use a **Browser Source** pointing to `http://localhost:5173`.
3. Drag your generated or downloaded songs directly onto the screen. The audio will be automatically captured by OBS's Desktop Audio.

---

## 🛠️ Tech Stack

* **Frontend:** React (bootstrapped with Vite)
* **Styling:** Tailwind CSS v4
* **Icons:** Lucide React

---

*Developed by [Aleatorioust](https://www.google.com/search?q=https://github.com/Aleatorioust) to make life easier for streamers and continuous radio creators.*


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
