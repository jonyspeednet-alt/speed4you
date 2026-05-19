# Contributing to Speed4You - ISP Entertainment Portal

## Table of Contents

- [Welcome](#welcome)
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

---

## Welcome

First of all, thank you for considering contributing to **Speed4You**! We truly appreciate the time and effort you are willing to invest in making this project better. Speed4You is an ISP Entertainment Portal designed to deliver a seamless streaming and media browsing experience for internet service provider subscribers. The platform allows users to browse, search, and watch movies, TV series, and live TV channels, while giving administrators powerful tools to manage the content library, scan media files, and monitor the system.

Whether you are fixing a bug, adding a new feature, improving documentation, or simply suggesting an enhancement, your contribution matters. We believe that great open-source projects are built by diverse communities of developers, designers, testers, and writers working together. Every contribution, no matter how small, helps us deliver a better experience to the ISPs and end-users who rely on Speed4You every day. We are committed to providing a welcoming, inclusive, and supportive environment for all contributors. If you have any questions or need guidance, do not hesitate to reach out through GitHub Issues or Discussions — we are here to help you succeed.

---

## Code of Conduct

This project and everyone participating in it is governed by the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/), a widely adopted standard for open-source communities. By participating, you are expected to uphold this code and treat every community member with respect and professionalism. Please take a moment to read the full text of the Contributor Covenant so you understand the standards of behavior we expect from all contributors.

In summary, we expect all participants to be inclusive, respectful, and constructive in their interactions. Harassment, discriminatory language, personal attacks, trolling, and any other form of hostile behavior will not be tolerated under any circumstances. We want the Speed4You community to be a place where people feel safe to ask questions, share ideas, make mistakes, and learn from one another. If you experience or witness unacceptable behavior, please report it immediately by opening a confidential issue or contacting a maintainer directly. All reports will be reviewed and investigated promptly and fairly, and we will take appropriate action to address any violations. Together, we can maintain a positive and productive community.

---

## How to Contribute

There are many ways to contribute to Speed4You, and we welcome all forms of participation. The most common ways to contribute include submitting bug reports, requesting new features, writing code, improving documentation, and reviewing pull requests from other contributors. Regardless of how you choose to contribute, the first step is to check the existing issues on our GitHub repository to see if someone has already reported the bug or requested the feature you have in mind. Duplicating issues creates noise and makes it harder for maintainers to prioritize work, so searching first is always a good practice.

**Bug Reports:** If you find a bug, please open a detailed issue using the bug report template provided below. Include as much context as possible — steps to reproduce, expected behavior, actual behavior, browser or server logs, screenshots, and your environment details. The more information you provide, the faster we can diagnose and fix the problem. Vague reports like "it doesn't work" are difficult to act on, so please be thorough.

**Feature Requests:** If you have an idea for a new feature or an improvement to an existing one, open a feature request issue using the template below. Explain the problem you are trying to solve, describe your proposed solution, and consider any alternative approaches you have thought about. Feature requests that include use cases and user stories tend to receive more attention and are more likely to be implemented.

**Pull Requests:** If you want to contribute code, please fork the repository, create a feature branch, make your changes, and submit a pull request. Make sure your PR addresses a specific issue, follows our coding standards, includes appropriate tests, and does not introduce regressions. Detailed instructions for the PR process are provided later in this document.

---

## Development Setup

Setting up the Speed4You development environment is straightforward, but there are a few prerequisites you need to have installed before you begin. Please follow the steps below carefully to ensure everything works correctly on your machine.

### Prerequisites

Before cloning the repository, make sure you have the following software installed on your system:

- **Node.js** (v18 or later) — We recommend using the latest LTS version of Node.js for the best compatibility. You can check your current version by running `node --version` in your terminal.
- **npm** (v9 or later) — npm comes bundled with Node.js, but you may need to update it. Verify with `npm --version`.
- **PostgreSQL** (v14 or later) — The backend uses PostgreSQL as its primary database. Make sure the PostgreSQL server is running and accessible. You will need to create a database for the project and configure the connection string in your environment variables.
- **Git** — Required for cloning the repository and managing branches.

### Installation

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/speed4you.git
   cd speed4you
   ```

2. **Install all dependencies** (frontend and backend in one command):
   ```bash
   npm run install:all
   ```
   This script runs `npm install` in both the `frontend` and `backend` directories, ensuring all packages are ready for development.

3. **Configure environment variables:**
   - Create a `.env` file in the `backend/` directory based on the required environment variables for database connection, JWT ***REMOVED***, and other configuration options. Refer to the backend configuration module at `backend/src/config/` for the complete list of expected variables.
   - Create a `.env` file in the `frontend/` directory if the frontend requires any environment-specific settings, such as the API base URL.

4. **Initialize the database:**
   ```bash
   cd backend
   npm run db:init
   ```
   This runs the database initialization script that sets up the required tables and schema.

### Running the Development Servers

Start both the frontend and backend development servers simultaneously:

```bash
npm run dev
```

This will launch:
- **Frontend** (Vite dev server) at `http://localhost:4173` — Supports hot module replacement for instant feedback during development.
- **Backend** (Express with Nodemon) at `http://localhost:3001` — Automatically restarts when server files change.

You can also run the servers individually if you prefer:
- Frontend only: `cd frontend && npm run dev`
- Backend only: `cd backend && npm run dev`

---

## Project Structure

Speed4You follows a monorepo-style layout with clearly separated frontend and backend directories, each with its own package configuration and dependency tree. Understanding the project structure will help you navigate the codebase efficiently and know where to place new files or make changes.

### Root Directory

The root directory contains workspace-level configuration, shared scripts, and documentation. The `package.json` at the root defines convenience scripts such as `install:all`, `dev`, `build`, and `start` that operate across both sub-projects. The `scripts/` directory houses deployment, setup, and development runner utilities. The `docs/` directory contains comprehensive project documentation including deployment guides, API references, and implementation summaries.

### Frontend (`frontend/`)

The frontend is built with React 18 and Vite, using TanStack React Query for server state management, Framer Motion for animations, and React Router v6 for client-side routing.

```
frontend/
├── public/                  # Static assets (icons, manifest, service worker, SVGs)
├── src/
│   ├── app/                 # Router configuration
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (Button, Input, Modal, Toast, etc.)
│   │   ├── media/           # Media-specific components (PosterImage, BannerImage, PlayButton)
│   │   ├── navigation/      # Navigation components (TopNav, MobileNav, GlobalSearchModal)
│   │   ├── forms/           # Form components (FilterBar, SearchInput, SelectField)
│   │   ├── feedback/        # Feedback states (ErrorBoundary, LoadingState, EmptyState, Skeleton)
│   │   └── overlays/       # Overlays (ConfirmDialog, InfoModal)
│   ├── features/
│   │   ├── home/            # Home page feature (HeroCarousel, ContentRail, TrendingBento)
│   │   └── continueWatching/ # Continue watching feature
│   ├── hooks/               # Custom React hooks
│   ├── layouts/             # Layout components (MainSiteLayout, AdminLayout)
│   ├── pages/               # Page-level components (HomePage, BrowsePage, PlayerPage, etc.)
│   │   └── admin/           # Admin pages (AdminDashboard, AddContentPage, ContentLibraryPage)
│   ├── services/            # API service layer (apiClient, contentService, moviesService, etc.)
│   ├── styles/              # Global CSS styles
│   └── constants/           # Application constants
├── vite.config.js           # Vite configuration
└── eslint.config.js         # ESLint configuration
```

### Backend (`backend/`)

The backend is built with Express 4 and PostgreSQL, using Joi for validation, JWT for authentication, and Helmet for security headers.

```
backend/
├── src/
│   ├── routes/              # Express route handlers (auth, content, movies, series, tv, player, etc.)
│   ├── controllers/         # Route controllers (adminController, etc.)
│   ├── data/
│   │   └── store/           # Data access layer (base, content, user, scanner, admin, helpers)
│   ├── services/            # Business logic (scanner, metadata-enricher, player-media, etc.)
│   ├── middleware/           # Express middleware (validate, require-admin-auth, resolve-user-id)
│   ├── config/              # Configuration modules (database, auth, player-cache, env-check)
│   ├── utils/               # Utilities (logger, validation-schemas, error, assetHelper)
│   └── db/                  # Database initialization SQL
├── migrations/              # SQL migration files
├── tests/                   # Test files
└── scripts/                 # Utility scripts (seed data, media analysis, cache management)
```

---

## Coding Standards

Maintaining a consistent codebase is essential for readability, maintainability, and collaboration. All contributors are expected to follow the standards outlined below. If you are unsure about something, look at the existing code for examples or ask in a GitHub Issue.

### JavaScript Style

- Use **ES modules** (`import`/`export`) in the frontend (Vite handles module resolution). The backend uses **CommonJS** (`require`/`module.exports`) as specified by the `"type": "commonjs"` setting.
- Use `const` for variables that never change and `let` for variables that do. Never use `var`.
- Prefer arrow functions for callbacks and short utility functions, but use regular function declarations for named functions that serve as components or module-level helpers.
- Use template literals for string interpolation rather than string concatenation.
- Avoid deeply nested callbacks. Use async/await for asynchronous operations in the backend.
- Keep functions small and focused. Each function should do one thing well.
- Use meaningful variable and function names. Avoid single-letter names except for simple loop counters (`i`, `j`).
- Remove all console.log statements before committing, or use the project's logger utility (`backend/src/utils/logger.js`) for server-side logging.

### React Component Patterns

- One component per file. The file name should match the component name in PascalCase (e.g., `HeroCarousel.jsx` exports `HeroCarousel`).
- Use functional components with hooks exclusively. Do not use class components.
- Place custom hooks in the `hooks/` directory and name them with the `use` prefix (e.g., `useCarouselConfig.js`).
- Use the service layer (`services/`) for all API calls. Components should never make raw `fetch` or `axios` calls directly.
- Use TanStack React Query for data fetching and caching. Define query keys consistently and use the provided service functions as query functions.
- Destructure props at the function signature level for clarity.
- Use Framer Motion for animations rather than custom CSS animations or third-party animation libraries.
- Keep component state minimal. Derive computed values where possible instead of storing redundant state.

### Naming Conventions

- **Components:** PascalCase (e.g., `ContentRail`, `SearchInput`)
- **Hooks:** camelCase with `use` prefix (e.g., `useCarouselConfig`, `useTVMode`)
- **Utility functions:** camelCase (e.g., `formatDuration`, `parseMetadata`)
- **Constants:** UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRY_COUNT`), camelCase for configuration objects
- **CSS classes:** Use lowercase with hyphens or CSS Modules (e.g., `ContinueWatchingRail.module.css`)
- **Files and directories:** PascalCase for component files, camelCase for utility and service files
- **Environment variables:** UPPER_SNAKE_CASE with descriptive prefixes (e.g., `DB_HOST`, `JWT_SECRET`)

---

## Commit Messages

We follow the **Conventional Commits** specification for all commit messages. This standard makes the commit history easy to read, enables automatic changelog generation, and helps maintainers quickly understand the nature of each change. Every commit message you write should conform to the following format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                                        |
|------------|--------------------------------------------------------------------|
| `feat`     | A new feature for the user or a significant enhancement             |
| `fix`      | A bug fix that resolves an existing issue                           |
| `docs`     | Documentation-only changes (README, guides, code comments)          |
| `style`    | Code style changes (formatting, whitespace, semicolons) — no logic  |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature       |
| `perf`     | Performance improvements                                             |
| `test`     | Adding or updating tests                                             |
| `chore`    | Build process, tooling, dependency updates, CI configuration         |
| `ci`       | Continuous integration changes                                       |

### Scopes

The scope indicates which part of the project is affected. Common scopes include:

- `frontend` — Changes to the React frontend
- `backend` — Changes to the Express backend
- `api` — API endpoint modifications
- `db` — Database schema or migration changes
- `ui` — UI component changes
- `auth` — Authentication-related changes
- `scanner` — Media scanner service changes
- `player` — Video player related changes
- `docs` — Documentation updates

### Examples

```
feat(frontend): add watchlist sorting options
fix(backend): resolve duplicate session token issue on login
docs(api): update content endpoint parameter descriptions
refactor(scanner): extract series parser into dedicated module
test(backend): add validation tests for admin auth middleware
chore(deps): upgrade express to v4.22 and pg to v8.11
```

### Guidelines

- Use the imperative mood in the subject line (e.g., "add feature" not "added feature" or "adds feature").
- Keep the subject line under 72 characters for readability in terminal and git log views.
- Use the optional body to explain the "why" behind the change, not the "what" — the diff already shows what changed.
- Reference related issue numbers in the footer (e.g., `Closes #42` or `Refs #108`).
- Break large changes into multiple small, logical commits rather than one massive commit.

---

## Pull Request Process

We appreciate every pull request and want to make the review process as smooth as possible for both contributors and maintainers. Following the process outlined below will help ensure your PR is reviewed promptly and merged without unnecessary delays. A great pull request is focused, well-documented, and tested. Before opening a PR, make sure your changes are complete, your branch is up to date with `main`, and you have run all relevant linters and tests locally. Small, focused PRs are much easier to review than large ones that touch many files across different areas of the codebase. If your change is large, consider breaking it into a series of smaller, logically independent PRs that can be reviewed and merged incrementally.

### Branch Naming

When you start working on a change, create a new branch from `main` with a descriptive name that follows this convention:

- **Feature branches:** `feat/short-description` (e.g., `feat/watchlist-sorting`)
- **Bug fix branches:** `fix/short-description` (e.g., `fix/player-buffer-overflow`)
- **Documentation branches:** `docs/short-description` (e.g., `docs/api-reference-update`)
- **Refactor branches:** `refactor/short-description` (e.g., `refactor/scanner-series-parser`)

Avoid using generic branch names like `patch`, `update`, or `my-branch`, as they make it difficult to identify the purpose of the change at a glance.

### PR Template

When you open a pull request, please fill out the following template. A well-structured PR description helps reviewers understand your changes quickly and thoroughly.

```markdown
## Description
[Provide a clear and concise description of what this PR does. Explain the problem it solves or the feature it adds.]

## Related Issue
[Closes #issue_number or "N/A"]

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## How Has This Been Tested?
[Describe the tests you ran to verify your changes. Include relevant details about test environment, test cases, and any manual testing performed.]

## Screenshots (if applicable)
[Add screenshots to help explain your changes, especially for UI modifications.]

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Self-review:** Before requesting a review, review your own PR diff carefully. Look for leftover debug code, commented-out code, typos, and missing tests.
2. **Automated checks:** Ensure all CI checks pass. If any check fails, address the issues before requesting a review.
3. **Maintainer review:** At least one project maintainer must approve your PR before it can be merged. The reviewer will check for code quality, adherence to standards, test coverage, and overall design.
4. **Address feedback:** If the reviewer requests changes, address them promptly and push new commits to the same branch. Avoid force-pushing during the review process, as it can make it difficult to track what changed.
5. **Merge:** Once approved and all checks pass, a maintainer will merge your PR. We typically use squash merges to keep the main branch history clean.

---

## Testing

Testing is a critical part of maintaining the quality and reliability of Speed4You. We expect all contributors to write tests for new features and bug fixes, and to ensure that existing tests continue to pass with their changes. A pull request that introduces untested code will be asked to add appropriate test coverage before it can be merged.

### Running Tests

**Backend tests:**
```bash
cd backend
npm test
```
The backend uses the Node.js built-in test runner (`node --test`). Test files are located in the `backend/tests/` directory and follow the naming convention `*.test.js`. The test suite covers validation logic, authentication middleware, scanner classification, metadata enrichment, and player strategy selection.

**Frontend linting:**
```bash
cd frontend
npm run lint
```
The frontend uses ESLint with plugins for React, React Hooks, and React Refresh to catch common mistakes and enforce consistent code style. While we do not yet have a full frontend test suite, we strongly encourage contributors to add tests when introducing new components or logic.

### What to Test

- **Bug fixes:** Every bug fix should include a test that reproduces the original bug and verifies the fix. This prevents regressions from occurring in the future.
- **New API endpoints:** Add tests that verify the endpoint returns the correct status codes, response shapes, and error handling for invalid inputs. Use the project's validation schemas (`backend/src/utils/validation-schemas.js`) as a reference for what inputs to test.
- **Middleware:** Test middleware functions independently by mocking request and response objects. Verify that the middleware correctly handles both valid and invalid scenarios (e.g., `require-admin-auth` should reject requests without valid tokens).
- **Data store methods:** Test data access functions to ensure they construct the correct queries and handle edge cases such as empty results or duplicate entries.
- **React components:** When adding tests for React components, focus on user-visible behavior rather than implementation details. Test that components render correctly, respond to user interactions, and display appropriate states (loading, error, empty).
- **Utility functions:** Test pure utility functions with a variety of inputs, including edge cases and boundary values.

### Test Best Practices

- Write deterministic tests that produce the same result every time they are run. Avoid relying on external services or shared state.
- Keep tests independent. One test should not depend on the outcome of another test.
- Use descriptive test names that explain the expected behavior. A reader should understand what a test verifies from its name alone.
- Arrange-Act-Assert: Structure your tests clearly with setup, execution, and verification phases.

---

## Documentation

Clear and accurate documentation is just as important as well-written code. Good documentation helps new contributors get up to speed, enables users to understand the system, and ensures that institutional knowledge is preserved. We encourage all contributors to update documentation as part of their contributions whenever applicable.

### When to Update Documentation

You should update or add documentation when you:

- Add a new feature or change existing functionality that affects how users or developers interact with the system.
- Modify API endpoints, including changing request/response formats, adding new parameters, or deprecating existing ones.
- Introduce new configuration options, environment variables, or deployment steps.
- Change the project structure, add new dependencies, or modify build scripts.
- Fix a bug whose root cause was unclear from the existing documentation.

### Documentation Locations

- **Root-level README:** The main `README.md` provides an overview of the project, quick-start instructions, and links to detailed documentation. Update this file when making changes that affect the project overview or setup process.
- **`docs/` directory:** Contains detailed guides and references such as the API Reference, Deployment Guide, Backend Upgrade Guide, and visual design documentation. Add new documents here when introducing significant features or architectural changes.
- **Inline code comments:** Add comments to explain complex logic, non-obvious decisions, or workarounds. Do not add comments that merely restate what the code does — focus on the "why" rather than the "what."
- **JSDoc comments:** Use JSDoc annotations for exported functions and modules, especially in the service layer and utility modules. This helps IDEs provide better autocompletion and makes the API surface clearer.
- **Feature guides:** For major features (such as the Hero Carousel or TV Mode), maintain dedicated markdown files within the feature directory (e.g., `frontend/src/features/home/HERO_CAROUSEL_GUIDE.md`).

### Documentation Style Guide

- Write in clear, concise English. Use short sentences and avoid jargon when simpler terms will do.
- Use present tense and imperative mood for instructions (e.g., "Run `npm run dev`" not "You should run `npm run dev`").
- Include code examples for all configuration options and API endpoints. Examples should be complete and runnable, not partial snippets.
- Use relative links for internal references and absolute URLs for external resources.
- Keep tables and lists properly formatted in Markdown. Use consistent header levels and avoid skipping levels.
- Proofread your documentation before submitting. Typos and grammatical errors reduce credibility and can cause confusion.

---

## Reporting Bugs

Bug reports are invaluable for maintaining the quality of Speed4You. A well-written bug report helps maintainers reproduce the issue quickly, understand its impact, and deliver a fix. Before submitting a bug report, please search the existing issues to make sure the problem has not already been reported. If you find an open issue that matches your problem, consider adding a comment with any additional information you can provide rather than opening a duplicate. Effective bug reports save time for everyone — they reduce back-and-forth questions, prevent maintainers from spending time on issues that cannot be reproduced, and ultimately lead to faster resolutions. Even if you are not sure whether something is a bug or intended behavior, filing a report is the right thing to do. Maintainers can always close the issue if it turns out to be working as designed, but a real bug that goes unreported may affect many users for a long time.

### Bug Report Template

When opening a bug report, please use the following template and fill in every section as thoroughly as possible:

```markdown
## Bug Report

### Description
[Provide a clear and concise description of the bug. What went wrong? What did you expect to happen instead?]

### Steps to Reproduce
1. [First step — be specific about navigation, clicks, input values]
2. [Second step]
3. [Third step]
4. [Observe the error or unexpected behavior]

### Expected Behavior
[Describe what you expected to happen when following the steps above.]

### Actual Behavior
[Describe what actually happened. Include any error messages, unexpected UI states, or incorrect data.]

### Environment
- **OS:** [e.g., Windows 11, macOS 14.2, Ubuntu 22.04]
- **Browser:** [e.g., Chrome 121, Firefox 122, Safari 17]
- **Node.js version:** [e.g., v20.11.0]
- **Project version/branch:** [e.g., main at commit abc1234]

### Screenshots / Logs
[Attach screenshots, screen recordings, or relevant log output that illustrates the problem. For backend issues, include server logs with any error stack traces.]

### Additional Context
[Add any other context about the problem here. For example: Does the issue occur consistently or intermittently? Does it only happen with specific content types? Have you found a workaround?]

### Possible Solution (Optional)
[If you have investigated the issue and have an idea of what might be causing it or how to fix it, share your thoughts here. This is entirely optional but greatly appreciated.]
```

### Tips for Effective Bug Reports

- Reproduce the bug on the latest version of the `main` branch before reporting. The issue may already be fixed.
- Isolate the problem. If possible, identify the smallest set of steps that reliably trigger the bug.
- Include browser console errors for frontend issues and server logs for backend issues. Redact any sensitive information such as ***REMOVED***s or tokens before sharing.
- If the bug involves the database, describe the state of the data that triggers the issue (e.g., "occurs when a series has more than 100 episodes").
- Label your issue appropriately using GitHub labels if you have the permissions, or mention the expected label in the issue body.

---

## Feature Requests

We welcome feature requests from the community. Whether you are an ISP operator who needs a specific capability, a developer who wants to extend the platform, or an end-user with an idea for improvement, your input helps shape the future of Speed4You. Before submitting a feature request, please search existing issues and discussions to see if the idea has already been proposed. If it has, consider adding your perspective as a comment rather than opening a new issue. Feature requests that are well-reasoned and include clear problem statements are far more likely to be prioritized than vague suggestions. When describing a feature, focus on the problem it solves rather than only the solution you have in mind. This gives maintainers the context needed to evaluate whether the proposed approach is the best fit, or whether there might be a simpler or more effective alternative that achieves the same goal.

### Feature Request Template

When opening a feature request, please use the following template:

```markdown
## Feature Request

### Problem Statement
[Describe the problem or limitation you are facing. What are you trying to accomplish that Speed4You does not currently support? Why is this important?]

### Proposed Solution
[Describe your proposed solution in detail. How should the feature work? What would the user experience look like? How would it integrate with existing functionality?]

### Alternatives Considered
[Describe any alternative solutions or features you have considered. Why did you decide they would not work as well? This helps us understand the trade-offs involved.]

### Use Cases
[Provide specific use cases or user stories that illustrate the value of this feature. For example: "As an ISP admin, I want to schedule content updates during off-peak hours so that my users experience less downtime."]

### Additional Context
[Add any other context, screenshots, mockups, or references that help explain the feature request. Links to similar features in other projects are also helpful.]

### Would You Be Willing to Implement This?
- [ ] Yes, I would like to submit a PR for this feature
- [ ] I might need some guidance, but I am interested
- [ ] No, I am just suggesting the idea
```

### What Makes a Great Feature Request

The best feature requests clearly articulate the problem they solve rather than jumping straight to a proposed solution. Understanding the underlying need helps maintainers evaluate whether the suggested approach is the right one, or whether there might be a simpler or more effective way to achieve the same goal. Feature requests that include real-world use cases, user stories, and examples of how other platforms solve similar problems tend to receive more thoughtful consideration and are more likely to be prioritized for implementation.

Please be patient after submitting a feature request. Maintainers review requests on a rolling basis and must balance new features against bug fixes, technical debt, and the overall project roadmap. Even if a feature is not implemented immediately, well-documented requests remain valuable as a reference for future development. If you are willing to implement the feature yourself, let us know — we are always happy to guide contributors through the process and review pull requests.

---

Thank you for taking the time to read this guide and for your interest in contributing to Speed4You. Your contributions make this project better for everyone. Happy coding!
