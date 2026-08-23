/*
 * Page copy — single source of truth, mirrored from the Next build's
 * lib/content.ts. Plain globals: loaded before every component script, so
 * `profile`, `socials`, and `navLinks` are in scope everywhere with no import.
 */

const profile = {
  name: "Sabbir",
  surname: "Hassan",
  fullName: "Sabbir Hassan",
  role: "Fullstack Developer & Designer",
  tagline:
    "I build high-performance software and pixel-perfect interfaces that are fast, beautiful and purposeful",
  email: "sbbir0087@gmail.com",
  phone: "+880 1XXX-XXXXXX",
  location: "Dhaka, Bangladesh",
  hours: "Daily: 10 AM — 6 PM",
  year: "2026",
};

const socials = [
  { label: "GitHub", href: "https://github.com/sabbirmurad" },
  { label: "YouTube", href: "https://www.youtube.com/@itscompiletime" },
  { label: "Fiverr", href: "https://www.fiverr.com/sabbirhassan" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/sabbirhassan" },
  { label: "Discord", href: "https://discord.gg/Ym2EHCx5" },
  { label: "Facebook", href: "https://www.facebook.com/sabbir.murad.503" },
];

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Work", href: "#work" },
  { label: "Contact", href: "#contact" },
];

const stats = [
  { value: 20, suffix: "+", label: "Projects Shipped" },
  { value: 5, suffix: "+", label: "Years Experience" },
  { value: 5, suffix: "", label: "Languages" },
  { value: 100, suffix: "%", label: "Client Satisfaction" },
];

const stack = [
  { name: "Rust", icon: "/assets/icon/rust.svg" },
  { name: "C++", icon: "/assets/icon/c_plus_plsu.svg" },
  { name: "Flutter", icon: "/assets/icon/flutter.svg" },
  { name: "Tauri", icon: "/assets/icon/tauri.svg" },
  { name: "MongoDB", icon: "/assets/icon/mongodb.svg" },
  { name: "MySQL", icon: "/assets/icon/mysql.svg" },
  { name: "Redis", icon: "/assets/icon/redis.svg" },
  { name: "ScyllaDB", icon: "/assets/icon/scylla.svg" },
  { name: "SQLite", icon: "/assets/icon/sqlite.svg" },
  { name: "Figma", icon: "/assets/icon/figma.svg" },
  { name: "Adobe XD", icon: "/assets/icon/adobe_xd.svg" },
  { name: "MkDocs", icon: "/assets/icon/mkdocs.svg" },
];

const services = [
  {
    num: "001",
    title: "Backend & Systems",
    blurb:
      "High-performance, memory-safe services built in Rust — APIs, real-time systems, and infrastructure designed to stay fast under load.",
    tags: ["Rust", "Actix-Web", "Tokio", "WebSockets", "REST APIs"],
    tone: "#DE4520",
    icon: "server",
  },
  {
    num: "002",
    title: "Website Development",
    blurb:
      "Fast, responsive websites and web apps — from marketing sites to full product dashboards, built with modern frameworks and clean, maintainable code.",
    tags: ["React", "Next.js", "Tailwind CSS", "SEO", "Performance"],
    tone: "#14B8A6",
    icon: "globe",
  },
  {
    num: "003",
    title: "Mobile Apps",
    blurb:
      "Cross-platform iOS and Android apps with native performance. Smooth animations, offline-first architecture, one codebase.",
    tags: ["Flutter", "Dart", "Riverpod", "Hive", "Firebase"],
    tone: "#54C5F8",
    icon: "smartphone",
  },
  {
    num: "004",
    title: "UI/UX Design",
    blurb:
      "End-to-end design, from wireframes to polished prototypes. Design systems and component libraries developers can actually build from.",
    tags: ["Figma", "Adobe XD", "Prototyping", "Design Systems"],
    tone: "#A855F7",
    icon: "palette",
  },
  {
    num: "005",
    title: "Desktop Software",
    blurb:
      "Native desktop applications and CLI tooling in Rust and C++ — system utilities that are fast, small, and built to last.",
    tags: ["Rust", "C++", "Tauri", "CLI Tools", "Cross-platform"],
    tone: "#22C55E",
    icon: "monitor",
  },
  {
    num: "006",
    title: "AI Automation",
    blurb:
      "Practical AI integration — LLM-powered features, automated workflows, and custom agents that cut manual work without adding fragile complexity.",
    tags: ["LLM Integration", "Workflow Automation", "Python", "Agents"],
    tone: "#6366F1",
    icon: "cpu",
  },
  {
    num: "007",
    title: "Technical Consultation",
    blurb:
      "Architecture reviews, code audits, and technical strategy for teams that need an outside eye — clear recommendations, not just a report.",
    tags: ["Architecture Review", "Code Audits", "Tech Strategy", "Mentorship"],
    tone: "#EAB308",
    icon: "chat",
  },
];

/* Projects are not listed here. They come from GET /api/project/feed and are
   managed in the dashboard — see assets/jsx/project_card.jsx. Nothing published
   means the pages show their empty state, not a stand-in set. */

/* `category` is the single bucket a doc falls into on the documentations page;
   the filter bar is built from the categories present here, so adding a doc
   with a new category adds the filter. `tags` stay free-form. */
const docs = [
  {
    title: "Hyper API Reference",
    category: "Rust",
    blurb:
      "Endpoint reference for the task queue HTTP API — authentication, job submission, priority scheduling, and webhook payloads, with runnable examples.",
    tags: ["Rust", "OpenAPI", "MkDocs"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Pixel Component Guide",
    category: "JavaScript",
    blurb:
      "Usage docs for all 30+ components — props, accessibility notes, keyboard behaviour, and theming tokens, with a live example beside each entry.",
    tags: ["JavaScript", "A11y", "Design Tokens"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Finora Architecture Notes",
    category: "Flutter",
    blurb:
      "How the offline-first layer works: Hive schema design, conflict resolution on sync, and why the state model is split the way it is.",
    tags: ["Flutter", "Hive", "Architecture"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Rust for Systems Work",
    category: "Rust",
    blurb:
      "A working guide to ownership, lifetimes, and async Tokio — written for engineers arriving from C++ who want the model, not a syntax tour.",
    tags: ["Rust", "Tokio", "Teaching"],
    href: "https://www.youtube.com/@itscompiletime",
  },
  {
    title: "Deployment Handbook",
    category: "DevOps",
    blurb:
      "The shipping checklist I run for every project — environment layout, migrations, rollback strategy, and what to have wired up before launch day.",
    tags: ["DevOps", "MySQL", "CI/CD"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Design System Primer",
    category: "Design",
    blurb:
      "Turning a Figma library into shipped components without losing intent — token naming, handoff structure, and keeping the two in sync over time.",
    tags: ["Figma", "Design Systems", "Tokens"],
    href: "https://github.com/sabbirmurad",
  },
];

/* The YouTube section renders this until /api/youtube/feed answers (and instead
   of it, if the feed is unavailable). Counts are left as em dashes rather than
   invented, and `video_id: null` marks an entry the player can't embed — those
   cards link out to the channel instead. */
const youtube = {
  channel: {
    name: "Compile Time",
    handle: "@itscompiletime",
    description:
      "Tutorials on Rust, Flutter, and vanilla JS. Deep-dives into system design, UI/UX teardowns, and the occasional competitive programming walkthrough.",
    subscribers: "—",
    video_count: "—",
    total_views: "—",
    since: "—",
    avatar_url: "",
  },
  videos: [
    {
      video_id: null,
      label: "Rust",
      title: "Building a REST API in Rust with Actix-Web from scratch",
      thumbnail: "",
      views: "",
      duration: "",
      published_at: "",
    },
    {
      video_id: null,
      label: "Flutter",
      title: "Riverpod — state management that actually makes sense",
      thumbnail: "",
      views: "",
      duration: "",
      published_at: "",
    },
    {
      video_id: null,
      label: "Vanilla JS",
      title: "Custom JS components with zero dependencies, the right way",
      thumbnail: "",
      views: "",
      duration: "",
      published_at: "",
    },
    {
      video_id: null,
      label: "C++",
      title: "Competitive programming patterns worth memorising",
      thumbnail: "",
      views: "",
      duration: "",
      published_at: "",
    },
  ],
};

/* Competitive programming. The solved counts are filled in at runtime from our
   own /api/leetcode/stats endpoint (src/handler/leetcode/stats.rs) rather than
   calling the third-party LeetCode API straight from the browser — that used
   to get sabbir0087's IP rate-limited under real traffic. The backend caches
   the upstream response in Redis and only re-fetches once a day. Leave the
   fallbacks null rather than inventing figures: the section renders em dashes
   and a flat track until real numbers arrive. Add a href to a platform once
   you have the profile URL; without one it renders as plain text instead of a
   dead link. */
const competitive = {
  leetcodeUser: "sabbir0087",
  endpoint: "/api/leetcode/stats",
  solved: { easy: null, medium: null, hard: null },
  difficulties: [
    { key: "easy", label: "Easy", tone: "#22C55E" },
    { key: "medium", label: "Medium", tone: "#E0A32E" },
    { key: "hard", label: "Hard", tone: "#DE4520" },
  ],
  platforms: [
    { name: "LeetCode", handle: "sabbir0087", href: "https://leetcode.com/u/sabbir0087/", tone: "#FFA116" },
    { name: "Codeforces", handle: "", href: "", tone: "#1F8ACB" },
    { name: "AtCoder", handle: "", href: "", tone: "#3F7F5F" },
  ],
  topics: [
    "C++",
    "STL",
    "Dynamic Programming",
    "Graph Theory",
    "Segment Trees",
    "Binary Search",
    "Greedy",
    "Number Theory",
  ],
};

const process = [
  {
    num: "01",
    title: "Understand",
    body: "Understanding your needs, goals, and project scope through research and analysis before a single line is written.",
  },
  {
    num: "02",
    title: "Architect",
    body: "Creating the structure and data model that gives the product a strong, scalable foundation.",
  },
  {
    num: "03",
    title: "Build",
    body: "Designing clean, modern, and engaging interfaces on top of engineering that holds up under real load.",
  },
  {
    num: "04",
    title: "Refine",
    body: "Sharpening the result through feedback and testing to ensure the best possible user experience.",
  },
];

const journey = [
  {
    period: "2023 — Present",
    kind: "Full-time",
    role: "Fullstack Developer",
    org: "Freelance / Self-employed",
    body: "Building web apps, mobile apps and backend systems for clients across multiple industries. Rust, Flutter, custom JS.",
  },
  {
    period: "2022 — 2023",
    kind: "Contract",
    role: "UI/UX Designer",
    org: "Various Clients",
    body: "Designed interfaces for SaaS products and mobile apps in Figma and Adobe XD. Focused on design systems and component libraries.",
  },
  {
    period: "2021 — 2022",
    kind: "Part-time",
    role: "Technical Writer & Mentor",
    org: "Open Source Community",
    body: "Wrote developer documentation with MkDocs and mentored junior developers in competitive programming and system design.",
  },
  {
    period: "2020 — 2024",
    kind: "Degree",
    role: "B.Sc. in Computer Science",
    org: "University",
    body: "Focused on algorithms, data structures, and systems programming. Active in competitive programming clubs and hackathons.",
  },
];

const testimonials = [
  {
    quote:
      "Sabbir rebuilt our backend in Rust and cut our p99 latency by more than half. He explains trade-offs clearly and ships on the date he gives you.",
    name: "Product Lead",
    title: "SaaS Startup",
  },
  {
    quote:
      "The Flutter app he delivered felt native on both platforms from day one. Attention to animation detail is genuinely rare in a developer.",
    name: "Founder",
    title: "Fintech",
  },
  {
    quote:
      "He designed the system and then built it — no handoff gap, no lost intent. The design system he left us is still what we work from.",
    name: "Design Manager",
    title: "Agency",
  },
  {
    quote:
      "Excellent communication, fast delivery, and outstanding attention to detail. Highly recommended for anything performance-critical.",
    name: "CTO",
    title: "E-commerce",
  },
];

const faqs = [
  {
    q: "What kind of projects do you take on?",
    a: "Mostly performance-critical backends in Rust, cross-platform mobile apps in Flutter, and full product builds where design and engineering need to be handled by the same person. I also take on UI/UX-only engagements.",
  },
  {
    q: "What does a typical engagement look like?",
    a: "A short discovery call, then a written scope with milestones and a fixed timeline. You get a working build at every milestone rather than one delivery at the end, so direction can be corrected early and cheaply.",
  },
  {
    q: "Do you design as well as develop?",
    a: "Yes. I design in Figma and build the result myself, which removes the usual handoff gap where intent gets lost. For projects that already have a design team, I integrate with your existing system and tokens.",
  },
  {
    q: "How do you handle revisions?",
    a: "Every milestone includes a defined revision round. Because you see working builds throughout, most changes get caught early instead of piling up into an expensive rework at the end.",
  },
  {
    q: "Can you work with an existing codebase?",
    a: "Regularly. I'll start with a short audit of the current architecture and give you an honest read on what's worth keeping, what should be refactored, and what the sequencing should be.",
  },
  {
    q: "What's your availability?",
    a: "I'm currently taking on new projects. Timelines depend on scope — reach out with what you have in mind and I'll come back with a realistic start date.",
  },
];
