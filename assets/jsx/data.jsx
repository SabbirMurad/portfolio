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
  },
  {
    num: "002",
    title: "Mobile Apps",
    blurb:
      "Cross-platform iOS and Android apps with native performance. Smooth animations, offline-first architecture, one codebase.",
    tags: ["Flutter", "Dart", "Riverpod", "Hive", "Firebase"],
    tone: "#54C5F8",
  },
  {
    num: "003",
    title: "UI/UX Design",
    blurb:
      "End-to-end design, from wireframes to polished prototypes. Design systems and component libraries developers can actually build from.",
    tags: ["Figma", "Adobe XD", "Prototyping", "Design Systems"],
    tone: "#A855F7",
  },
  {
    num: "004",
    title: "Desktop Software",
    blurb:
      "Native desktop applications and CLI tooling in Rust and C++ — system utilities that are fast, small, and built to last.",
    tags: ["Rust", "C++", "Tauri", "CLI Tools", "Cross-platform"],
    tone: "#22C55E",
  },
];

const projects = [
  {
    name: "Hyper",
    kind: "Async Task Queue",
    year: "2025",
    blurb:
      "A distributed task queue in Rust on Tokio. Persistent RocksDB storage, priority scheduling, and a clean HTTP API — built to handle 100k+ jobs/sec.",
    tags: ["Rust", "Tokio", "RocksDB", "Actix-Web"],
    href: "https://github.com/sabbirmurad",
    accent: "#DE4520",
  },
  {
    name: "Bento",
    kind: "Custom Chrome Theme",
    year: "2026",
    blurb:
      "A Chrome new tab page you arrange yourself. Clock, bookmarks, shortcuts, search and Google links are pieces you move, restyle, reorder or switch off.",
    tags: ["JavaScript", "Manifest V3", "Chrome API", "Zero-dep"],
    href: "https://chromewebstore.google.com/detail/bento-new-tab/mgnhpoioecgjficdbkghpnplklmohhpl",
    accent: "#1ABC9C",
    // Optional: a real banner. Cards without one fall back to the accent gradient.
    image: "/assets/image/projects/bento.webp",
  },
  {
    name: "Pixel",
    kind: "JS Component Library",
    year: "2024",
    blurb:
      "A handcrafted vanilla JS component library with zero dependencies. 30+ accessible, animated components with a tiny runtime footprint.",
    tags: ["JavaScript", "CSS", "A11y", "Zero-dep"],
    href: "https://github.com/sabbirmurad",
    accent: "#A855F7",
  },
  {
    name: "Compile Time",
    kind: "Developer Education",
    year: "2024",
    blurb:
      "A YouTube channel teaching systems programming, Rust, and competitive programming — breaking down hard concepts into buildable projects.",
    tags: ["Teaching", "Rust", "C++", "Video"],
    href: "https://www.youtube.com/@itscompiletime",
    accent: "#22C55E",
  },
];

const docs = [
  {
    title: "Hyper API Reference",
    blurb:
      "Endpoint reference for the task queue HTTP API — authentication, job submission, priority scheduling, and webhook payloads, with runnable examples.",
    tags: ["Rust", "OpenAPI", "MkDocs"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Pixel Component Guide",
    blurb:
      "Usage docs for all 30+ components — props, accessibility notes, keyboard behaviour, and theming tokens, with a live example beside each entry.",
    tags: ["JavaScript", "A11y", "Design Tokens"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Finora Architecture Notes",
    blurb:
      "How the offline-first layer works: Hive schema design, conflict resolution on sync, and why the state model is split the way it is.",
    tags: ["Flutter", "Hive", "Architecture"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Rust for Systems Work",
    blurb:
      "A working guide to ownership, lifetimes, and async Tokio — written for engineers arriving from C++ who want the model, not a syntax tour.",
    tags: ["Rust", "Tokio", "Teaching"],
    href: "https://www.youtube.com/@itscompiletime",
  },
  {
    title: "Deployment Handbook",
    blurb:
      "The shipping checklist I run for every project — environment layout, migrations, rollback strategy, and what to have wired up before launch day.",
    tags: ["DevOps", "MySQL", "CI/CD"],
    href: "https://github.com/sabbirmurad",
  },
  {
    title: "Design System Primer",
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

/* Competitive programming. The solved counts are filled in at runtime from the
   LeetCode stats endpoint below — the same one the previous site used. Leave the
   fallbacks null rather than inventing figures: the section renders em dashes and
   a flat track until real numbers arrive. Add a href to a platform once you have
   the profile URL; without one it renders as plain text instead of a dead link. */
const competitive = {
  leetcodeUser: "sabbir0087",
  endpoint: "https://alfa-leetcode-api.onrender.com/sabbir0087/solved",
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
