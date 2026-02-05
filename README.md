# Heuristic Evaluator

A UX heuristic evaluation tool using the **Tenets & Traps Framework**. Upload your UI designs and get AI-powered analysis identifying usability issues with actionable remediation strategies.

![Heuristic Evaluator](https://img.shields.io/badge/React-18.2-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3.3-38bdf8) ![Vite](https://img.shields.io/badge/Vite-4.3-646cff)

## Features

- **9 Tenets & 25 Traps** — Comprehensive UX evaluation framework
- **AI-Powered Analysis** — Uses Claude API to identify usability issues
- **Visual Annotations** — Trap markers displayed directly on your design
- **3 Remediation Types** — Quick Pivot, Architectural Solve, AI-Assisted Fix
- **Tenet Scoring** — 1-5 scale rating for each tenet
- **Context-Aware** — Adjusts severity based on persona and use case
- **Export Results** — Download evaluation as JSON

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/heuristic-evaluator.git
cd heuristic-evaluator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` folder.

## Usage

1. **Add Context** — Enter workflow name (required), plus optional EPIC details, persona, and use case description
2. **Upload Design** — Add one or more screenshots of your UI
3. **Run Evaluation** — Click "Run Evaluation" to analyze
4. **Review Results** — See traps marked on your design with severity ratings and fixes
5. **Export** — Download results as JSON for documentation

## Tenets & Traps Framework

### 9 Tenets

| Tenet | Description |
|-------|-------------|
| **Understandable** | User can comprehend the interface |
| **Responsive** | System responds quickly with feedback |
| **Comfortable** | Minimal physical effort required |
| **Forgiving** | Easy recovery from mistakes |
| **Protective** | Safeguards user data |
| **Beautiful** | Aesthetically pleasing |
| **Efficient** | Minimal steps and cognitive load |
| **Discreet** | Respects user privacy |
| **Habituating** | Consistent and predictable |

### 25 Traps

The framework identifies 25 usability traps across the 9 tenets, including:
- Distraction, Feedback Failure, Memory Challenge
- Slow Response, Accidental Activation
- Irreversible Action, Data Loss
- Information Overload, Unnecessary Step
- And more...

Click "Know more" in the app to see the complete reference.

## Severity Scale

| Level | Label | Description |
|-------|-------|-------------|
| P1 | Dangerous | Blocks user completely or causes harm |
| P2 | Critical | Major friction, user may abandon |
| P3 | High | Significant usability issue |
| P4 | Medium | Noticeable friction |
| P5 | Low | Minor issue |

## Deployment

### GitHub Pages

1. Update `vite.config.js` with your repo name:
   ```js
   base: '/your-repo-name/',
   ```

2. Build and deploy:
   ```bash
   npm run build
   ```

3. Push the `dist/` folder to the `gh-pages` branch, or use GitHub Actions.

### Vercel / Netlify

Simply connect your GitHub repo — these platforms auto-detect Vite projects.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
```

## API Configuration

The app uses the Anthropic Claude API. For production deployment, you may need to:

1. Set up a backend proxy to handle API calls securely
2. Or configure CORS appropriately for your domain

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License — feel free to use this for personal or commercial projects.

## Credits

- **Tenets & Traps Framework** — UX evaluation methodology
- **Claude API** — AI-powered design analysis
- **React + Vite + Tailwind** — Frontend stack

---

Built with ❤️ for the UX community
