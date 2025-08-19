# Web Intake → GitHub Project (Single Project, Two Views)

This guide shows how to accept submissions from a website form and create GitHub Issues that land on your Project board with Status=Planned (your Backlog), using a repository_dispatch workflow.

## What we added

- Workflow: `.github/workflows/web-intake.yml`
  - Listens for `repository_dispatch` with `event_type: web-intake.create`
  - Creates an Issue with labels (defaults to `intake`)
  - Adds Issue to your User Project and sets Status=Planned

## Prerequisites

- Secret `PROJECT_TOKEN` in this repo (Settings → Secrets and variables → Actions)
  - Use a classic PAT or a GitHub App token with:
    - repo (to create issues)
    - project (to update Projects v2 via GraphQL)
- Your Project is at: `https://github.com/users/buildingwithai/projects/1`
- Project has a `Status` single-select field with an option named "Planned" (case-insensitive)

## Triggering from your website

Call the GitHub REST API `repository_dispatch` endpoint from your backend (serverless or server):

```bash
curl -X POST \
  -H "Authorization: token <YOUR_BACKEND_PAT_OR_APP_TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/buildingwithai/project-clippy/dispatches \
  -d '{
    "event_type": "web-intake.create",
    "client_payload": {
      "title": "Feature idea: Smart Snippet Suggestions",
      "body": "Submitted from web form. Problem/Value...",
      "labels": ["intake"]
    }
  }'
```

Notes:
- The token used to call `repository_dispatch` can be a fine-grained PAT or a GitHub App token with `repo:public_repo` (for public) or `repo` (private). It only needs to trigger the event. The workflow itself uses `PROJECT_TOKEN` to create the Issue and update the Project.

## Example: Vercel Serverless (Node/TypeScript)

```ts
// /api/submit-idea.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { title, description, labels } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description are required' });

  const ghToken = process.env.GH_WEBHOOK_TOKEN; // minimal token; only to call repository_dispatch
  if (!ghToken) return res.status(500).json({ error: 'GH_WEBHOOK_TOKEN not configured' });

  const payload = {
    event_type: 'web-intake.create',
    client_payload: {
      title,
      body: description,
      labels: Array.isArray(labels) && labels.length ? labels : ['intake'],
    },
  };

  const resp = await fetch('https://api.github.com/repos/buildingwithai/project-clippy/dispatches', {
    method: 'POST',
    headers: {
      'Authorization': `token ${ghToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return res.status(resp.status).json({ error: 'dispatch failed', details: text });
  }

  return res.status(202).json({ ok: true });
}
```

Environment variables:
- `GH_WEBHOOK_TOKEN`: minimal token to call `repository_dispatch` (keep separate from `PROJECT_TOKEN`)

## Creating the two views (GitHub UI)

- Research View (filter by labels for now):
  - Filter: `label:intake OR label:research OR label:spec`
  - Columns (board): Intake/Ideas, Research, Spec

- Delivery View (based on Status):
  - Filter: `Status: Planned, In Progress, In Review, Done`
  - Columns: Planned (Backlog), In Progress, In Review, Done

Tip: Keep a single Status field. Later, if you add Status options for Intake/Ideas/Research/Spec, update the Research View filter to use Status instead of labels.
