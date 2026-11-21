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
  phone: "+880 1705 738128",
  location: "Dhaka, Bangladesh",
  hours: "Daily: 10 AM — 6 PM",
  year: "2026",
};

const socials = [
  { label: "GitHub", href: "https://github.com/sabbirmurad" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sabbir-hassan-aa302824a/" },
  { label: "YouTube", href: "https://www.youtube.com/@itscompiletime" },
  { label: "Fiverr", href: "https://www.fiverr.com/compile_time" },
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
  // Checkable: leetcode.com/u/sabbir0087 (the Competitive section shows the
  // live count). A floor, so it stays true as the number grows.
  { value: 100, suffix: "+", label: "LeetCode Problems Solved" },
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

/* Documentation is not listed here either, for the same reason — it comes
   from GET /api/documentation/feed, managed in the dashboard, see
   assets/jsx/doc_card.jsx. */

/* Channel defaults the YouTube section merges the live /api/youtube/feed
   channel over. There are no placeholder videos: the section only renders
   once the feed returns real ones (see the `when` checks in app.jsx), so it
   never shows titles that don't exist on the channel. */
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

/* Same roles, titles and dates as the public résumé (pages/resume_a.html) —
   a recruiter who opens both should read one story. Change them together. */
const journey = [
  {
    period: "May 2025 — Present",
    kind: "Freelance",
    role: "Fullstack Developer & Designer",
    org: "Freelance / Self-employed",
    body: "Client projects taken end to end — scoping the work, designing the interface, building both ends, then shipping and maintaining it. Rust services on Actix Web behind Flutter and vanilla web clients.",
  },
  {
    period: "2021 — Apr 2025",
    kind: "In-house",
    role: "Fullstack Developer & Project Manager",
    org: "Bitlaab",
    body: "Built and shipped client products end to end — backend, client applications and interface design — while managing delivery as project manager on most of them. 30+ features across Rust, Node.js, Flutter and vanilla web, on MongoDB and SQLite.",
  },
  {
    period: "In progress",
    kind: "Degree",
    role: "B.Sc. in Computer Science & Engineering",
    org: "Pundra University of Science and Technology, Bogura",
    body: "Studying alongside the work. Self-taught before it: building since 2019.",
  },
];

/* Real reviews from the Fiverr gig, quoted word for word and attributed the
   way Fiverr shows them (buyer username and country) — every one is public on
   the gig page, so a reader can check them. Only reviews that don't name the
   seller's Fiverr display name are used, since quotes are never edited. */
const testimonialsSource = {
  label: "Fiverr",
  href: "https://www.fiverr.com/compile_time/develop-flutter-ios-android-mobile-app-react-web-and-rust-backend-solutions",
};

const testimonials = [
  {
    quote:
      "Fantastic experience working with this freelancer! Their coding expertise is top-notch, delivering clean, high-quality results. They responded quickly to all inquiries and consistently went above and beyond to ensure everything exceeded expectations. Highly recommended!",
    name: "deborahjeu509",
    title: "Fiverr · United States",
  },
  {
    quote:
      "Wasn’t sure if the feature I wanted was even possible in a mobile app, but he made it happen, really experienced in his field, would recommend trusting him with a work no matter how complicated it is",
    name: "maximilian_gold",
    title: "Fiverr · Switzerland",
  },
  {
    quote:
      "He went above and beyond and exceeded my expectations. Added features that even I myself had not thought about and finished the work within the time frame.",
    name: "thomas_jak1",
    title: "Fiverr · Lithuania",
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
