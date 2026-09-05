<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend Design Skill - Mandatory

For any task that creates, modifies, redesigns, reviews, or refactors frontend UI/UX, including pages, layouts, components, responsive behavior, visual styling, Tailwind CSS, animations, typography, spacing, product/store UI, or admin dashboard UI:

1. Read `.agents/skills/taste-skill/SKILL.md` before designing or modifying the UI.
2. Apply the Taste Skill principles throughout the frontend work.
3. Treat this as mandatory for frontend/UI tasks, not optional guidance.
4. Existing project requirements always have higher priority: business rules, existing architecture, existing design tokens, `globals.css`, established components, accessibility, performance, responsive behavior, and existing dependencies.
5. Taste Skill is a design-quality layer. It must not cause unnecessary architectural rewrites or unrelated changes.
6. Never add a new frontend dependency only because Taste Skill mentions or recommends it. Inspect `package.json` and the existing implementation first.
7. Reuse and improve existing components before creating duplicate abstractions.
8. Do not apply Taste Skill to backend-only, database-only, Prisma-only, API-only, authentication-only, or infrastructure-only tasks unless there is an actual frontend/UI part involved.
9. Reading this skill is the first frontend-specific step after reading the project instructions.

Required workflow:

```text
Frontend task
    ↓
Read project AGENTS.md
    ↓
Read .agents/skills/taste-skill/SKILL.md
    ↓
Inspect existing frontend/design system
    ↓
Plan smallest coherent UI change
    ↓
Implement
    ↓
Validate responsive behavior, accessibility, performance and consistency
```
