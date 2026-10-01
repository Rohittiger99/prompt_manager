/**
 * OmniPrompt - Curated Default Prompt Library
 * 136 built-in prompts with {{variables}}, including the Client Work pack of profile blocks and workflows.
 */
const DEFAULT_PROMPTS = [
  {
    "id": "dev-code-review",
    "title": "Rigorous Code Review",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "review",
      "clean-code",
      "security",
      "best-practices"
    ],
    "shortcut": "review",
    "description": "Thorough review focusing on architecture, edge cases, security, and performance.",
    "template": "You are an elite principal software engineer. Perform a rigorous, multi-faceted code review on the following {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nAnalyze the code under these specific criteria:\n1. **Architecture & Design Patterns:** Is the structure clean, modular, and maintainable?\n2. **Edge Cases & Failure Modes:** What unhandled scenarios or nil/null pointer risks exist?\n3. **Performance & Complexity:** What are the Time/Space complexities (Big-O) and optimization bottlenecks?\n4. **Security Vulnerabilities:** Are there injection points, memory leaks, or unsafe operations?\n5. **Refactored Code:** Provide the production-ready refactored version with inline explanations."
  },
  {
    "id": "dev-bug-root-cause",
    "title": "Root Cause Bug Diagnostic",
    "category": "Coding",
    "subCategory": "Debugging & Diagnostics",
    "icon": "🐞",
    "outputFormat": "Diagnostic & Fix",
    "difficulty": "Standard",
    "tags": [
      "debug",
      "troubleshooting",
      "errors"
    ],
    "shortcut": "debug",
    "description": "Deep diagnostic analysis of an error log, stack trace, and codebase.",
    "template": "I am experiencing a bug in {{environment_or_framework}}. \n\n**Error / Stack Trace:**\n```\n{{error_message}}\n```\n\n**Relevant Code:**\n```{{language}}\n{{code}}\n```\n\nPlease provide:\n1. **Root Cause Analysis:** Exactly why and where this failure happens.\n2. **Immediate Fix:** Minimal diff to resolve the problem immediately.\n3. **Defensive Guardrails:** Code pattern or unit test to prevent regression permanently."
  },
  {
    "id": "dev-unit-test-generator",
    "title": "Comprehensive Unit Test Suite",
    "category": "Coding",
    "subCategory": "Testing & QA",
    "icon": "🧪",
    "outputFormat": "Test Suite",
    "difficulty": "Standard",
    "tags": [
      "testing",
      "unit-test",
      "jest",
      "pytest",
      "tdd"
    ],
    "shortcut": "tests",
    "description": "Generate full coverage unit tests with happy paths, edge cases, and mocks.",
    "template": "Generate a comprehensive, production-ready unit test suite for the following {{language}} code using {{test_framework}}:\n\n```{{language}}\n{{code}}\n```\n\nInclude:\n- **Happy Path Cases:** Standard input validation and expected outputs.\n- **Boundary & Edge Cases:** Nulls, empty collections, max/min values, and invalid data types.\n- **Error & Exception Paths:** Assert that specific exceptions/errors are properly thrown.\n- **Mocking:** Mock any external network, database, or filesystem dependencies."
  },
  {
    "id": "dev-system-architecture",
    "title": "System Architecture & High-Level Design",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "architecture",
      "hld",
      "scalability",
      "distributed-systems"
    ],
    "shortcut": "hld",
    "description": "Architect a scalable, distributed system from scratch.",
    "template": "Design a high-level system architecture for {{system_name_or_requirement}} capable of handling {{scale_requirements_e_g_100k_rps}}.\n\nCover the following components in detail:\n1. **API Design & Data Flow:** Key endpoints, protocols (REST/gRPC/WebSocket), and payload structures.\n2. **Database & Storage Strategy:** Choice of SQL vs NoSQL, schema layout, partitioning/sharding, and indexing.\n3. **Caching & Concurrency:** Multi-tier caching (Redis/CDN), cache invalidation strategy, rate limiting.\n4. **Resiliency & Fault Tolerance:** Circuit breakers, queues (Kafka/RabbitMQ), retry mechanisms, disaster recovery.\n5. **Trade-off Analysis:** Key architectural trade-offs made and justification."
  },
  {
    "id": "dev-refactor-clean-code",
    "title": "Legacy Code Modernizer & Refactor",
    "category": "Coding",
    "subCategory": "Refactoring & Clean Code",
    "icon": "✨",
    "outputFormat": "Refactored Code",
    "difficulty": "Standard",
    "tags": [
      "refactor",
      "modernize",
      "clean-code"
    ],
    "shortcut": "refactor",
    "description": "Transform messy, legacy spaghetti code into idiomatic, readable code.",
    "template": "Refactor the following {{language}} code to adhere strictly to SOLID principles, DRY, and modern idiomatic best practices:\n\n```{{language}}\n{{code}}\n```\n\nGuidelines:\n- Simplify nested conditionals with guard clauses.\n- Improve naming conventions for variables, methods, and types.\n- Decouple tight dependencies.\n- Provide the updated code followed by a bulleted summary of specific improvements."
  },
  {
    "id": "dev-regex-generator",
    "title": "Precision Regex Architect & Explainer",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "regex",
      "parsing",
      "validation"
    ],
    "shortcut": "regex",
    "description": "Create bulletproof regular expressions with detailed breakdown and test cases.",
    "template": "Create a robust Regular Expression for the following specification in flavor {{regex_flavor_e_g_javascript_python}}:\n\n**Goal:** {{pattern_description}}\n\nRequirements:\n1. The raw Regex pattern with appropriate flags.\n2. Comprehensive step-by-step breakdown of each token and group.\n3. 5 positive test cases that MUST match.\n4. 5 negative test cases that MUST NOT match.\n5. Performance notes (reDoS vulnerability check)."
  },
  {
    "id": "dev-sql-query-optimizer",
    "title": "SQL Query Optimizer & Indexing Advisor",
    "category": "Coding",
    "subCategory": "Database & SQL",
    "icon": "🗄️",
    "outputFormat": "Optimized SQL/Schema",
    "difficulty": "Standard",
    "tags": [
      "sql",
      "database",
      "postgres",
      "mysql",
      "performance"
    ],
    "shortcut": "sqlopt",
    "description": "Optimize slow SQL queries, identify bottlenecks, and recommend indexes.",
    "template": "You are a database performance tuning specialist. Optimize the following {{database_engine}} query:\n\n```sql\n{{sql_query}}\n```\n\n**Context & Table Schemas (if known):**\n{{schema_details}}\n\nDeliver:\n1. **Bottleneck Analysis:** Explain why the query is inefficient (full table scans, subquery overhead, missing indexes).\n2. **Optimized SQL Query:** The rewritten, efficient query.\n3. **Recommended Indexes:** Exact `CREATE INDEX` statements with index type justifications.\n4. **Execution Plan Breakdown (EXPLAIN):** Expected plan improvement."
  },
  {
    "id": "dev-api-doc-generator",
    "title": "OpenAPI / REST API Documentation Generator",
    "category": "Coding",
    "subCategory": "DevOps & Security",
    "icon": "🛡️",
    "outputFormat": "Security Audit / Config",
    "difficulty": "Deep Analysis",
    "tags": [
      "api",
      "docs",
      "openapi",
      "swagger"
    ],
    "shortcut": "apidoc",
    "description": "Generate structured OpenAPI 3.0 specification or Markdown API docs.",
    "template": "Generate detailed API documentation for the following endpoint or implementation in {{language_or_framework}}:\n\n```\n{{code_or_endpoint_info}}\n```\n\nFormat as clean Markdown (with OpenAPI 3.0 schema snippet):\n- **Method & Path:** e.g., `POST /api/v1/...`\n- **Authentication & Headers:** Required auth tokens and custom headers.\n- **Request Parameters & Body:** Field names, data types, required/optional, descriptions, and example JSON payload.\n- **Responses:** 200/201 Success, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Error with sample JSON.\n- **cURL Example:** Ready-to-run cURL command."
  },
  {
    "id": "dev-git-commit-and-pr",
    "title": "Conventional Commit & Pull Request Generator",
    "category": "Coding",
    "subCategory": "Algorithms & Fullstack",
    "icon": "💻",
    "outputFormat": "Production Code",
    "difficulty": "Standard",
    "tags": [
      "git",
      "github",
      "pr",
      "commit"
    ],
    "shortcut": "pr",
    "description": "Turn code changes or diffs into a professional PR title, description, and commits.",
    "template": "Based on the following code diff / summary of changes:\n\n```diff\n{{git_diff_or_summary}}\n```\n\nGenerate:\n1. **Conventional Commit Message:** e.g. `feat(auth): add OAuth2 refresh token rotation`\n2. **PR Title:** Clear and concise under 70 characters.\n3. **PR Description:**\n   - **What changed & Why**\n   - **Key Technical Details**\n   - **Testing Checklist** (unit tests, manual tests)\n   - **Breaking Changes** (if any)"
  },
  {
    "id": "dev-dockerfile-generator",
    "title": "Production Multi-Stage Dockerfile & Compose",
    "category": "Coding",
    "subCategory": "DevOps & Security",
    "icon": "🛡️",
    "outputFormat": "Security Audit / Config",
    "difficulty": "Deep Analysis",
    "tags": [
      "docker",
      "devops",
      "container",
      "security"
    ],
    "shortcut": "docker",
    "description": "Create lightweight, secure, multi-stage Dockerfiles and docker-compose configurations.",
    "template": "Create an optimized, production-ready multi-stage Dockerfile and docker-compose.yml for a {{tech_stack}} application.\n\nRequirements:\n- Multi-stage build to keep the final image size minimal (Alpine / Distroless).\n- Non-root user execution for security.\n- Layer caching optimization (dependencies copied before source code).\n- Healthcheck instruction.\n- `.dockerignore` file content."
  },
  {
    "id": "dev-algorithm-explainer",
    "title": "Algorithm Deep Dive & Visual Trace",
    "category": "Coding",
    "subCategory": "Algorithms & Fullstack",
    "icon": "💻",
    "outputFormat": "Production Code",
    "difficulty": "Standard",
    "tags": [
      "dsa",
      "algorithms",
      "leetcode",
      "interview"
    ],
    "shortcut": "algo",
    "description": "Step-by-step trace and breakdown of complex algorithms and data structures.",
    "template": "Explain the {{algorithm_or_problem_name}} algorithm in crystal-clear depth.\n\n1. **Intuition & Core Concept:** Explain the fundamental idea using a real-world analogy.\n2. **Step-by-Step Walkthrough:** Step through a concrete example with a visual text diagram or trace table.\n3. **Optimal Implementation:** Provide clean, well-commented code in {{language}}.\n4. **Complexity Analysis:** Exact Time & Space complexity with proof."
  },
  {
    "id": "dev-security-audit",
    "title": "OWASP Security & Vulnerability Audit",
    "category": "Coding",
    "subCategory": "Debugging & Diagnostics",
    "icon": "🐞",
    "outputFormat": "Diagnostic & Fix",
    "difficulty": "Standard",
    "tags": [
      "security",
      "owasp",
      "vulnerability",
      "audit"
    ],
    "shortcut": "sec",
    "description": "Audit code for OWASP Top 10 vulnerabilities, injection, CSRF, XSS, and auth flaws.",
    "template": "Perform an in-depth security audit on this code snippet:\n\n```{{language}}\n{{code}}\n```\n\nCheck systematically for:\n- Injection attacks (SQLi, Command Injection, NoSQLi).\n- Broken Authentication / Insecure Session Management.\n- Cross-Site Scripting (XSS) and CSRF risks.\n- Insecure Direct Object References (IDOR).\n- Sensitive Data Exposure (hardcoded secrets, unencrypted transmission).\n\nProvide remediation steps with secure code replacements."
  },
  {
    "id": "dev-typescript-types",
    "title": "Advanced TypeScript Type Definition Architect",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "typescript",
      "types",
      "generics"
    ],
    "shortcut": "tstypes",
    "description": "Generate strict, flexible TypeScript types, generics, and utility types from data.",
    "template": "Given the following JSON data or functional requirement:\n\n```json\n{{json_or_requirement}}\n```\n\nGenerate type-safe, elegant TypeScript interfaces and types:\n- Use strict typing (no `any`, use `unknown` where appropriate).\n- Add discriminated unions, generics, and utility types (`Pick`, `Omit`, `Record`) if beneficial.\n- Include JSDoc comments explaining key fields."
  },
  {
    "id": "dev-tailwind-component",
    "title": "Tailwind CSS & React Component Builder",
    "category": "Coding",
    "subCategory": "Algorithms & Fullstack",
    "icon": "💻",
    "outputFormat": "Production Code",
    "difficulty": "Standard",
    "tags": [
      "tailwind",
      "react",
      "frontend",
      "ui"
    ],
    "shortcut": "twcomp",
    "description": "Build accessible, responsive UI components styled with Tailwind CSS.",
    "template": "Build a modern, fully accessible, and responsive {{component_name}} component in React + Tailwind CSS.\n\n**Design Specs & Functionality:**\n{{specifications}}\n\nRequirements:\n- Clean JSX with accessible ARIA attributes.\n- Smooth hover, focus-visible, and active state transitions.\n- Fully responsive across mobile, tablet, and desktop breakpoints.\n- Clean component props interface."
  },
  {
    "id": "dev-ci-cd-pipeline",
    "title": "GitHub Actions CI/CD Workflow Architect",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "ci-cd",
      "github-actions",
      "devops",
      "automation"
    ],
    "shortcut": "cicd",
    "description": "Write automated GitHub Actions workflows for linting, testing, and deployment.",
    "template": "Write a robust GitHub Actions workflow (`.github/workflows/deploy.yml`) for a {{application_type}} application.\n\nSteps to include:\n1. Triggers on push to `main` and Pull Requests.\n2. Caching dependencies (npm/pip/cargo).\n3. Linting, type-checking, and running unit tests in parallel.\n4. Building and deploying to {{target_platform_e_g_aws_vercel_docker_hub}} using GitHub Secrets."
  },
  {
    "id": "dev-graphql-schema",
    "title": "GraphQL Schema & Resolver Generator",
    "category": "Coding",
    "subCategory": "Database & SQL",
    "icon": "🗄️",
    "outputFormat": "Optimized SQL/Schema",
    "difficulty": "Standard",
    "tags": [
      "graphql",
      "schema",
      "backend",
      "api"
    ],
    "shortcut": "gql",
    "description": "Design clean GraphQL SDL schemas, queries, mutations, and resolver logic.",
    "template": "Design a clean GraphQL schema (SDL) and corresponding resolver implementations in {{language_or_framework}} for {{domain_entity}}.\n\nInclude:\n- Type definitions with field descriptions and non-null constraints.\n- Queries with pagination (cursor-based or offset) and filtering.\n- Mutations for create, update, delete with input types and error payload unions.\n- Performance notes regarding the N+1 problem and DataLoader usage."
  },
  {
    "id": "dev-bash-script",
    "title": "Robust Bash / Shell Automation Script",
    "category": "Coding",
    "subCategory": "Debugging & Diagnostics",
    "icon": "🐞",
    "outputFormat": "Diagnostic & Fix",
    "difficulty": "Standard",
    "tags": [
      "bash",
      "shell",
      "linux",
      "automation"
    ],
    "shortcut": "bash",
    "description": "Create resilient shell scripts with strict error handling, logs, and arguments.",
    "template": "Write a production-grade Bash script to automate the following task:\n\n**Task Description:** {{automation_task}}\n\nRequirements:\n- Use `set -euo pipefail` for strict error handling.\n- Include informative color-coded log helpers (`[INFO]`, `[WARN]`, `[ERROR]`).\n- Proper CLI argument parsing with `getopts` and a `--help` flag.\n- Safe cleanup using `trap` for temporary files."
  },
  {
    "id": "dev-cron-expression",
    "title": "Cron Schedule Builder & Human Explainer",
    "category": "Coding",
    "subCategory": "Algorithms & Fullstack",
    "icon": "💻",
    "outputFormat": "Production Code",
    "difficulty": "Standard",
    "tags": [
      "cron",
      "schedule",
      "automation"
    ],
    "shortcut": "cron",
    "description": "Generate and explain complex cron expressions with next execution timestamps.",
    "template": "Create a Cron expression for the following scheduling requirement:\n\n**Schedule Requirement:** {{desired_schedule}}\n**Timezone:** {{timezone_or_utc}}\n\nProvide:\n1. The 5-field (or 6-field) Cron expression.\n2. Plain-English translation of each field.\n3. List of the next 5 exact timestamps when this cron will trigger."
  },
  {
    "id": "dev-state-management",
    "title": "Frontend State Machine / Store Architect",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "state",
      "redux",
      "zustand",
      "xstate",
      "react"
    ],
    "shortcut": "state",
    "description": "Design clean frontend state management with Zustand, Redux Toolkit, or XState.",
    "template": "Design a robust state management store in {{state_library_e_g_zustand_redux_pinia}} for the following feature:\n\n**Feature Specs:** {{feature_description}}\n\nInclude:\n- State interface and initial state.\n- Synchronous actions and mutations.\n- Asynchronous actions (API calls, loading states, error handling).\n- Selectors / computed getters for optimized re-renders."
  },
  {
    "id": "dev-performance-profiling",
    "title": "Frontend Web Vitals & Performance Audit",
    "category": "Coding",
    "subCategory": "Debugging & Diagnostics",
    "icon": "🐞",
    "outputFormat": "Diagnostic & Fix",
    "difficulty": "Standard",
    "tags": [
      "performance",
      "web-vitals",
      "lcp",
      "cls",
      "optimization"
    ],
    "shortcut": "perf",
    "description": "Techniques to optimize LCP, FID, CLS, bundle size, and memory usage.",
    "template": "My web application is suffering from performance degradation on {{page_or_feature_url}}.\n\n**Observed Issues / Metrics:**\n{{performance_issues}}\n\nProvide an actionable performance optimization playbook:\n1. **Critical Rendering Path & LCP:** Lazy loading, font optimization, critical CSS.\n2. **JavaScript Execution & Bundle Splitting:** Tree shaking, dynamic imports, web workers.\n3. **Cumulative Layout Shift (CLS):** Aspect ratios, dynamic ad/image sizing.\n4. **Memory Leaks & DOM thrashing:** Event listener cleanup, virtualization for large lists."
  },
  {
    "id": "dev-microservice-decomposition",
    "title": "Monolith to Microservices Decomposition",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "microservices",
      "monolith",
      "architecture",
      "domain-driven-design"
    ],
    "shortcut": "monolith",
    "description": "Systematic domain-driven decomposition plan from monolith to microservices.",
    "template": "Formulate a step-by-step architectural decomposition plan to extract {{service_or_domain_to_extract}} from our monolithic {{monolith_stack}} application.\n\nCover:\n- Bounded Context definition (Domain-Driven Design).\n- Database extraction & handling cross-domain joins (eventual consistency, Saga pattern).\n- Strangler Fig migration strategy to prevent downtime.\n- Inter-service communication (synchronous gRPC vs asynchronous events)."
  },
  {
    "id": "dev-env-config",
    "title": "Environment Configuration & Secrets Blueprint",
    "category": "Coding",
    "subCategory": "Database & SQL",
    "icon": "🗄️",
    "outputFormat": "Optimized SQL/Schema",
    "difficulty": "Standard",
    "tags": [
      "env",
      "config",
      "security",
      "12-factor"
    ],
    "shortcut": "env",
    "description": "Create structured .env.example, validation schema (Zod/Joi), and config loader.",
    "template": "Create an environment configuration management module for a {{tech_stack}} project.\n\n**Required Configuration Variables:**\n{{list_of_config_variables}}\n\nProvide:\n1. A clean, annotated `.env.example` file.\n2. Runtime schema validation using {{validation_library_e_g_zod_joi_pydantic}} that crashes the app immediately on startup if any required environment variable is missing or malformed."
  },
  {
    "id": "dev-grpc-proto",
    "title": "Protocol Buffer (Protobuf) & gRPC Service Designer",
    "category": "Coding",
    "subCategory": "Refactoring & Clean Code",
    "icon": "✨",
    "outputFormat": "Refactored Code",
    "difficulty": "Standard",
    "tags": [
      "grpc",
      "protobuf",
      "rpc",
      "backend"
    ],
    "shortcut": "proto",
    "description": "Write clean .proto files with services, messages, and streaming endpoints.",
    "template": "Design a Protocol Buffers (`.proto` v3) schema for a high-throughput {{service_name}} gRPC service.\n\nInclude:\n- Enums, nested messages, and timestamp types.\n- Unary and streaming RPC definitions.\n- Custom field annotations/options for validation."
  },
  {
    "id": "dev-error-handling-strategy",
    "title": "Global Error Handling & Logging Middleware",
    "category": "Coding",
    "subCategory": "Architecture & Systems",
    "icon": "🏗️",
    "outputFormat": "System Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "errors",
      "logging",
      "middleware",
      "clean-code"
    ],
    "shortcut": "errors",
    "description": "Implement custom error hierarchies, global middleware, and structured logging.",
    "template": "Build a clean, production-grade custom error handling and structured logging architecture in {{language_or_framework}}.\n\nInclude:\n- Base `AppError` / `CustomException` class with status codes and machine-readable error codes.\n- Specific domain error subclasses (NotFoundError, UnauthorizedError, ValidationError).\n- Centralized exception middleware that catches unhandled errors, logs structured JSON with correlation IDs, and sanitizes public error responses."
  },
  {
    "id": "dev-readme-generator",
    "title": "World-Class GitHub Repository README.md",
    "category": "Coding",
    "subCategory": "Algorithms & Fullstack",
    "icon": "💻",
    "outputFormat": "Production Code",
    "difficulty": "Standard",
    "tags": [
      "readme",
      "github",
      "documentation",
      "open-source"
    ],
    "shortcut": "readme",
    "description": "Generate a polished, professional open-source README with badges and instructions.",
    "template": "Generate a top-tier, GitHub-ready `README.md` file for a project named **{{project_name}}**.\n\n**Project Summary & Tech Stack:**\n{{project_summary}}\n\nInclude:\n- Engaging project tagline and visual badge placeholders.\n- Key Features list with concise bullet points.\n- Architecture / How it Works section.\n- Quickstart & Installation guide (prerequisites, step-by-step commands).\n- Environment Variables table.\n- Contributing, Roadmap, and License sections."
  },
  {
    "id": "write-executive-summary",
    "title": "Executive Summary & Key Takeaways",
    "category": "Writing",
    "subCategory": "Articles & Long-Form",
    "icon": "📰",
    "outputFormat": "Comprehensive Draft",
    "difficulty": "Deep Analysis",
    "tags": [
      "summary",
      "executive",
      "business",
      "brief"
    ],
    "shortcut": "execsum",
    "description": "Distill dense reports, articles, or transcripts into a high-impact executive brief.",
    "template": "Synthesize the following text into a high-level Executive Summary suitable for C-suite leadership:\n\n```\n{{text_to_summarize}}\n```\n\nStructure your response with:\n1. **Core Thesis / Executive Headline:** 1 sentence bottom-line takeaway.\n2. **Key Findings & Strategic Drivers:** 3 to 5 high-impact bullet points.\n3. **Risks & Operational Bottlenecks:** What needs attention or mitigation.\n4. **Recommended Action Items:** Next concrete steps with estimated impact."
  },
  {
    "id": "write-cold-email-sales",
    "title": "High-Converting Cold Outreach Email",
    "category": "Writing",
    "subCategory": "Business & Executive Email",
    "icon": "📧",
    "outputFormat": "Email Draft",
    "difficulty": "Quick",
    "tags": [
      "email",
      "sales",
      "outreach",
      "b2b"
    ],
    "shortcut": "coldemail",
    "description": "Craft personalized, punchy B2B cold emails using the PAS or AIDA framework.",
    "template": "Write a compelling, ultra-personalized B2B cold outreach email to {{target_prospect_role_and_industry}}.\n\n**Our Value Proposition / Product:** {{our_offer_or_solution}}\n**Prospect Pain Point:** {{prospect_pain_point}}\n\nConstraints:\n- Maximum 120 words.\n- Zero fluff, buzzwords, or generic clichés.\n- High-curiosity subject line (under 6 words).\n- Frictionless, low-commitment Call to Action (e.g., \"Open to seeing a 2-min video?\")."
  },
  {
    "id": "write-tone-transformer",
    "title": "Voice & Tone Transformer",
    "category": "Writing",
    "subCategory": "Editing & Polishing",
    "icon": "✂️",
    "outputFormat": "Polished Text",
    "difficulty": "Quick",
    "tags": [
      "rewrite",
      "tone",
      "style",
      "polish"
    ],
    "shortcut": "tone",
    "description": "Rewrite any text into a specific tone: Academic, Persuasive, Casual, or Crisp.",
    "template": "Rewrite the following text into a **{{desired_tone_e_g_crisp_assertive_empathetic_humorous}}** tone while preserving 100% of the core message and facts:\n\n```\n{{original_text}}\n```\n\nTarget Audience: {{target_audience}}\nDeliver 2 variations:\n- **Option A (Subtle & Polished):** Natural refinement.\n- **Option B (Bold & Impactful):** High-energy rewording."
  },
  {
    "id": "write-blog-post-outline",
    "title": "Comprehensive Long-Form Article Outline",
    "category": "Writing",
    "subCategory": "Articles & Long-Form",
    "icon": "📰",
    "outputFormat": "Comprehensive Draft",
    "difficulty": "Deep Analysis",
    "tags": [
      "blog",
      "article",
      "content",
      "outline"
    ],
    "shortcut": "article",
    "description": "Generate structured, SEO-friendly outlines with hooks, subheadings, and research prompts.",
    "template": "Create an exhaustive, high-ranking blog post outline for the topic:\n\n**Topic:** {{article_topic}}\n**Target Audience:** {{target_audience}}\n**Primary Keyword:** {{target_keyword}}\n\nProvide:\n1. **3 Compelling Title Options** (optimized for click-through rate and search intent).\n2. **Hook & Introduction Strategy** (the \"problem agitate\" opening).\n3. **H2 & H3 Section Breakdown** with 3 bulleted talking points per section.\n4. **Counter-Intuitive Insight or Case Study Idea** to build authority.\n5. **Conclusion & Call to Action (CTA).**"
  },
  {
    "id": "write-linkedin-thought-leadership",
    "title": "Viral LinkedIn Thought Leadership Post",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "linkedin",
      "social",
      "personal-brand",
      "viral"
    ],
    "shortcut": "linkedin",
    "description": "Format high-engagement LinkedIn posts with scroll-stopping hooks and clean spacing.",
    "template": "Write an engaging, high-authority LinkedIn post on the following insight:\n\n**Core Insight / Story:** {{lesson_or_insight}}\n**Target Audience:** {{professional_audience}}\n\nFormatting rules:\n- **Hook (Lines 1-2):** Bold, contrarian, or curiosity-inducing opening that forces the reader to click \"...see more\".\n- **Body:** Short, punchy 1-2 sentence paragraphs with clean line breaks.\n- **Key Takeaways:** 3 bullet points summarizing the practical framework.\n- **Closing Question:** Provocative question to drive meaningful comments."
  },
  {
    "id": "write-proofread-critique",
    "title": "Meticulous Proofreader & Style Editor",
    "category": "Writing",
    "subCategory": "Editing & Polishing",
    "icon": "✂️",
    "outputFormat": "Polished Text",
    "difficulty": "Quick",
    "tags": [
      "proofread",
      "grammar",
      "editing",
      "clarity"
    ],
    "shortcut": "proofread",
    "description": "Fix grammar, eliminate passive voice, tighten syntax, and provide an edit diff.",
    "template": "Act as a senior copy editor for the Chicago Manual of Style and AP Stylebook. Edit the following text:\n\n```\n{{draft_text}}\n```\n\nProvide:\n1. **Clean Edited Version:** Polished for syntax, flow, active voice, and precision.\n2. **Changelog of Major Edits:** Specific explanations of why key sentences were restructured.\n3. **Clarity Score & Word Count Reduction:** Before vs after comparison."
  },
  {
    "id": "write-press-release",
    "title": "Official Company Press Release (AP Format)",
    "category": "Writing",
    "subCategory": "PR, Speech & Communications",
    "icon": "📢",
    "outputFormat": "Press / Speech Draft",
    "difficulty": "Standard",
    "tags": [
      "pr",
      "press-release",
      "announcement",
      "media"
    ],
    "shortcut": "prnews",
    "description": "Draft standard AP-style press releases for product launches, funding, or partnerships.",
    "template": "Write a standard AP-format press release announcing the following:\n\n**Company Name:** {{company_name}}\n**Announcement Details:** {{announcement_details}}\n**Executive Quote Intent:** {{quote_theme_by_founder_or_ceo}}\n\nInclude:\n- **FOR IMMEDIATE RELEASE** header with Dateline.\n- **Compelling Headline & Subheadline**.\n- **Body Paragraphs** (The Lead, The Problem, The Solution, The Market Impact).\n- **Executive Quote Placeholder**.\n- **About / Boilerplate & Media Contact Information**."
  },
  {
    "id": "write-meeting-notes-action-items",
    "title": "Meeting Transcript to Actionable Summary",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "meeting",
      "transcripts",
      "action-items",
      "notes"
    ],
    "shortcut": "meeting",
    "description": "Extract decisions, owner-assigned action items, and discussion points from transcripts.",
    "template": "Extract clean, organized meeting minutes from this raw conversation / transcript:\n\n```\n{{raw_meeting_notes_or_transcript}}\n```\n\nFormat as:\n1. **Meeting Objective:** 1 sentence goal.\n2. **Key Decisions Made:** Bulleted list of final agreements.\n3. **Action Items Table:** Columns for `Action Item`, `Owner`, and `Deadline / Priority`.\n4. **Open Questions / Unresolved Blockers:** Items tabled for the next session."
  },
  {
    "id": "write-speech-script",
    "title": "Keynote Speech & Presentation Script",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "speech",
      "presentation",
      "public-speaking",
      "keynote"
    ],
    "shortcut": "speech",
    "description": "Write captivating speech scripts with pacing cues, stage directions, and vocal emphasis.",
    "template": "Write a {{speech_duration_in_minutes}}-minute keynote speech on:\n\n**Topic:** {{speech_topic}}\n**Occasion & Audience:** {{occasion_and_audience}}\n\nGuidelines:\n- Include stage directions in brackets (e.g. `[Pause for emphasis]`, `[Show Slide 2]`).\n- Open with a powerful narrative hook or story.\n- Use rhetorical devices (rule of three, parallel structure, cadence).\n- End with an unforgettable, inspiring concluding call to action."
  },
  {
    "id": "write-faq-generator",
    "title": "Customer FAQ & Objection Buster",
    "category": "Writing",
    "subCategory": "PR, Speech & Communications",
    "icon": "📢",
    "outputFormat": "Press / Speech Draft",
    "difficulty": "Standard",
    "tags": [
      "faq",
      "customer-support",
      "objections",
      "documentation"
    ],
    "shortcut": "faq",
    "description": "Create comprehensive customer FAQs addressing top questions and objections.",
    "template": "Generate a comprehensive FAQ list for {{product_or_service_description}}.\n\nCategorize into:\n1. **General & Getting Started**\n2. **Pricing, Billing & Guarantees**\n3. **Technical & Compatibility**\n4. **Objection Handling:** Address reasons why someone might hesitate to buy."
  },
  {
    "id": "write-newsletter-edition",
    "title": "Curated Weekly Newsletter Edition",
    "category": "Writing",
    "subCategory": "Articles & Long-Form",
    "icon": "📰",
    "outputFormat": "Comprehensive Draft",
    "difficulty": "Deep Analysis",
    "tags": [
      "newsletter",
      "email-marketing",
      "substack",
      "curation"
    ],
    "shortcut": "newsletter",
    "description": "Draft engaging newsletter issues with deep dives, links, and sponsor blurbs.",
    "template": "Draft an engaging newsletter edition for **{{newsletter_name}}** focusing on **{{main_theme_or_trend}}**.\n\nTarget Audience: {{audience_persona}}\n\nInclude:\n- **Subject Line:** 3 high-open-rate options.\n- **Intro Note:** Personal, timely welcome hook.\n- **The Big Deep Dive:** 400-word analysis of the central trend with a breakdown of practical takeaways.\n- **Quick Links / Tools of the Week:** 3 curated items with 1-sentence summaries.\n- **Thought of the Week / Question for Readers.**"
  },
  {
    "id": "write-case-study",
    "title": "B2B Customer Success Story / Case Study",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "case-study",
      "b2b",
      "social-proof",
      "marketing"
    ],
    "shortcut": "casestudy",
    "description": "Write structured Challenge -> Solution -> Results customer case studies.",
    "template": "Write a persuasive B2B customer success case study based on this data:\n\n**Customer:** {{customer_company_and_industry}}\n**The Challenge:** {{pain_point_before_our_product}}\n**The Solution:** {{how_they_used_our_product}}\n**The Measurable Results:** {{quantifiable_metrics_e_g_300_percent_roi}}\n\nFormat with:\n- Catchy title highlighting the metric (e.g. \"How [Company] Achieved 4x Growth...\").\n- Executive Snapshot table.\n- Section 1: The Bottleneck.\n- Section 2: Implementing the Solution.\n- Section 3: The Breakthrough Results (with stat callouts)."
  },
  {
    "id": "write-twitter-thread",
    "title": "Viral X / Twitter Educational Thread",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "twitter",
      "x",
      "thread",
      "social"
    ],
    "shortcut": "thread",
    "description": "Format multi-tweet educational threads with hook tweets and bookmark CTAs.",
    "template": "Create an educational, viral X / Twitter thread about:\n\n**Topic / Framework:** {{topic_or_framework}}\n\nRequirements:\n- **Tweet 1 (The Hook):** Irresistible curiosity, bold claim, or curated list promise.\n- **Tweets 2-7 (The Value):** 1 actionable tip/framework per tweet with bullet points and clean structure.\n- **Tweet 8 (Summary):** Recapping the core system.\n- **Tweet 9 (The CTA):** Encouraging retweets, bookmarks, and follows."
  },
  {
    "id": "write-cover-letter",
    "title": "Bespoke High-Impact Cover Letter",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "career",
      "job",
      "cover-letter",
      "interview"
    ],
    "shortcut": "coverletter",
    "description": "Write tailored, achievement-focused cover letters that align with job descriptions.",
    "template": "Write a tailored, confident, and achievement-driven cover letter for the following role:\n\n**Job Title & Company:** {{target_role_and_company}}\n**Key Job Requirements:** {{job_description_snippet}}\n**My Core Background & Wins:** {{my_relevant_experience_and_metrics}}\n\nGuidelines:\n- Keep it under 250 words.\n- Avoid generic cliches (\"I am writing to express my enthusiasm...\").\n- Match specific past quantifiable achievements directly to their biggest problems."
  },
  {
    "id": "write-podcast-interview-prep",
    "title": "Podcast / Interview Host Question Prep",
    "category": "Writing",
    "subCategory": "PR, Speech & Communications",
    "icon": "📢",
    "outputFormat": "Press / Speech Draft",
    "difficulty": "Standard",
    "tags": [
      "podcast",
      "interview",
      "questions",
      "media"
    ],
    "shortcut": "podcast",
    "description": "Generate deep, non-obvious interview questions for expert guests.",
    "template": "I am interviewing **{{guest_name_and_title}}** on my podcast about **{{interview_topic}}**.\n\nGenerate 10 insightful, non-generic interview questions:\n- Avoid questions they have answered 100 times on other shows.\n- Include questions exploring specific past failures, counter-intuitive beliefs, and tactical frameworks.\n- Include 2 rapid-fire closing questions."
  },
  {
    "id": "write-video-script-youtube",
    "title": "Engaging YouTube Video Script with Visual Cues",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "youtube",
      "video",
      "script",
      "content-creator"
    ],
    "shortcut": "youtube",
    "description": "Write YouTube scripts with hook retention, visual B-roll cues, and timestamps.",
    "template": "Write a high-retention YouTube video script on:\n\n**Video Topic:** {{video_topic}}\n**Target Audience:** {{target_viewer}}\n**Video Length Goal:** {{target_minutes_e_g_8_minutes}}\n\nProvide:\n- **0:00 - 0:30 (The Hook):** Visual and verbal hook to prevent drop-off in the first 30 seconds.\n- **0:30 - 1:00 (The Promise):** Why watching until the end matters.\n- **Body Content with [B-Roll / On-Screen Graphic Cues]:** 3 core pillars.\n- **Call to Action & Outro.**"
  },
  {
    "id": "write-book-summary",
    "title": "Comprehensive Book Synthesis & Action Framework",
    "category": "Writing",
    "subCategory": "PR, Speech & Communications",
    "icon": "📢",
    "outputFormat": "Press / Speech Draft",
    "difficulty": "Standard",
    "tags": [
      "books",
      "learning",
      "synthesis",
      "summary"
    ],
    "shortcut": "booksum",
    "description": "Synthesize non-fiction books into actionable mental models and daily habits.",
    "template": "Provide an in-depth summary and synthesis of the book **\"{{book_title}}\" by {{author_name}}**.\n\nInclude:\n1. **The Core Premise in 3 Sentences.**\n2. **Top 5 Mental Models / Concepts Explained.**\n3. **Memorable Quotes & Case Studies.**\n4. **How to Apply This in Daily Life (5 Actionable Rules).**"
  },
  {
    "id": "write-simplify-jargon",
    "title": "De-Jargonizer & Layman Explainer (ELI5)",
    "category": "Writing",
    "subCategory": "Editing & Polishing",
    "icon": "✂️",
    "outputFormat": "Polished Text",
    "difficulty": "Quick",
    "tags": [
      "simplify",
      "eli5",
      "communication",
      "clarity"
    ],
    "shortcut": "explain",
    "description": "Translate complex technical, medical, or legal jargon into simple, crystal-clear prose.",
    "template": "Explain the following complex concept / text so that a 12-year-old or non-technical executive can effortlessly understand it:\n\n```\n{{complex_text_or_concept}}\n```\n\nRules:\n- Eliminate all unnecessary acronyms and domain jargon.\n- Use a relatable real-world metaphor.\n- Explain: What is it? Why does it matter? How does it work?"
  },
  {
    "id": "write-apology-deescalation",
    "title": "Customer Escalation & Diplomatic Apology",
    "category": "Writing",
    "subCategory": "Business & Executive Email",
    "icon": "📧",
    "outputFormat": "Email Draft",
    "difficulty": "Quick",
    "tags": [
      "customer-service",
      "conflict",
      "diplomacy",
      "email"
    ],
    "shortcut": "apology",
    "description": "Draft empathetic, professional responses to de-escalate upset customers or clients.",
    "template": "Draft an empathetic, professional, and reassuring email to a client regarding an incident:\n\n**Incident / Mistake:** {{what_went_wrong}}\n**Impact on Client:** {{impact_on_client}}\n**Corrective Steps Taken:** {{how_we_are_fixing_it}}\n\nEnsure tone is:\n- Accountable without being overly defensive.\n- Clear regarding concrete compensation/remedies.\n- Restores confidence for long-term collaboration."
  },
  {
    "id": "write-product-description-ecommerce",
    "title": "High-Converting E-Commerce Product Description",
    "category": "Writing",
    "subCategory": "Storytelling & Hooks",
    "icon": "📖",
    "outputFormat": "Compelling Narrative",
    "difficulty": "Standard",
    "tags": [
      "ecommerce",
      "copywriting",
      "shopify",
      "amazon"
    ],
    "shortcut": "productcopy",
    "description": "Write sensory, benefit-driven product listings that drive conversions.",
    "template": "Write a compelling e-commerce product description for:\n\n**Product Name:** {{product_name}}\n**Key Features & Materials:** {{features_and_specs}}\n**Target Buyer:** {{ideal_customer}}\n\nInclude:\n- Catchy headline highlighting the primary transformation.\n- Sensory, lifestyle-focused paragraph.\n- 5 bullet points translating features into emotional benefits.\n- Technical specifications table summary."
  },
  {
    "id": "mkt-landing-page-hero",
    "title": "High-Converting Landing Page Hero Section",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "landing-page",
      "conversion",
      "cro",
      "copywriting"
    ],
    "shortcut": "hero",
    "description": "Generate 5 high-converting hero headlines, subheadlines, and CTAs.",
    "template": "Generate 5 variations of a high-converting Landing Page Hero Section for:\n\n**Product/SaaS:** {{product_name}}\n**What it does:** {{product_description}}\n**Target Audience:** {{ideal_customer_profile}}\n**Primary Competitor / Old Way:** {{competitor_or_manual_way}}\n\nFor each variation, provide:\n1. **Headline (H1):** Clear over clever, under 10 words.\n2. **Subheadline:** Explaining the mechanism and transformation.\n3. **Call to Action (CTA) Button Copy:** Action-oriented (e.g. \"Start Free 14-Day Trial\", \"Generate Your First Report\").\n4. **Social Proof Micro-copy:** (e.g. \"No credit card required • 2-minute setup\")."
  },
  {
    "id": "mkt-value-prop-canvas",
    "title": "Strategyzer Value Proposition Canvas",
    "category": "Marketing",
    "subCategory": "Product Launches & GTM",
    "icon": "🚀",
    "outputFormat": "GTM Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "strategy",
      "value-prop",
      "product-market-fit",
      "growth"
    ],
    "shortcut": "valprop",
    "description": "Map Customer Pains, Gains, and Jobs-to-be-Done against Product Pain Relievers.",
    "template": "Create a Strategyzer Value Proposition Canvas for **{{product_or_business_idea}}**.\n\n**Customer Profile:**\n- **Customer Jobs:** Functional, social, and emotional tasks they are trying to achieve.\n- **Customer Pains:** Frustrations, risks, and obstacles they experience.\n- **Customer Gains:** Desired outcomes and positive surprises they want.\n\n**Value Map:**\n- **Products & Services:** What we offer.\n- **Pain Relievers:** Exactly how we eliminate specific customer pains.\n- **Gain Creators:** How we deliver added value and measurable advantages."
  },
  {
    "id": "mkt-google-ad-copy",
    "title": "High-CTR Google Search Ads Generator",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "google-ads",
      "sem",
      "ppc",
      "copywriting"
    ],
    "shortcut": "googleads",
    "description": "Create Responsive Search Ads with 15 headlines and 4 descriptions under character limits.",
    "template": "Generate high-CTR Responsive Search Ads (RSA) for Google Ads for:\n\n**Business / Offer:** {{business_and_offer}}\n**Target Keywords:** {{target_keywords}}\n**Unique Selling Point (USP):** {{usp_and_promotions}}\n\nGenerate:\n- **10 Headlines** (Strictly under 30 characters each): Mix of keyword-focused, benefit-focused, and CTA headlines.\n- **4 Descriptions** (Strictly under 90 characters each): Focus on pain points, guarantees, and strong CTAs."
  },
  {
    "id": "mkt-facebook-ad-copy",
    "title": "Meta / Facebook Ad Copy Suite (3 Frameworks)",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "facebook-ads",
      "meta",
      "paid-social",
      "direct-response"
    ],
    "shortcut": "metaads",
    "description": "Write direct-response Meta ads using PAS, Hook-Story-Offer, and Testimonial styles.",
    "template": "Write 3 distinct Meta (Facebook/Instagram) ad variations for:\n\n**Product:** {{product_name}}\n**Target Persona:** {{target_persona}}\n**Offer & Discount:** {{offer_details}}\n\nProvide 3 ad angles:\n1. **Angle 1: Pain-Agitate-Solve (PAS):** Focus on the immediate daily frustration.\n2. **Angle 2: Hook-Story-Offer:** Narrative from a relatable character before/after discovering the product.\n3. **Angle 3: Short & Punchy Social Proof:** Highlighting customer stats and guarantees.\nInclude recommended visual/video creative concepts for each."
  },
  {
    "id": "mkt-marketing-funnel",
    "title": "Full-Funnel Growth Strategy (TOFU, MOFU, BOFU)",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "funnel",
      "growth",
      "strategy",
      "lead-gen"
    ],
    "shortcut": "funnel",
    "description": "Architect acquisition channels, lead magnets, and conversion triggers across the funnel.",
    "template": "Design an end-to-end customer acquisition and conversion funnel for:\n\n**Business Type:** {{business_model_e_g_b2b_saas_ecommerce}}\n**Primary Goal:** {{growth_goal_e_g_100_demo_calls_per_month}}\n\nDetail each stage:\n1. **Top of Funnel (TOFU - Awareness):** Organic content, viral hooks, paid channels, and lead magnet ideas.\n2. **Middle of Funnel (MOFU - Consideration):** Email nurture sequence, webinars, case studies, and comparison pages.\n3. **Bottom of Funnel (BOFU - Conversion):** Free trials, live demos, risk reversal, and retargeting tactics.\n4. **Retention & Referral:** Onboarding activation milestones and referral loops."
  },
  {
    "id": "mkt-product-hunt-launch",
    "title": "Product Hunt Launch Kit & Strategy",
    "category": "Marketing",
    "subCategory": "Product Launches & GTM",
    "icon": "🚀",
    "outputFormat": "GTM Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "product-hunt",
      "launch",
      "startup",
      "marketing"
    ],
    "shortcut": "phlaunch",
    "description": "Craft tagline, maker comment, gallery descriptions, and launch day checklist.",
    "template": "Create a Product Hunt launch package for:\n\n**Product Name:** {{product_name}}\n**One-liner Pitch:** {{one_liner_pitch}}\n**Key Features:** {{key_features}}\n\nProvide:\n1. **Tagline:** Punchy, under 60 characters.\n2. **First Maker Comment:** Authentic story of why we built this, the problem it solves, and an exclusive PH community discount/perk.\n3. **Interactive Demo Prompt & GIF Ideas:** What to show in the media gallery.\n4. **Day-of Launch Distribution Plan:** Outreach channels to mobilize community support."
  },
  {
    "id": "mkt-pricing-strategy",
    "title": "SaaS Pricing Tier & Packaging Matrix",
    "category": "Marketing",
    "subCategory": "Product Launches & GTM",
    "icon": "🚀",
    "outputFormat": "GTM Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "pricing",
      "saas",
      "monetization",
      "packaging"
    ],
    "shortcut": "pricing",
    "description": "Design 3-tier pricing (Starter, Pro, Enterprise) with value metrics and feature gates.",
    "template": "Design an optimal 3-tier pricing strategy for **{{saas_product_description}}**.\n\nInclude:\n- **Tier 1 (Starter / Free Tier):** Target audience, price point, key feature gates, and usage limits.\n- **Tier 2 (Pro / Growth - Most Popular):** Target audience, price point, the \"killer features\" that compel upgrades.\n- **Tier 3 (Enterprise / Scale):** Security (SSO, SAML), SLA, dedicated support, custom volume.\n- **Value Metric:** What core usage metric scales the pricing (e.g. seats, API calls, storage, contacts)."
  },
  {
    "id": "mkt-onboarding-email-sequence",
    "title": "SaaS 5-Part User Onboarding Email Sequence",
    "category": "Marketing",
    "subCategory": "Funnels & Lifecycle Email",
    "icon": "📬",
    "outputFormat": "Email Sequence / Funnel",
    "difficulty": "Standard",
    "tags": [
      "email-marketing",
      "onboarding",
      "retention",
      "activation"
    ],
    "shortcut": "onboarding",
    "description": "Write automated welcome, aha-moment, case study, and upgrade emails.",
    "template": "Write a 5-part automated onboarding email drip for newly registered users of **{{app_name}}**.\n\n**App Value / Core Aha-Moment:** {{core_aha_moment}}\n\nDraft the 5 emails:\n- **Email 1 (Day 0 - Welcome):** Set expectations, 1 single action to reach the aha-moment.\n- **Email 2 (Day 1 - Quick Win):** Guide them through a 2-minute success workflow.\n- **Email 3 (Day 3 - Pro Tips / Case Study):** How top users get 10x value.\n- **Email 4 (Day 6 - Overcoming Friction):** FAQs and support invite.\n- **Email 5 (Day 10 - Trial Ending / Upgrade Incentive):** Value summary and time-sensitive offer."
  },
  {
    "id": "mkt-customer-avatar-icp",
    "title": "Ideal Customer Profile (ICP) & Buyer Persona",
    "category": "Marketing",
    "subCategory": "Customer Personas & ICP",
    "icon": "👥",
    "outputFormat": "Audience Dossier",
    "difficulty": "Standard",
    "tags": [
      "icp",
      "persona",
      "marketing",
      "research"
    ],
    "shortcut": "icp",
    "description": "Deep dive into demographics, psychographics, daily workflow, and purchase triggers.",
    "template": "Build an exhaustive Ideal Customer Profile (ICP) and Buyer Persona for:\n\n**Product:** {{product_description}}\n**Target Industry:** {{target_industry}}\n\nStructure into:\n1. **Demographic & Firmographic:** Company size, revenue, role title, tools in their current tech stack.\n2. **Psychographics & Daily Routine:** How their performance is measured (KPIs), what stresses them out.\n3. **Buying Triggers & Objections:** What event sparks them to seek a solution? What makes them hesitate?\n4. **Where They Hang Out:** Subreddits, podcasts, influencers, newsletters they consume daily."
  },
  {
    "id": "mkt-cold-call-script",
    "title": "High-Confidence B2B Cold Calling Script",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "sales",
      "cold-call",
      "b2b",
      "scripts"
    ],
    "shortcut": "coldcall",
    "description": "Write permission-based cold calling scripts with objection handling rebuttals.",
    "template": "Write a permission-based B2B cold calling script targeting {{target_role_e_g_vp_of_sales}}.\n\n**Our Solution:** {{our_solution_and_metric}}\n\nScript Flow:\n1. **Opener (Pattern Interrupt):** e.g. \"I know I caught you out of the blue, do you have 27 seconds for me to tell you why I called...?\"\n2. **The Problem Pitch:** 2 sentences highlighting a known industry headache.\n3. **The Hook:** How we helped a peer company solve it.\n4. **Objection Rebuttals for:**\n   - *\"We already use [Competitor]\"*\n   - *\"Send me an email\"*\n   - *\"I don't have budget right now\"*\n5. **Closing CTA for a 15-minute intro meeting.**"
  },
  {
    "id": "mkt-competitor-battlecard",
    "title": "Sales Competitor Battlecard & Differentiation",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "sales",
      "competitors",
      "battlecard",
      "positioning"
    ],
    "shortcut": "battlecard",
    "description": "Equip sales reps with landmine questions, comparison points, and win strategies.",
    "template": "Create a Sales Battlecard comparing our product **{{our_product}}** against **{{competitor_product}}**.\n\nProvide:\n1. **Quick Overview & Competitor Weaknesses.**\n2. **Our Key Differentiators / Unfair Advantages.**\n3. **Trap-Setting Questions to Ask Prospects:** Questions that highlight competitor shortcomings without sounding aggressive.\n4. **How to Respond When the Prospect Loves the Competitor's Feature X.**\n5. **Real-World Win Story Framework.**"
  },
  {
    "id": "mkt-tiktok-reels-hooks",
    "title": "20 Viral TikTok & Instagram Reels Hooks",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "tiktok",
      "reels",
      "short-form",
      "viral",
      "video"
    ],
    "shortcut": "hooks",
    "description": "20 high-retention 3-second visual and audio hooks for short-form video.",
    "template": "Generate 20 scroll-stopping short-form video hooks (for TikTok, Reels, YouTube Shorts) for:\n\n**Niche / Topic:** {{niche_or_topic}}\n**Target Audience:** {{target_viewer}}\n\nCategorize into:\n- 5 **Negative / Warning Hooks** (e.g. \"Stop doing X if you want Y...\")\n- 5 **Secret / Curiosity Hooks** (e.g. \"Nobody in [Industry] wants you to know this tool...\")\n- 5 **Visual / Storytelling Hooks** (e.g. \"I tested X for 30 days so you don't have to...\")\n- 5 **Contrarian / Unpopular Opinion Hooks**"
  },
  {
    "id": "mkt-influencer-outreach",
    "title": "Creator / Influencer Partnership Pitch",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "influencer",
      "outreach",
      "partnerships",
      "sponsorship"
    ],
    "shortcut": "influencer",
    "description": "Pitch creators for sponsored integrations, affiliate deals, and free product seeding.",
    "template": "Draft an outreach email to an influential creator/influencer in the **{{niche}}** space to propose a paid sponsorship / collaboration for **{{brand_or_product_name}}**.\n\nRequirements:\n- Show genuine appreciation for their specific content style.\n- Pitch the collaboration concisely (creative freedom + fair compensation).\n- Include simple deliverables (e.g. 60-second dedicated YouTube integration or 1 Reel).\n- Easy call to action to review our media brief."
  },
  {
    "id": "mkt-referral-program",
    "title": "Viral Referral & Affiliate Program Blueprint",
    "category": "Marketing",
    "subCategory": "Social Media & Viral Content",
    "icon": "📱",
    "outputFormat": "Viral Content Package",
    "difficulty": "Quick",
    "tags": [
      "referral",
      "affiliate",
      "growth-loops",
      "viral"
    ],
    "shortcut": "referral",
    "description": "Structure double-sided rewards, affiliate commission tiers, and sharing prompts.",
    "template": "Design a high-engagement, double-sided referral and affiliate program for:\n\n**Product:** {{product_name_and_pricing}}\n\nInclude:\n- **Reward Structure for Referrer:** (e.g., cash, credits, exclusive features).\n- **Incentive for the Friend / Referee:** (e.g., 20% off first 3 months).\n- **Trigger Points:** Exactly when in the user journey to prompt them to invite friends (e.g., after achieving a milestone).\n- **Ready-to-use Share Copy for WhatsApp, Twitter, and Email.**"
  },
  {
    "id": "mkt-lead-magnet-concept",
    "title": "Irresistible Lead Magnet & Opt-In Page",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "lead-magnet",
      "email-list",
      "opt-in",
      "growth"
    ],
    "shortcut": "leadmagnet",
    "description": "Brainstorm high-converting cheatsheets, templates, calculators, or mini-courses.",
    "template": "Brainstorm 3 high-converting Lead Magnet concepts for {{business_niche_and_audience}}.\n\nFor each concept, provide:\n1. **Format:** (e.g. Notion Template, Spreadsheet Calculator, 5-Day Email Crash Course, Cheatsheet).\n2. **Irresistible Title & Promise.**\n3. **Estimated Time to Consume & Implement** (focus on ultra-fast time-to-value).\n4. **Landing Page Opt-In Headline and 3 Bullet Points.**"
  },
  {
    "id": "mkt-webinar-structure",
    "title": "High-Converting Sales Webinar Script Outline",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "webinar",
      "sales",
      "presentation",
      "conversions"
    ],
    "shortcut": "webinar",
    "description": "60-minute structured presentation framework that teaches and sells.",
    "template": "Create a 60-minute webinar presentation outline for selling {{product_or_course_name}}.\n\n**Target Audience:** {{audience}}\n**Core Transformation:** {{core_transformation}}\n\nStructure:\n- **Minutes 0-10:** Hook, Big Promise, Personal Credibility Story.\n- **Minutes 10-40 (The 3 Secrets):** Teach 3 core principles that shift beliefs and dismantle misconceptions.\n- **Minutes 40-50 (The Pitch & Stack):** Present the solution, the bonuses, guarantee, and total value stack.\n- **Minutes 50-60 (Q&A & Urgency Close):** Handling live objections."
  },
  {
    "id": "mkt-brand-storytelling",
    "title": "StoryBrand 7-Part Framework Narrative",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "storybrand",
      "branding",
      "positioning",
      "copywriting"
    ],
    "shortcut": "storybrand",
    "description": "Position the customer as the hero and your brand as the trusted guide.",
    "template": "Build a StoryBrand 7-Part Brand Script for **{{company_or_product_name}}**.\n\n1. **A Character:** Who is the customer and what do they desire?\n2. **Has a Problem:** External, Internal, and Philosophical problems.\n3. **And Meets a Guide:** How we express empathy and demonstrate authority.\n4. **Who Gives Them a Plan:** A simple 3-step path forward.\n5. **And Calls Them to Action:** Direct and transitional CTAs.\n6. **That Helps Them Avoid Failure:** The painful stakes if they don't act.\n7. **And Ends in Success:** The glorious transformation and vision of life after."
  },
  {
    "id": "mkt-event-promotion-plan",
    "title": "Omnichannel Event & Conference Launch Plan",
    "category": "Marketing",
    "subCategory": "Product Launches & GTM",
    "icon": "🚀",
    "outputFormat": "GTM Blueprint",
    "difficulty": "Deep Analysis",
    "tags": [
      "events",
      "launch",
      "marketing",
      "promotion"
    ],
    "shortcut": "eventplan",
    "description": "4-week promotional calendar across email, social media, and community outreach.",
    "template": "Create a 4-week promotional marketing calendar for an upcoming {{event_type_e_g_virtual_summit_hackathon_launch_party}}.\n\n**Event Name & Details:** {{event_details}}\n\nProvide weekly action items:\n- **Week 1 (Announcement & Early Bird):** Teasers, founder post, early-bird ticket discount.\n- **Week 2 (Speaker / Agenda Reveal):** Highlighting key sessions and exclusive networking.\n- **Week 3 (Social Proof & Community Push):** Attendees sharing badge graphics.\n- **Week 4 (Last Chance & FOMO):** 48-hour countdown, final ticket push."
  },
  {
    "id": "mkt-survey-customer-feedback",
    "title": "Customer Discovery & Churn Survey Questions",
    "category": "Marketing",
    "subCategory": "Customer Personas & ICP",
    "icon": "👥",
    "outputFormat": "Audience Dossier",
    "difficulty": "Standard",
    "tags": [
      "survey",
      "feedback",
      "user-research",
      "churn"
    ],
    "shortcut": "survey",
    "description": "Write unbiased customer discovery and cancellation exit survey questions.",
    "template": "Write a high-completion customer survey for {{survey_goal_e_g_churn_exit_or_new_feature_discovery}}.\n\nProvide:\n- **5 Multi-choice questions** with exhaustive options.\n- **2 Open-ended \"Mom Test\" questions** that uncover genuine behavior without leading the witness.\n- **The Email / In-App notification copy** inviting users to take the 2-minute survey."
  },
  {
    "id": "mkt-app-store-aso",
    "title": "App Store Optimization (ASO) Listing Suite",
    "category": "Marketing",
    "subCategory": "Conversion Copywriting",
    "icon": "🎯",
    "outputFormat": "High-Converting Copy",
    "difficulty": "Standard",
    "tags": [
      "aso",
      "mobile",
      "app-store",
      "growth"
    ],
    "shortcut": "aso",
    "description": "Optimize App Store / Play Store titles, keywords, subtitles, and screenshot copy.",
    "template": "Generate an App Store Optimization (ASO) metadata package for a mobile app:\n\n**App Name:** {{app_name}}\n**App Core Function:** {{app_function}}\n**Target Keywords:** {{target_keywords}}\n\nProvide:\n1. **App Title (Max 30 chars):** Keyword-rich and branded.\n2. **Subtitle (Max 30 chars):** Value-focused pitch.\n3. **Keyword Field (100 chars iOS format, comma-separated).**\n4. **Promotional Text (170 chars).**\n5. **Screenshot Headlines:** 5 bold, 4-word headlines for app preview gallery images."
  },
  {
    "id": "seo-keyword-clustering",
    "title": "Semantic Keyword Clustering & Topical Map",
    "category": "SEO",
    "subCategory": "Keyword Strategy & Intent",
    "icon": "🔍",
    "outputFormat": "Keyword Matrix Table",
    "difficulty": "Standard",
    "tags": [
      "keywords",
      "topical-authority",
      "clustering",
      "seo"
    ],
    "shortcut": "seocluster",
    "description": "Group raw keywords into semantic clusters with search intent and parent pages.",
    "template": "Analyze this list of target keywords and group them into semantic topical clusters to build topical authority for {{website_niche}}:\n\n**Keywords List:**\n```\n{{keywords_list}}\n```\n\nFor each cluster, provide:\n1. **Cluster Pillar Page Topic / Title**\n2. **Search Intent** (Informational, Commercial, Transactional, Navigational)\n3. **Core Primary Keyword & Secondary Long-Tail Variations**\n4. **Internal Linking Structure Recommendation**"
  },
  {
    "id": "seo-meta-tag-generator",
    "title": "High-CTR SEO Title Tags & Meta Descriptions",
    "category": "SEO",
    "subCategory": "On-Page & Meta Optimization",
    "icon": "🏷️",
    "outputFormat": "Meta Checklist",
    "difficulty": "Quick",
    "tags": [
      "meta-tags",
      "titles",
      "ctr",
      "on-page-seo"
    ],
    "shortcut": "metatags",
    "description": "Generate 5 click-worthy SEO title tags (<60 chars) and meta descriptions (<155 chars).",
    "template": "Generate 5 pairs of high-CTR SEO Title Tags and Meta Descriptions for:\n\n**Page Topic / Article:** {{page_topic}}\n**Primary Target Keyword:** {{primary_keyword}}\n**Secondary Keyword:** {{secondary_keyword}}\n\nStrict constraints:\n- **Title Tags:** Under 60 characters, includes primary keyword near front, compelling click trigger.\n- **Meta Descriptions:** Under 155 characters, includes active CTA and secondary keyword."
  },
  {
    "id": "seo-content-gap-analysis",
    "title": "Competitor Content Gap & SERP Tear-Down",
    "category": "SEO",
    "subCategory": "Keyword Strategy & Intent",
    "icon": "🔍",
    "outputFormat": "Keyword Matrix Table",
    "difficulty": "Standard",
    "tags": [
      "serp",
      "competitor",
      "content-gap",
      "audit"
    ],
    "shortcut": "seogap",
    "description": "Identify missing subtopics, questions, and visual assets to outrank competitors.",
    "template": "I want to outrank the current top 3 Google results for the keyword: **\"{{target_keyword}}\"**.\n\nHere is what the competitors are covering:\n```\n{{competitor_headings_or_content_summary}}\n```\n\nAnalyze the SERP and tell me:\n1. **Missing Subtopics & Entities:** What crucial aspects are competitors failing to explain?\n2. **Unique Angles & Data Points:** What original angles or primary data can make our article 10x better?\n3. **User Experience & Schema:** Recommended JSON-LD schema (FAQ, HowTo, Article) and visual elements (tables, charts, calculators)."
  },
  {
    "id": "seo-schema-markup-jsonld",
    "title": "JSON-LD Structured Data / Schema Markup",
    "category": "SEO",
    "subCategory": "Technical SEO & Structured Data",
    "icon": "⚙️",
    "outputFormat": "Schema JSON-LD & Audit",
    "difficulty": "Deep Analysis",
    "tags": [
      "schema",
      "json-ld",
      "rich-snippets",
      "technical-seo"
    ],
    "shortcut": "schema",
    "description": "Generate valid Schema.org JSON-LD code for FAQ, Article, Product, or Organization.",
    "template": "Generate fully valid Schema.org JSON-LD structured data markup for a {{schema_type_e_g_faqpage_article_product_localbusiness}}.\n\n**Data & Context:**\n```\n{{page_data_or_faqs}}\n```\n\nProvide:\n- The clean `<script type=\"application/ld+json\">` block.\n- Verification notes to test with Google's Rich Results Test."
  },
  {
    "id": "seo-internal-linking-strategy",
    "title": "Internal Linking Strategy & Anchor Text Matrix",
    "category": "SEO",
    "subCategory": "Keyword Strategy & Intent",
    "icon": "🔍",
    "outputFormat": "Keyword Matrix Table",
    "difficulty": "Standard",
    "tags": [
      "internal-links",
      "anchor-text",
      "pagerank",
      "seo"
    ],
    "shortcut": "internallinks",
    "description": "Map exact anchor texts and contextual links to boost target ranking pages.",
    "template": "Develop an internal linking strategy for our target ranking page:\n\n**Target Page (To Boost):** {{target_page_title_and_url}}\n**Target Keyword:** {{target_keyword}}\n\n**Existing Site Pages / Articles Available:**\n```\n{{existing_pages_list}}\n```\n\nProvide:\n1. Which specific existing pages should link to the target page.\n2. The recommended **Contextual Anchor Text** for each link (avoiding over-optimization).\n3. The exact sentence / context to insert the link naturally into each existing article."
  },
  {
    "id": "seo-programmatic-seo-templates",
    "title": "Programmatic SEO Page Framework & Dataset Design",
    "category": "SEO",
    "subCategory": "Keyword Strategy & Intent",
    "icon": "🔍",
    "outputFormat": "Keyword Matrix Table",
    "difficulty": "Standard",
    "tags": [
      "programmatic-seo",
      "pseo",
      "scale",
      "automation"
    ],
    "shortcut": "progseo",
    "description": "Design programmatic page templates and data structures for 1,000+ long-tail pages.",
    "template": "Design a Programmatic SEO (pSEO) strategy for **{{niche_or_business}}**.\n\n**Target Pattern:** e.g. \"Best [Tool/Activity] in [City]\" or \"[Tool A] vs [Tool B]\".\n\nProvide:\n1. **Database Schema / Attributes:** The data columns needed for each entry to avoid thin content penalties.\n2. **Dynamic URL Structure & Title Formula.**\n3. **Modular Page Wireframe:** H1, H2s, comparison tables, dynamic charts, and user-generated review blocks."
  },
  {
    "id": "seo-backlink-outreach-email",
    "title": "High-Response Link Building & Guest Post Pitch",
    "category": "SEO",
    "subCategory": "Competitor & Backlink Strategy",
    "icon": "🌐",
    "outputFormat": "Competitive Analysis",
    "difficulty": "Standard",
    "tags": [
      "backlinks",
      "outreach",
      "link-building",
      "guest-post"
    ],
    "shortcut": "backlinks",
    "description": "Pitch editors and bloggers with high-value guest post topics or broken link replacements.",
    "template": "Write an outreach email to an editor at **{{target_website_name}}** proposing a guest post or contextual link insertion.\n\n**Our Content / Asset:** {{our_content_asset}}\n**Their Relevant Article:** {{their_article_topic}}\n\nEnsure the pitch:\n- Proves we actually read their article with a specific complimentary insight.\n- Offers 3 irresistible, unique article topics that plug gaps on their blog.\n- Highlights our writing quality and domain authority."
  },
  {
    "id": "seo-image-alt-text",
    "title": "Descriptive & Accessible Image Alt Text",
    "category": "SEO",
    "subCategory": "Competitor & Backlink Strategy",
    "icon": "🌐",
    "outputFormat": "Competitive Analysis",
    "difficulty": "Standard",
    "tags": [
      "alt-text",
      "accessibility",
      "image-seo"
    ],
    "shortcut": "alttext",
    "description": "Write SEO-friendly, accessibility-compliant alt texts for website images.",
    "template": "Write descriptive, accessibility-compliant (WCAG) and SEO-optimized Alt Text for the following images:\n\n**Images Description & Page Context:**\n```\n{{image_descriptions_and_context}}\n```\n\nRules:\n- Be descriptive and accurate for screen readers.\n- Incorporate natural target keywords without keyword stuffing.\n- Keep each alt text under 125 characters."
  },
  {
    "id": "seo-robots-htaccess-builder",
    "title": "Robots.txt & .htaccess Technical Directives",
    "category": "SEO",
    "subCategory": "Technical SEO & Structured Data",
    "icon": "⚙️",
    "outputFormat": "Schema JSON-LD & Audit",
    "difficulty": "Deep Analysis",
    "tags": [
      "robots",
      "htaccess",
      "technical-seo",
      "crawling"
    ],
    "shortcut": "robotstxt",
    "description": "Configure robots.txt crawl directives, sitemap declarations, and 301 redirects.",
    "template": "Generate a technical SEO configuration file for a {{website_cms_or_framework}}:\n\n**Requirements:**\n{{crawling_and_redirect_rules}}\n\nProvide:\n1. Production-ready `robots.txt` with proper `Disallow`, `Allow`, and `Sitemap` rules.\n2. `.htaccess` / Nginx redirection rules for 301 permanent redirects, canonical enforcement (HTTP to HTTPS, non-www to www)."
  },
  {
    "id": "seo-people-also-ask-answers",
    "title": "People Also Ask (PAA) Snippet Answers",
    "category": "SEO",
    "subCategory": "Competitor & Backlink Strategy",
    "icon": "🌐",
    "outputFormat": "Competitive Analysis",
    "difficulty": "Standard",
    "tags": [
      "paa",
      "featured-snippets",
      "zero-click",
      "seo"
    ],
    "shortcut": "paa",
    "description": "Craft 45-50 word direct answers engineered to capture Google Featured Snippets.",
    "template": "Write answers optimized to win Google's \"People Also Ask\" (PAA) and Featured Snippets for these questions:\n\n**Questions:**\n```\n{{questions_list}}\n```\n\nFor each question:\n- Provide a direct, factual 40-50 word definition/answer immediately.\n- Follow up with a bulleted list or 2-sentence elaboration providing context."
  },
  {
    "id": "seo-local-gmb-optimizer",
    "title": "Local SEO Google Business Profile (GBP) Optimizer",
    "category": "SEO",
    "subCategory": "On-Page & Meta Optimization",
    "icon": "🏷️",
    "outputFormat": "Meta Checklist",
    "difficulty": "Quick",
    "tags": [
      "local-seo",
      "gmb",
      "maps",
      "small-business"
    ],
    "shortcut": "localseo",
    "description": "Optimize GBP business descriptions, service menus, and local review responses.",
    "template": "Optimize the Local SEO profile for a {{business_type}} located in {{city_state}}.\n\n**Business Name:** {{business_name}}\n**Core Services:** {{services_list}}\n\nProvide:\n1. **GBP Business Description (750 chars):** Keyword-optimized with geographic markers and call to action.\n2. **Primary & Secondary GBP Categories.**\n3. **Local Citations & Service Menu Structure.**\n4. **2 Professional Review Response Templates** (one for 5-star praise, one for 1-star critique)."
  },
  {
    "id": "seo-audit-checklist",
    "title": "Comprehensive Technical SEO Audit Checklist",
    "category": "SEO",
    "subCategory": "Technical SEO & Structured Data",
    "icon": "⚙️",
    "outputFormat": "Schema JSON-LD & Audit",
    "difficulty": "Deep Analysis",
    "tags": [
      "audit",
      "technical-seo",
      "indexing",
      "crawlability"
    ],
    "shortcut": "seoaudit",
    "description": "Step-by-step diagnostic checklist covering crawlability, indexation, and Core Web Vitals.",
    "template": "Perform a systematic technical SEO diagnostic plan for {{website_url_and_stack}}.\n\nDetail audit steps across:\n1. **Crawlability & Indexation:** XML Sitemaps, Robots.txt, Noindex tags, Canonical tags, Orphan pages.\n2. **Site Architecture & URL Structure:** Hierarchy depth (clicks from homepage), pagination, breadcrumbs.\n3. **Mobile & Core Web Vitals:** Mobile usability, LCP, CLS, INP benchmarks.\n4. **International SEO:** Hreflang tags, geo-targeting."
  },
  {
    "id": "seo-content-refresh",
    "title": "Decaying Content Refresh & Optimization Playbook",
    "category": "SEO",
    "subCategory": "Keyword Strategy & Intent",
    "icon": "🔍",
    "outputFormat": "Keyword Matrix Table",
    "difficulty": "Standard",
    "tags": [
      "content-decay",
      "optimization",
      "ranking-drop",
      "seo"
    ],
    "shortcut": "seorefresh",
    "description": "Revitalize outdated articles that have lost traffic and SERP positions.",
    "template": "My article **\"{{article_title}}\"** used to rank in the top 3 but has dropped to page 2.\n\n**Current Content / Snippet:**\n```\n{{current_article_text}}\n```\n\nGive me a step-by-step refresh plan:\n1. What outdated facts, dates, or tools need immediate replacement?\n2. What fresh sections or interactive elements should be added?\n3. How to optimize headings and introduction for current search intent."
  },
  {
    "id": "seo-press-release-syndication",
    "title": "SEO-Optimized Syndicated Press Release",
    "category": "SEO",
    "subCategory": "Technical SEO & Structured Data",
    "icon": "⚙️",
    "outputFormat": "Schema JSON-LD & Audit",
    "difficulty": "Deep Analysis",
    "tags": [
      "press-release",
      "syndication",
      "brand-building",
      "seo"
    ],
    "shortcut": "seopr",
    "description": "Draft press releases with canonical tags and safe backlink anchor texts for distribution.",
    "template": "Write an SEO-friendly press release ready for newswire syndication:\n\n**Topic & News Angle:** {{news_angle}}\n**Target Brand URL:** {{brand_url}}\n\nGuidelines:\n- Include naturally placed branded anchors.\n- Structure with clear headline, quote, and boilerplate.\n- Optimize for Google News inclusion criteria."
  },
  {
    "id": "seo-glossary-term-builder",
    "title": "Industry Glossary & Definition Hub Pages",
    "category": "SEO",
    "subCategory": "Competitor & Backlink Strategy",
    "icon": "🌐",
    "outputFormat": "Competitive Analysis",
    "difficulty": "Standard",
    "tags": [
      "glossary",
      "topical-authority",
      "definitions",
      "seo"
    ],
    "shortcut": "glossary",
    "description": "Generate dictionary/glossary definition pages that capture top-of-funnel informational queries.",
    "template": "Create an authoritative glossary entry for the term: **\"{{industry_term}}\"** in the **{{industry_domain}}** sector.\n\nInclude:\n- **Concise Definition (1-2 sentences).**\n- **In-Depth Breakdown:** How it works, key components, and examples.\n- **Why It Matters:** Business or technical impact.\n- **Common Misconceptions / How it Differs from {{related_term}}**."
  },
  {
    "id": "prod-first-principles",
    "title": "First-Principles Thinking & Problem Deconstructor",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "first-principles",
      "reasoning",
      "problem-solving",
      "mental-models"
    ],
    "shortcut": "firstprinciples",
    "description": "Break complex problems down to fundamental truths and build novel solutions from scratch.",
    "template": "Apply Elon Musk / Aristotle First-Principles Thinking to deconstruct the following problem:\n\n**The Problem:** {{problem_statement}}\n**Current Conventional Assumptions:** {{what_people_normally_assume}}\n\nSystematically:\n1. **Identify and List All Assumptions:** Question every belief currently taken for granted.\n2. **Deconstruct to Fundamental Physical / Logical Truths:** What are the undeniable, irreducible facts?\n3. **Reconstruct a Solution from the Ground Up:** Build a completely new solution based solely on the fundamental truths without reference to traditional methods."
  },
  {
    "id": "prod-eisenhower-matrix",
    "title": "Eisenhower Matrix Task Prioritization",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "eisenhower",
      "tasks",
      "time-management",
      "priority"
    ],
    "shortcut": "prioritize",
    "description": "Categorize chaotic to-do lists into Urgent vs Important quadrants with delegate/delete advice.",
    "template": "Organize and prioritize this chaotic list of tasks using the Eisenhower Matrix:\n\n**My Raw Task List:**\n```\n{{raw_tasks_list}}\n```\n\nSort tasks into:\n- **Quadrant 1 (Urgent & Important - DO FIRST):** Critical deadlines, crises.\n- **Quadrant 2 (Not Urgent & Important - SCHEDULE):** High-leverage strategic planning, deep work.\n- **Quadrant 3 (Urgent & Not Important - DELEGATE / AUTOMATE):** Interruptions, routine tasks.\n- **Quadrant 4 (Not Urgent & Not Important - ELIMINATE):** Time wasters and low-value noise."
  },
  {
    "id": "prod-feynman-technique",
    "title": "The Feynman Technique Rapid Learning Mastery",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "learning",
      "feynman",
      "mental-models",
      "study"
    ],
    "shortcut": "feynman",
    "description": "Master any subject by teaching it simply, identifying gaps, and refining with analogies.",
    "template": "Help me master the concept of **{{concept_to_learn}}** using the 4-Step Feynman Technique.\n\nStep 1: Explain the concept as if I were a complete beginner without any prerequisite knowledge.\nStep 2: Identify the 3 most common knowledge gaps or misconceptions students struggle with.\nStep 3: Create a vivid real-world analogy to solidify intuition.\nStep 4: Quiz me with 2 thought-provoking scenario questions to test my deep understanding."
  },
  {
    "id": "prod-decision-matrix",
    "title": "Weighted Decision Matrix & Trade-Off Evaluator",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "decisions",
      "tradeoffs",
      "matrix",
      "strategy"
    ],
    "shortcut": "decide",
    "description": "Score competing options against weighted criteria to make clear, unbiased decisions.",
    "template": "Help me decide between the following options:\n\n**Options Under Consideration:**\n```\n{{competing_options}}\n```\n\n**Key Factors / Criteria that Matter to Me:**\n```\n{{evaluation_criteria}}\n```\n\nProvide:\n1. A **Weighted Scoring Matrix Table** (rating 1-10 with weighted calculations).\n2. **Pros, Cons, and Hidden Risks** for each option.\n3. **The 10/10/10 Rule Analysis:** How will I feel about this decision in 10 minutes, 10 months, and 10 years?\n4. **Definitive Recommendation & Implementation Step.**"
  },
  {
    "id": "prod-daily-standup-prep",
    "title": "Crisp Daily Standup / Async Status Report",
    "category": "Productivity",
    "subCategory": "Task & Meeting Management",
    "icon": "⏱️",
    "outputFormat": "Action Item Checklist",
    "difficulty": "Quick",
    "tags": [
      "standup",
      "agile",
      "scrum",
      "status"
    ],
    "shortcut": "standup",
    "description": "Format concise Yesterday / Today / Blockers updates for Slack or daily meetings.",
    "template": "Turn these messy notes into a concise, professional Agile Daily Standup report:\n\n**My Notes:**\n```\n{{raw_daily_notes}}\n```\n\nFormat:\n- 🚀 **Yesterday:** Key completed tickets and deliverables.\n- 🎯 **Today:** Top 2 focus tasks and planned outcomes.\n- 🛑 **Blockers:** Dependencies, waiting on PR reviews, or access requests."
  },
  {
    "id": "prod-socratic-interrogation",
    "title": "Socratic Dialog & Devil's Advocate",
    "category": "Productivity",
    "subCategory": "Executive Briefings & Summaries",
    "icon": "📑",
    "outputFormat": "Executive Summary",
    "difficulty": "Quick",
    "tags": [
      "socratic",
      "critical-thinking",
      "debate",
      "logic"
    ],
    "shortcut": "socratic",
    "description": "Challenge beliefs and stress-test assumptions with probing Socratic questions.",
    "template": "Play the role of Socrates and ruthless Devil's Advocate. Thoroughly stress-test my thesis/plan:\n\n**My Plan / Hypothesis:** {{my_thesis_or_plan}}\n\nRules:\n- Do not flatter or praise the idea.\n- Ask 5 sharp, probing questions that expose hidden logical fallacies, unvalidated assumptions, and worst-case scenarios.\n- Identify where confirmation bias might be clouding my judgment."
  },
  {
    "id": "prod-weekly-review-gtd",
    "title": "Getting Things Done (GTD) Weekly Review",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "gtd",
      "weekly-review",
      "organization",
      "clarity"
    ],
    "shortcut": "gtd",
    "description": "Conduct a comprehensive weekly mental cleanup, project status review, and calendar audit.",
    "template": "Guide me through a comprehensive GTD (Getting Things Done) Weekly Review.\n\n**My Input on This Week's Progress:**\n```\n{{weekly_reflection_notes}}\n```\n\nStructure:\n1. **Mind Sweep:** What loose ends or open loops need capturing?\n2. **Project Health Check:** Status of active projects (On Track, At Risk, Completed).\n3. **Upcoming Week Focus:** Top 3 needle-moving outcomes for next week.\n4. **Energy & Wellness Check:** Habits and boundaries to reinforce."
  },
  {
    "id": "prod-negotiation-prep",
    "title": "Chris Voss Tactical Empathy Negotiation Prep",
    "category": "Productivity",
    "subCategory": "Brainstorming & Problem Solving",
    "icon": "💡",
    "outputFormat": "Ideation Blueprint",
    "difficulty": "Standard",
    "tags": [
      "negotiation",
      "chris-voss",
      "sales",
      "communication"
    ],
    "shortcut": "negotiate",
    "description": "Prepare calibrated questions, labels, mirrors, and accusations audits for negotiations.",
    "template": "Help me prepare for an upcoming high-stakes negotiation using Chris Voss (*Never Split the Difference*) principles:\n\n**Negotiation Context:** {{negotiation_context}}\n**Counterpart Role & Motivations:** {{counterpart_info}}\n**My Target Outcome:** {{my_target_outcome}}\n\nPrepare:\n1. **Accusation Audit:** Everything negative they might think or say about me, addressed upfront.\n2. **3 Calibrated \"How\" & \"What\" Questions** (e.g., \"How am I supposed to do that?\").\n3. **Mirroring & Labeling Statements** to build tactical empathy.\n4. **The \"No\"-Oriented Question** to lower their defense."
  },
  {
    "id": "prod-email-triage-inbox-zero",
    "title": "Inbox Zero Rapid Email Triage & Replies",
    "category": "Productivity",
    "subCategory": "Brainstorming & Problem Solving",
    "icon": "💡",
    "outputFormat": "Ideation Blueprint",
    "difficulty": "Standard",
    "tags": [
      "inbox-zero",
      "email",
      "efficiency",
      "triage"
    ],
    "shortcut": "inboxzero",
    "description": "Triage incoming emails and draft lightning-fast, polite responses.",
    "template": "Help me achieve Inbox Zero. Here is an email I received:\n\n```\n{{email_received}}\n```\n\nGive me:\n1. **1-Sentence Summary of what they actually want.**\n2. **Action Category:** Delete, Delegate, Do (under 2 mins), or Defer.\n3. **3 Pre-written Reply Options:**\n   - **Option A (Polite Decline / Boundary):** Firm and courteous \"No\".\n   - **Option B (Fast Acceptance / Next Step):** Clear agreement and calendar link.\n   - **Option C (Clarifying Question):** Requesting necessary info."
  },
  {
    "id": "prod-smart-goals",
    "title": "SMART Goal Framework & Milestone Planner",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "goals",
      "smart-goals",
      "planning",
      "execution"
    ],
    "shortcut": "smartgoals",
    "description": "Transform vague aspirations into Specific, Measurable, Actionable, Relevant, Time-bound plans.",
    "template": "Transform this broad goal into a bulletproof SMART Goal roadmap:\n\n**Broad Goal:** {{vague_goal_e_g_grow_my_agency_or_get_in_shape}}\n**Timeframe:** {{timeframe_e_g_90_days}}\n\nDeliver:\n1. **SMART Definition Breakdown:** (Specific, Measurable, Achievable, Relevant, Time-Bound).\n2. **Lead vs Lag Measures:** What daily/weekly inputs directly influence success?\n3. **30 / 60 / 90 Day Milestones Table.**\n4. **Accountability & Tracking System.**"
  },
  {
    "id": "prod-pomodoro-session",
    "title": "Deep Work Sprint & Pomodoro Session Planner",
    "category": "Productivity",
    "subCategory": "Brainstorming & Problem Solving",
    "icon": "💡",
    "outputFormat": "Ideation Blueprint",
    "difficulty": "Standard",
    "tags": [
      "deep-work",
      "focus",
      "pomodoro",
      "study"
    ],
    "shortcut": "deepwork",
    "description": "Structure a 90-minute hyper-focused deep work sprint with clear deliverables.",
    "template": "I have a {{deep_work_duration_e_g_90_minutes}} focused deep work session.\n\n**Goal for this session:** {{session_goal}}\n\nProvide a timed breakdown:\n- **Minutes 0-5:** Setup environment, remove distractions, define exact 'Done' criteria.\n- **Sprint 1:** Core heavy-lifting block.\n- **Break Protocol:** Physical reset (no screens).\n- **Sprint 2:** Polish, review, and commit output.\n- **Closing 5 Mins:** Log progress and set bookmark for next session."
  },
  {
    "id": "prod-conflict-resolution",
    "title": "Non-Violent Communication (NVC) Script",
    "category": "Productivity",
    "subCategory": "Brainstorming & Problem Solving",
    "icon": "💡",
    "outputFormat": "Ideation Blueprint",
    "difficulty": "Standard",
    "tags": [
      "nvc",
      "conflict",
      "communication",
      "relationships"
    ],
    "shortcut": "nvc",
    "description": "Express grievances without blame using Observations, Feelings, Needs, and Requests.",
    "template": "Use Marshall Rosenberg's Nonviolent Communication (NVC) framework to address a difficult situation:\n\n**Situation / Conflict:** {{conflict_description}}\n**Person Involved:** {{person_involved}}\n\nDraft a script following:\n1. **Observation:** Concrete, non-judgmental facts (what happened without interpretation).\n2. **Feeling:** How it made me feel (without blaming).\n3. **Need:** The fundamental universal human need or business value that was impacted.\n4. **Request:** A specific, doable, positive action request."
  },
  {
    "id": "prod-brainstorming-scamper",
    "title": "SCAMPER Creative Innovation Engine",
    "category": "Productivity",
    "subCategory": "Brainstorming & Problem Solving",
    "icon": "💡",
    "outputFormat": "Ideation Blueprint",
    "difficulty": "Standard",
    "tags": [
      "scamper",
      "brainstorming",
      "creativity",
      "innovation"
    ],
    "shortcut": "scamper",
    "description": "Generate unexpected ideas using Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse.",
    "template": "Apply the SCAMPER creative framework to innovate on:\n\n**Current Product / Process:** {{subject_to_innovate}}\n\nGenerate ideas for each:\n- **S - Substitute:** What materials, steps, or audiences can we swap?\n- **C - Combine:** What can we merge or bundle with this?\n- **A - Adapt:** What idea from another industry can we adapt?\n- **M - Modify / Magnify:** What can we exaggerate, simplify, or emphasize?\n- **P - Put to Another Use:** Who else could use this in a completely different way?\n- **E - Eliminate:** What complex features or friction can we remove?\n- **R - Reverse / Rearrange:** What if we reversed the sequence or flipped the model?"
  },
  {
    "id": "prod-habit-loop-designer",
    "title": "Atomic Habits System & Habit Stacking",
    "category": "Productivity",
    "subCategory": "Brainstorming & Problem Solving",
    "icon": "💡",
    "outputFormat": "Ideation Blueprint",
    "difficulty": "Standard",
    "tags": [
      "habits",
      "atomic-habits",
      "self-improvement",
      "behavior"
    ],
    "shortcut": "habits",
    "description": "Design durable habits using James Clear's Cue, Craving, Response, Reward system.",
    "template": "Help me establish a new habit or break a bad habit using *Atomic Habits* principles:\n\n**Target Habit:** {{desired_habit_to_build_or_break}}\n\nBuild the system:\n1. **The 4 Laws of Behavior Change:**\n   - Make it Obvious (Implementation Intention & Habit Stacking formula: *After [Current Habit], I will [New Habit]*).\n   - Make it Attractive (Temptation Bundling).\n   - Make it Easy (2-Minute Rule & Environment Design).\n   - Make it Satisfying (Immediate Visual Tracking).\n2. **Identity Shift Statement:** \"I am the type of person who...\""
  },
  {
    "id": "prod-swot-analysis",
    "title": "Strategic SWOT Analysis & Action Matrix",
    "category": "Productivity",
    "subCategory": "Strategic Frameworks & Decisions",
    "icon": "🧠",
    "outputFormat": "Decision Matrix Table",
    "difficulty": "Deep Analysis",
    "tags": [
      "swot",
      "strategy",
      "business",
      "planning"
    ],
    "shortcut": "swot",
    "description": "Evaluate Strengths, Weaknesses, Opportunities, and Threats with cross-matrix strategies.",
    "template": "Conduct a strategic SWOT Analysis for:\n\n**Business / Initiative:** {{business_or_initiative}}\n\nProvide:\n1. **Strengths (Internal):** Core assets, proprietary tech, advantages.\n2. **Weaknesses (Internal):** Skill gaps, cash flow, tech debt, brand awareness.\n3. **Opportunities (External):** Market trends, regulatory changes, competitor blunders.\n4. **Threats (External):** Macro headwinds, emerging alternatives, price wars.\n5. **Cross-Strategy Matrix:**\n   - *SO Strategy (Leverage Strengths to capture Opportunities)*\n   - *WT Strategy (Defend against Weaknesses and Threats)*"
  },
  {
    "id": "persona-principal-architect",
    "title": "Principal Software Architect",
    "category": "Personas",
    "subCategory": "Technical & Security Experts",
    "icon": "🛡️",
    "outputFormat": "Technical Review",
    "difficulty": "Deep Analysis",
    "tags": [
      "persona",
      "architect",
      "engineering",
      "system-design"
    ],
    "shortcut": "p-architect",
    "description": "Adopt the persona of a battle-tested Principal Architect with 20+ years in distributed systems.",
    "template": "You are now a Principal Distributed Systems Architect with 20+ years of experience leading infrastructure at top-tier hyperscale technology companies.\n\n**Your traits:**\n- You value simplicity, fault tolerance, and operational sanity over shiny resume-driven development.\n- You think in terms of failure domains, p99 latency, CAP theorem, and long-term maintainability.\n- You challenge assumptions with data and concrete trade-offs.\n\n**My Question / Architectural Challenge:**\n{{question_or_problem}}"
  },
  {
    "id": "persona-cmo-growth",
    "title": "Chief Marketing Officer (Growth & Performance)",
    "category": "Personas",
    "subCategory": "Elite Negotiators & Coaches",
    "icon": "🎭",
    "outputFormat": "Advisory Coaching",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "cmo",
      "marketing",
      "growth"
    ],
    "shortcut": "p-cmo",
    "description": "Adopt the persona of an aggressive, data-driven CMO focused on CAC, LTV, and viral loops.",
    "template": "You are now a seasoned Chief Marketing Officer (CMO) who has scaled multiple B2B and consumer brands from $0 to $50M+ ARR.\n\n**Your traits:**\n- You care obsessively about Unit Economics (CAC, LTV, Payback Period).\n- You despise fluffy marketing jargon that doesn't convert.\n- You focus on creative testing velocity, high-intent channels, and viral retention loops.\n\n**My Marketing Challenge:**\n{{marketing_challenge}}"
  },
  {
    "id": "persona-staff-ux-designer",
    "title": "Staff Product & UX Designer",
    "category": "Personas",
    "subCategory": "Product & UX Strategists",
    "icon": "🎨",
    "outputFormat": "Product teardown & Wireframe",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "ux",
      "ui",
      "product-design"
    ],
    "shortcut": "p-ux",
    "description": "Adopt the persona of a world-class Staff UX Designer advocating for user empathy and micro-interactions.",
    "template": "You are now a Staff Product & UX Designer with deep expertise in interaction design, cognitive psychology, and design systems.\n\n**Your traits:**\n- You obsess over cognitive load, heuristic evaluation (Nielsen Norman), and accessibility.\n- You identify user friction points instantly and craft intuitive micro-interactions.\n- You advocate fiercely for the user experience while respecting business constraints.\n\n**My UX / Design Problem:**\n{{design_challenge}}"
  },
  {
    "id": "persona-cybersecurity-red-team",
    "title": "Senior Red Team Penetration Tester",
    "category": "Personas",
    "subCategory": "Technical & Security Experts",
    "icon": "🛡️",
    "outputFormat": "Technical Review",
    "difficulty": "Deep Analysis",
    "tags": [
      "persona",
      "security",
      "hacker",
      "red-team"
    ],
    "shortcut": "p-redteam",
    "description": "Adopt the persona of an ethical hacker looking for zero-days, social engineering, and exploits.",
    "template": "You are an elite Senior Red Team Penetration Tester and Ethical Hacker.\n\n**Your traits:**\n- You think like an adversary looking for misconfigurations, leaked tokens, race conditions, and bypasses.\n- You dissect code, APIs, and network topologies to find unexpected attack surfaces.\n- You provide clear proof-of-concepts and bulletproof remediation advice.\n\n**Target System / Code to Analyze:**\n```\n{{system_or_code_to_audit}}\n```"
  },
  {
    "id": "persona-data-scientist",
    "title": "Staff Machine Learning & Data Scientist",
    "category": "Personas",
    "subCategory": "Technical & Security Experts",
    "icon": "🛡️",
    "outputFormat": "Technical Review",
    "difficulty": "Deep Analysis",
    "tags": [
      "persona",
      "ml",
      "data-science",
      "ai",
      "statistics"
    ],
    "shortcut": "p-datascientist",
    "description": "Adopt the persona of an expert ML Scientist specializing in feature engineering, PyTorch, and metrics.",
    "template": "You are a Staff Machine Learning Engineer and Data Scientist with a PhD in Applied Mathematics.\n\n**Your traits:**\n- You are rigorous with statistical significance, A/B testing, data leakage, and evaluation metrics (ROC-AUC, Precision/Recall, F1).\n- You write production-ready PyTorch, Pandas, and Scikit-Learn code.\n- You know when to use a simple logistic regression vs fine-tuning a transformer.\n\n**My Data Science / ML Challenge:**\n{{data_science_problem}}"
  },
  {
    "id": "persona-venture-capitalist",
    "title": "Tier-1 Silicon Valley Venture Capitalist",
    "category": "Personas",
    "subCategory": "Elite Negotiators & Coaches",
    "icon": "🎭",
    "outputFormat": "Advisory Coaching",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "vc",
      "fundraising",
      "startups",
      "pitch"
    ],
    "shortcut": "p-vc",
    "description": "Adopt the persona of a top partner at a Tier-1 VC firm grilling your startup pitch.",
    "template": "You are a Senior Partner at a Tier-1 Silicon Valley Venture Capital fund (think Sequoia, a16z, Benchmark).\n\n**Your traits:**\n- You evaluate startups on Total Addressable Market (TAM), Defensibility / Moats, Founder-Market Fit, and Network Effects.\n- You ask brutal, piercing questions that expose weak unit economics or fake market sizes.\n- You give candid, actionable feedback on whether an idea is venture-scale.\n\n**My Startup Pitch / Deck Summary:**\n{{startup_pitch}}"
  },
  {
    "id": "persona-corporate-lawyer",
    "title": "Senior Tech Commercial & IP Counsel",
    "category": "Personas",
    "subCategory": "Legal & Financial Counsel",
    "icon": "⚖️",
    "outputFormat": "Formal Analysis",
    "difficulty": "Deep Analysis",
    "tags": [
      "persona",
      "legal",
      "contracts",
      "ip",
      "compliance"
    ],
    "shortcut": "p-lawyer",
    "description": "Adopt the persona of a seasoned tech lawyer reviewing contracts, indemnities, and IP clauses.",
    "template": "You are a Senior Commercial and Intellectual Property (IP) Technology Lawyer. (Include standard disclaimer that this is educational advice, not legal counsel).\n\n**Your traits:**\n- You spot dangerous liability caps, indemnification traps, non-competes, and IP ownership ambiguities.\n- You explain complex legal terms in plain English and suggest protective counter-clauses.\n\n**Contract Clause / Legal Question to Review:**\n```\n{{contract_text_or_question}}\n```"
  },
  {
    "id": "persona-financial-analyst",
    "title": "Wall Street Senior Financial Analyst (CFA)",
    "category": "Personas",
    "subCategory": "Legal & Financial Counsel",
    "icon": "⚖️",
    "outputFormat": "Formal Analysis",
    "difficulty": "Deep Analysis",
    "tags": [
      "persona",
      "finance",
      "cfa",
      "valuation",
      "dcf"
    ],
    "shortcut": "p-finance",
    "description": "Adopt the persona of a CFA charterholder analyzing P&L, DCF valuations, and unit metrics.",
    "template": "You are a Wall Street Senior Financial Analyst and CFA charterholder.\n\n**Your traits:**\n- You evaluate companies using DCF models, DuPont analysis, Free Cash Flow yield, and EBITDA margins.\n- You spot hidden accounting tricks, capital intensity issues, and working capital inefficiencies.\n\n**Financial Data / Company to Analyze:**\n```\n{{financial_data_or_scenario}}\n```"
  },
  {
    "id": "persona-philosopher-stoic",
    "title": "Marcus Aurelius Stoic Mentor",
    "category": "Personas",
    "subCategory": "Elite Negotiators & Coaches",
    "icon": "🎭",
    "outputFormat": "Advisory Coaching",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "stoicism",
      "philosophy",
      "wisdom",
      "mindset"
    ],
    "shortcut": "p-stoic",
    "description": "Adopt the persona of Roman Emperor Marcus Aurelius offering timeless Stoic wisdom.",
    "template": "You are Marcus Aurelius, Roman Emperor and Stoic philosopher, author of *Meditations*.\n\n**Your traits:**\n- You speak with calm gravitas, clarity, and compassionate firmness.\n- You remind me of the Dichotomy of Control (focusing only on what is within my power).\n- You frame hardships as fuel for virtue: \"The impediment to action advances action. What stands in the way becomes the way.\"\n\n**My Current Struggle or Burden:**\n{{current_struggle}}"
  },
  {
    "id": "persona-math-physics-tutor",
    "title": "Intuitive Physics & Math Professor (3Blue1Brown style)",
    "category": "Personas",
    "subCategory": "Product & UX Strategists",
    "icon": "🎨",
    "outputFormat": "Product teardown & Wireframe",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "math",
      "physics",
      "intuition",
      "education"
    ],
    "shortcut": "p-tutor",
    "description": "Adopt the persona of a master educator who explains math and physics with visual intuition.",
    "template": "You are a brilliant, passionate Math and Theoretical Physics Professor who teaches with the visual intuition and elegance of Grant Sanderson (3Blue1Brown).\n\n**Your traits:**\n- You avoid dry formulas until the geometric and physical intuition is crystal clear.\n- You use visual metaphors, spatial transformations, and \"why this matters\" storytelling.\n\n**Concept / Problem to Explain:**\n{{math_or_physics_concept}}"
  },
  {
    "id": "persona-hr-negotiator",
    "title": "Executive Compensation & Career Coach",
    "category": "Personas",
    "subCategory": "C-Suite Executive Advisory",
    "icon": "💼",
    "outputFormat": "Executive Consultation",
    "difficulty": "Deep Analysis",
    "tags": [
      "persona",
      "career",
      "salary-negotiation",
      "compensation"
    ],
    "shortcut": "p-coach",
    "description": "Adopt the persona of an executive recruiter coaching on salary, equity (RSUs/options), and promotions.",
    "template": "You are an Executive Tech Recruiter and Compensation Coach who has negotiated hundreds of VP, Director, and Senior Staff compensation packages.\n\n**Your traits:**\n- You understand equity mechanics (RSUs, ISOs vs NSOs, vesting cliffs, refreshers).\n- You coach candidates to negotiate with poise, leverage competing offers, and avoid leaving money on the table.\n\n**My Offer / Career Situation:**\n{{offer_details_or_career_question}}"
  },
  {
    "id": "persona-copy-chief",
    "title": "Legendary Direct-Response Copy Chief",
    "category": "Personas",
    "subCategory": "Elite Negotiators & Coaches",
    "icon": "🎭",
    "outputFormat": "Advisory Coaching",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "copywriting",
      "direct-response",
      "sales-letters"
    ],
    "shortcut": "p-copychief",
    "description": "Adopt the persona of Eugene Schwartz and Gary Halbert evaluating advertising copy.",
    "template": "You are a Legendary Direct-Response Copy Chief in the tradition of Eugene Schwartz, Gary Halbert, and Dan Kennedy.\n\n**Your traits:**\n- You review copy strictly on market awareness levels (Unaware -> Problem Aware -> Solution Aware -> Product Aware -> Most Aware).\n- You tear apart weak headlines, limp verbs, lack of emotional velocity, and vague benefits.\n\n**Copy to Critique:**\n```\n{{draft_copy}}\n```"
  },
  {
    "id": "persona-scrum-master",
    "title": "Agile Coach & Lean Process Master",
    "category": "Personas",
    "subCategory": "Elite Negotiators & Coaches",
    "icon": "🎭",
    "outputFormat": "Advisory Coaching",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "agile",
      "scrum",
      "kanban",
      "productivity"
    ],
    "shortcut": "p-agile",
    "description": "Adopt the persona of a pragmatic Agile Coach removing team friction and cycle-time waste.",
    "template": "You are a pragmatic, anti-dogmatic Agile Coach and Lean Process Master.\n\n**Your traits:**\n- You hate ritual for the sake of ritual; you care only about team throughput, cycle time, psychological safety, and unblocking engineers.\n- You provide actionable techniques to handle scope creep, sprint planning friction, and retrospective apathy.\n\n**Team Challenge / Retrospective Issue:**\n{{team_agile_problem}}"
  },
  {
    "id": "persona-product-manager",
    "title": "Principal Product Manager (FAANG)",
    "category": "Personas",
    "subCategory": "Product & UX Strategists",
    "icon": "🎨",
    "outputFormat": "Product teardown & Wireframe",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "product-management",
      "pm",
      "strategy",
      "roadmap"
    ],
    "shortcut": "p-pm",
    "description": "Adopt the persona of a Principal Product Manager writing PRDs and prioritizing roadmaps.",
    "template": "You are a Principal Product Manager at a tier-1 tech company with mastery of user research, telemetry, and cross-functional leadership.\n\n**Your traits:**\n- You write crisp Product Requirement Documents (PRDs) with clear user stories, acceptance criteria, and success telemetry.\n- You ruthlessly prioritize features using RICE (Reach, Impact, Confidence, Effort).\n\n**Feature Idea / PRD Need:**\n{{feature_idea_or_problem}}"
  },
  {
    "id": "persona-biotech-researcher",
    "title": "Senior Biomedical & Clinical Researcher",
    "category": "Personas",
    "subCategory": "Product & UX Strategists",
    "icon": "🎨",
    "outputFormat": "Product teardown & Wireframe",
    "difficulty": "Standard",
    "tags": [
      "persona",
      "biotech",
      "medicine",
      "clinical",
      "research"
    ],
    "shortcut": "p-biotech",
    "description": "Adopt the persona of a PhD biomedical researcher evaluating clinical trial papers and protocols.",
    "template": "You are a Senior Biomedical Researcher and Clinical Trial Investigator.\n\n**Your traits:**\n- You analyze scientific literature with strict adherence to evidence-based medicine, sample size power, p-hacking risks, and randomized double-blind standards.\n- You explain complex biological pathways and pharmacological mechanisms with clinical precision.\n\n**Research Question / Study to Analyze:**\n{{research_question_or_abstract}}"
  },

  /* ===== Client Work pack =====
   * Profile blocks are ordinary prompts the user edits once with their own
   * details. Workflow prompts pull them in with {{@shortcut}}; on Pro the
   * block text is expanded, on Free the token is inserted as written. Every
   * prompt here is free to read, edit and insert. */
  {
    "id": "client-block-brief",
    "title": "Client Brief (profile block)",
    "category": "Clients",
    "subCategory": "Profile Blocks",
    "icon": "🗂️",
    "outputFormat": "Context Block",
    "difficulty": "Standard",
    "tags": ["client", "brief", "context-block"],
    "shortcut": "client-brief",
    "description": "Who the client is, what they want and how they talk. Reused by every Client Work prompt.",
    "notes": "Edit this prompt once and replace each field with the real details, or duplicate it per client (client-acme, client-globex). Client Work prompts that include it then stop asking.",
    "template": "CLIENT BRIEF\nClient: {{client_name}}\nIndustry: {{client_industry}}\nTheir customers: {{client_audience}}\nWhat they want from this work: {{client_goals}}\nTone they like: {{client_tone}}\nThings to avoid: {{client_avoid}}"
  },
  {
    "id": "client-block-voice",
    "title": "Brand Voice (profile block)",
    "category": "Clients",
    "subCategory": "Profile Blocks",
    "icon": "🗣️",
    "outputFormat": "Context Block",
    "difficulty": "Standard",
    "tags": ["brand", "voice", "style-guide", "context-block"],
    "shortcut": "brand-voice",
    "description": "Voice, banned words and a sample, so every draft sounds like the brand.",
    "notes": "Fill this in once with a real sample of writing you like. The sample matters more than the adjectives.",
    "template": "BRAND VOICE\nVoice in three words: {{brand_voice}}\nNever use these words: {{banned_words}}\nReading level: {{reading_level}}\nA sample that sounds right:\n{{voice_example}}"
  },
  {
    "id": "client-block-offer",
    "title": "My Offer (profile block)",
    "category": "Clients",
    "subCategory": "Profile Blocks",
    "icon": "🏷️",
    "outputFormat": "Context Block",
    "difficulty": "Standard",
    "tags": ["offer", "services", "pricing", "context-block"],
    "shortcut": "my-offer",
    "description": "What you sell, what it costs and why people buy it.",
    "notes": "Used by proposals, cold emails and objection replies. Keep proof points concrete: numbers, names, results.",
    "template": "MY OFFER\nWhat I sell: {{my_service}}\nTypical price: {{price_range}}\nProof it works: {{proof_points}}\nWhat I want people to do next: {{call_to_action}}"
  },
  {
    "id": "client-block-about",
    "title": "About Me (profile block)",
    "category": "Clients",
    "subCategory": "Profile Blocks",
    "icon": "🪪",
    "outputFormat": "Context Block",
    "difficulty": "Standard",
    "tags": ["about", "bio", "profile", "context-block"],
    "shortcut": "about-me",
    "description": "Your role, experience and sign-off, for cover letters, pitches and intros.",
    "notes": "Write this once. Cover letters and cold emails read it so they never invent experience you do not have.",
    "template": "ABOUT ME\nName: {{my_name}}\nRole: {{my_role}}\nExperience: {{my_experience}}\nStrongest skills: {{my_skills}}\nLinks and sign-off: {{my_links}}"
  },
  {
    "id": "client-block-audience",
    "title": "Target Audience (profile block)",
    "category": "Clients",
    "subCategory": "Profile Blocks",
    "icon": "🎯",
    "outputFormat": "Context Block",
    "difficulty": "Standard",
    "tags": ["audience", "persona", "icp", "context-block"],
    "shortcut": "audience",
    "description": "Who you are writing for, what hurts and what they already know.",
    "notes": "Content prompts read this so posts and ads speak to one real reader instead of everyone.",
    "template": "TARGET AUDIENCE\nWho they are: {{audience_who}}\nWhat frustrates them: {{audience_pains}}\nWhy they hesitate: {{audience_objections}}\nWhat they already know: {{audience_knows}}"
  },
  {
    "id": "client-block-project",
    "title": "Project Context (profile block)",
    "category": "Clients",
    "subCategory": "Profile Blocks",
    "icon": "🧩",
    "outputFormat": "Context Block",
    "difficulty": "Standard",
    "tags": ["project", "codebase", "conventions", "context-block"],
    "shortcut": "project-context",
    "description": "Stack, conventions and repo rules, so code answers fit your project.",
    "notes": "Paste your real conventions here once. Code review, PR and triage prompts then follow them without being told.",
    "template": "PROJECT CONTEXT\nStack and versions: {{tech_stack}}\nConventions we follow: {{code_conventions}}\nRules for this repo: {{repo_rules}}"
  },
  {
    "id": "client-proposal",
    "title": "Client Proposal",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "📄",
    "outputFormat": "Proposal",
    "difficulty": "Deep Analysis",
    "tags": ["proposal", "pitch", "freelance", "agency"],
    "shortcut": "c-proposal",
    "description": "A one-page proposal built from the client brief, your offer and your voice.",
    "notes": "Why it works: the brief and offer blocks give the model real constraints, so it writes a proposal for this client instead of a generic one.",
    "template": "{{@client-brief}}\n\n{{@my-offer}}\n\n{{@brand-voice}}\n\nWrite a proposal for this project: {{project}}\nBudget: {{budget}}\nTimeline: {{timeline}}\n\nStructure it as: the problem in the client's words, my approach, what is included, timeline, price, and one clear next step. Keep it to one page. Do not invent results or credentials that are not above."
  },
  {
    "id": "client-scope",
    "title": "Scope of Work",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "📐",
    "outputFormat": "Scope Document",
    "difficulty": "Standard",
    "tags": ["scope", "sow", "contract", "freelance"],
    "shortcut": "c-scope",
    "description": "Deliverables, exclusions and acceptance criteria, so nobody argues later.",
    "notes": "The exclusions list is the part that saves you. Read it before sending.",
    "template": "{{@client-brief}}\n\nWrite a scope of work for: {{project}}\n\nInclude:\n1. Deliverables, each with a one-line acceptance criterion.\n2. What is explicitly not included.\n3. Assumptions and what I need from the client.\n4. Number of revision rounds: {{revision_rounds}}\n5. What happens if the scope changes.\n\nPlain language, numbered lists, no legal jargon."
  },
  {
    "id": "client-status",
    "title": "Weekly Client Update",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "📬",
    "outputFormat": "Status Email",
    "difficulty": "Standard",
    "tags": ["status", "update", "client-email"],
    "shortcut": "c-status",
    "description": "A short weekly update in the client's preferred tone.",
    "notes": "Paste rough bullet notes. The brief sets the tone, so the same notes read right for each client.",
    "template": "{{@client-brief}}\n\nTurn these notes into a weekly update email for the client, dated {{date}}.\n\nNotes:\n{{this_week_notes}}\n\nSections: done this week, next week, anything I need from them. Under 150 words. No filler."
  },
  {
    "id": "client-scope-creep",
    "title": "Reply to a Scope-Creep Request",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "🧱",
    "outputFormat": "Client Reply",
    "difficulty": "Standard",
    "tags": ["scope-creep", "boundaries", "client-email"],
    "shortcut": "c-scopecreep",
    "description": "Say yes to the relationship and no to free work, politely.",
    "notes": "Select the client's message on the page first and it fills in by itself.",
    "template": "{{@client-brief}}\n\n{{@my-offer}}\n\nThe client sent this request, which is outside the agreed scope:\n{{selection}}\n\nWrite a warm, firm reply that: thanks them, says it is outside the current scope, offers it as a change with a price or time estimate of {{estimate}}, and offers a smaller option. Under 120 words."
  },
  {
    "id": "client-invoice-reminder",
    "title": "Invoice Reminder",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "🧾",
    "outputFormat": "Client Reply",
    "difficulty": "Standard",
    "tags": ["invoice", "payment", "reminder", "client-email"],
    "shortcut": "c-invoice",
    "description": "A polite payment reminder that gets paid without hurting the relationship.",
    "notes": "Pick the reminder number and the tone steps up on its own.",
    "template": "{{@client-brief}}\n\nWrite an invoice reminder.\nInvoice: {{invoice_number}}\nAmount: {{amount}}\nDue date: {{due_date}}\nThis is reminder number: {{reminder_number}}\n\nFirst reminder: friendly and assume it was missed. Second: clear and direct. Third or later: firm, mention next steps, still polite. Under 90 words."
  },
  {
    "id": "client-kickoff",
    "title": "Kickoff Questions",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "🚦",
    "outputFormat": "Question List",
    "difficulty": "Standard",
    "tags": ["kickoff", "discovery", "onboarding-client"],
    "shortcut": "c-kickoff",
    "description": "The questions to ask before you start, so the project does not stall later.",
    "notes": "Use it before the first call. It skips questions the brief already answers.",
    "template": "{{@client-brief}}\n\nI am starting this project: {{project}}\n\nList the 12 questions I should ask at kickoff, grouped into goals, audience, constraints, approvals and success measures. Skip anything the brief above already answers. After each question, add one line on why it matters."
  },
  {
    "id": "client-action-items",
    "title": "Meeting Notes to Action Items",
    "category": "Clients",
    "subCategory": "Client Workflows",
    "icon": "✅",
    "outputFormat": "Action List",
    "difficulty": "Standard",
    "tags": ["meeting", "action-items", "follow-up"],
    "shortcut": "c-actions",
    "description": "Turn messy call notes into owners, dates and a follow-up email.",
    "notes": "Select the notes on the page before running it.",
    "template": "{{@client-brief}}\n\nMeeting notes:\n{{selection}}\n\n1. List every action item as: owner, task, due date. Mark unclear owners as unassigned.\n2. List decisions made.\n3. List open questions.\n4. Draft a short follow-up email to {{recipient}} that confirms all of the above."
  },
  {
    "id": "client-blog-post",
    "title": "On-Brand Blog Post",
    "category": "Clients",
    "subCategory": "On-Brand Content",
    "icon": "📰",
    "outputFormat": "Article",
    "difficulty": "Deep Analysis",
    "tags": ["blog", "content", "brand-voice"],
    "shortcut": "c-blog",
    "description": "A blog post for the client's readers, in the client's voice.",
    "notes": "Brief plus voice plus audience is what stops the draft reading like every other AI post.",
    "template": "{{@client-brief}}\n\n{{@brand-voice}}\n\n{{@audience}}\n\nWrite a blog post about: {{topic}}\nTarget length: {{word_count}} words\n\nOpen with the reader's problem, not a definition. Use subheadings, one concrete example per section, and end with a single call to action. Follow the voice rules above exactly."
  },
  {
    "id": "client-linkedin",
    "title": "On-Brand LinkedIn Post",
    "category": "Clients",
    "subCategory": "On-Brand Content",
    "icon": "💼",
    "outputFormat": "Social Post",
    "difficulty": "Standard",
    "tags": ["linkedin", "social", "brand-voice"],
    "shortcut": "c-linkedin",
    "description": "A LinkedIn post with a real hook, in the saved voice.",
    "notes": "Give it one idea, not three. The voice block keeps it from sounding like a template.",
    "template": "{{@brand-voice}}\n\n{{@audience}}\n\nWrite a LinkedIn post about this idea: {{idea}}\n\nFirst line must make the reader stop scrolling. Short paragraphs. One insight, one example, one question at the end. No hashtags in the body; add at most three at the end."
  },
  {
    "id": "client-repurpose",
    "title": "Repurpose Into Five Formats",
    "category": "Clients",
    "subCategory": "On-Brand Content",
    "icon": "♻️",
    "outputFormat": "Content Pack",
    "difficulty": "Standard",
    "tags": ["repurpose", "content", "social"],
    "shortcut": "c-repurpose",
    "description": "One piece of content turned into a thread, a post, an email, a short script and ad copy.",
    "notes": "Select the source article on the page first.",
    "template": "{{@brand-voice}}\n\n{{@audience}}\n\nSource content:\n{{selection}}\n\nRepurpose it into:\n1. A 6-post thread\n2. A LinkedIn post\n3. A short newsletter section\n4. A 45-second video script\n5. Two lines of ad copy\n\nKeep every claim from the source. Do not add facts. Main message to keep: {{main_message}}"
  },
  {
    "id": "client-ad-variants",
    "title": "Ad Variants From the Brief",
    "category": "Clients",
    "subCategory": "On-Brand Content",
    "icon": "📣",
    "outputFormat": "Ad Copy Set",
    "difficulty": "Standard",
    "tags": ["ads", "copy", "variants", "paid"],
    "shortcut": "c-ads",
    "description": "Five ad variants that each test a different angle.",
    "notes": "Each variant tests one angle, so the results tell you something.",
    "template": "{{@client-brief}}\n\n{{@audience}}\n\nWrite 5 ad variants for {{platform}} promoting: {{product}}\n\nEach variant uses a different angle: pain, outcome, proof, objection, curiosity. For each give a headline under 40 characters, primary text under 125 characters, and the angle name. No claims the brief does not support."
  },
  {
    "id": "client-on-brand-rewrite",
    "title": "Rewrite Selection in Brand Voice",
    "category": "Clients",
    "subCategory": "On-Brand Content",
    "icon": "🎨",
    "outputFormat": "Rewrite",
    "difficulty": "Quick",
    "tags": ["rewrite", "brand-voice", "editing"],
    "shortcut": "c-onbrand",
    "description": "Select any text and get it back in the saved brand voice.",
    "notes": "Works in Gmail, Docs, Slack or any chat box. Select first, then run it.",
    "template": "{{@brand-voice}}\n\nRewrite the text below in this brand voice. Keep the meaning and every fact. Keep roughly the same length unless I say otherwise: {{length_note}}\n\nText:\n{{selection}}"
  },
  {
    "id": "client-cold-email",
    "title": "Personalised Cold Email",
    "category": "Clients",
    "subCategory": "Sales & Job Hunting",
    "icon": "✉️",
    "outputFormat": "Email",
    "difficulty": "Standard",
    "tags": ["cold-email", "outreach", "sales"],
    "shortcut": "c-coldemail",
    "description": "A cold email that uses the prospect's own page and your real offer.",
    "notes": "Select a paragraph from the prospect's site or profile first. Specific beats clever.",
    "template": "{{@my-offer}}\n\n{{@about-me}}\n\nAbout the prospect (from their page):\n{{selection}}\n\nWrite a cold email to {{prospect_name}}. One line that shows I read their page, one line on the problem I solve, one proof point from my offer, and a low-effort ask. Under 90 words. Subject line under 6 words. No flattery."
  },
  {
    "id": "client-cover-letter",
    "title": "Cover Letter From a Job Post",
    "category": "Clients",
    "subCategory": "Sales & Job Hunting",
    "icon": "📝",
    "outputFormat": "Letter",
    "difficulty": "Standard",
    "tags": ["cover-letter", "job", "application"],
    "shortcut": "c-coverletter",
    "description": "A cover letter matched to the job post, using only experience you really have.",
    "notes": "Select the job description on the page first. The about-me block stops it inventing experience.",
    "template": "{{@about-me}}\n\nJob description:\n{{selection}}\n\nWrite a cover letter for the role of {{job_title}} at {{company}}. Match my real experience above to their top three requirements. Do not invent anything. Three short paragraphs, confident and plain."
  },
  {
    "id": "client-objection",
    "title": "Answer a Sales Objection",
    "category": "Clients",
    "subCategory": "Sales & Job Hunting",
    "icon": "🛡️",
    "outputFormat": "Client Reply",
    "difficulty": "Standard",
    "tags": ["objection", "sales", "negotiation"],
    "shortcut": "c-objection",
    "description": "A calm reply to the objection, using your proof points.",
    "notes": "Select the prospect's message first. It answers with your proof, not with pressure.",
    "template": "{{@my-offer}}\n\n{{@audience}}\n\nThe prospect said:\n{{selection}}\n\nWrite a reply that acknowledges the concern, answers it with one proof point from my offer, and suggests a small next step. No pressure tactics or fake urgency. Channel: {{channel}}. Under 100 words."
  },
  {
    "id": "client-support-reply",
    "title": "Customer Support Reply",
    "category": "Clients",
    "subCategory": "Support",
    "icon": "🎧",
    "outputFormat": "Support Reply",
    "difficulty": "Standard",
    "tags": ["support", "customer-service", "reply"],
    "shortcut": "c-support",
    "description": "A clear, kind support reply in the brand voice that follows your policy.",
    "notes": "Select the customer's message first. Paste the relevant policy in the field so the reply never promises what you cannot give.",
    "template": "{{@brand-voice}}\n\nCustomer message:\n{{selection}}\n\nOur policy on this:\n{{policy}}\n\nWrite a reply that: acknowledges the problem in one line, gives the answer or next step, follows the policy exactly, and ends with what happens next. Under 120 words."
  },
  {
    "id": "client-code-review",
    "title": "Code Review Against Project Rules",
    "category": "Clients",
    "subCategory": "Developer Workflows",
    "icon": "🔎",
    "outputFormat": "Review",
    "difficulty": "Deep Analysis",
    "tags": ["code-review", "conventions", "developer"],
    "shortcut": "c-review",
    "description": "A code review that checks your stack and conventions, not generic advice.",
    "notes": "Select the diff or code first. The project block is what makes the review specific.",
    "template": "{{@project-context}}\n\nReview this code:\n{{selection}}\n\nWhat it is meant to do: {{intent}}\n\nReport, in order: bugs, breaks of the conventions and rules above, security issues, then small improvements. For each, quote the line and give the fix. Say clearly if it is fine to merge."
  },
  {
    "id": "client-pr-description",
    "title": "PR Description",
    "category": "Clients",
    "subCategory": "Developer Workflows",
    "icon": "🔀",
    "outputFormat": "PR Description",
    "difficulty": "Quick",
    "tags": ["pull-request", "git", "developer"],
    "shortcut": "c-pr",
    "description": "A PR description in your repo's format from a diff or notes.",
    "notes": "Select the diff or commit list first.",
    "template": "{{@project-context}}\n\nChanges:\n{{selection}}\n\nTicket or issue: {{ticket}}\n\nWrite a PR description with: summary, why, what changed, how it was tested, and risks. Follow the repo rules above. Keep the title under 70 characters."
  },
  {
    "id": "client-bug-triage",
    "title": "Bug Triage",
    "category": "Clients",
    "subCategory": "Developer Workflows",
    "icon": "🐛",
    "outputFormat": "Triage Note",
    "difficulty": "Standard",
    "tags": ["bug", "triage", "issue", "developer"],
    "shortcut": "c-triage",
    "description": "Severity, likely cause and next step for a bug report.",
    "notes": "Select the bug report or error first.",
    "template": "{{@project-context}}\n\nBug report:\n{{selection}}\n\nWhere users see it: {{where_seen}}\n\nGive: a one-line summary, severity with a reason, the most likely cause in this stack, the files or areas to check first, and the smallest safe fix. List what extra information would confirm the cause."
  },
  {
    "id": "client-case-study",
    "title": "Client Case Study",
    "category": "Clients",
    "subCategory": "On-Brand Content",
    "icon": "🏆",
    "outputFormat": "Case Study",
    "difficulty": "Standard",
    "tags": ["case-study", "proof", "portfolio"],
    "shortcut": "c-casestudy",
    "description": "Turn a finished project into a case study you can send to the next client.",
    "notes": "Only include results you can back up. The model is told not to invent numbers.",
    "template": "{{@client-brief}}\n\n{{@my-offer}}\n\nWrite a case study for the project I finished.\nWhat I did: {{what_i_did}}\nResults, with numbers: {{results}}\nA quote from the client, if any: {{client_quote}}\n\nStructure: situation, what was tried before, what I did, results, quote. Under 400 words. Use only the facts given."
  }
];

// A top-level `const` is a global *lexical* binding, not a property of the
// global object, so every host that wants dotted access needs an explicit
// assignment: `window` for extension pages and content scripts, `self` for the
// MV3 service worker (which has no `window`), and `module.exports` for Node.
if (typeof window !== 'undefined') {
  window.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
}

if (typeof self !== 'undefined') {
  self.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
}

if (typeof globalThis !== 'undefined') {
  globalThis.DEFAULT_PROMPTS = DEFAULT_PROMPTS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_PROMPTS };
}
