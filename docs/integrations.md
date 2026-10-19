# Jira and Figma

With these connected, one command does it all:

```
/kbee build SHOP-42
```

kbee reads the ticket's summary, description, acceptance criteria, comments, and linked pages and designs, then turns them into a spec that knows which of your repos are affected. Designs linked from the ticket go to the UI tasks, and the review checks the result against them.

**Nothing to install in kbee.** kbee uses the connections your coding agent already has: MCP servers, the standard way agents talk to tools like Jira and Figma. Connect the tool once in your agent, and kbee picks it up.

## What each connection adds

| Connection | `/kbee build` can then… |
|------------|-------------------------|
| **Jira** (Atlassian MCP server) | take a ticket ID or URL, read its acceptance criteria, comments and linked Confluence pages, and, after you say yes, post the PR links back on the ticket |
| **Figma** (Figma MCP server) | read linked frames, components and design tokens, guide the UI tasks, and check the built UI against the design |
| **GitHub CLI** (`gh`) | open and cross-link PRs, and read GitHub issues as the feature source |

## Without a connection

Everything still works. If kbee can't reach Jira or Figma, it says so in one line and asks you to **paste** the ticket text, or a screenshot of the design. Then it carries on as normal:

```
/kbee build "As a customer I can cancel an order while it's unpaid.
AC: cancel button on unpaid orders; paid orders can't be cancelled; status becomes 'cancelled'."
```

## Connecting them

Add the vendor's official MCP server in your agent's MCP settings, and sign in when prompted. The exact server address and sign-in steps come from Atlassian's and Figma's own docs. Search for "Atlassian MCP server" and "Figma MCP server".

| Agent | Where MCP servers are added |
|-------|-----------------------------|
| Claude Code | `claude mcp add …`, or `/mcp` to manage and sign in |
| Cursor | Settings → MCP |
| Codex | its MCP configuration (`config.toml`) |
| GitHub Copilot (VS Code) | the MCP servers setting in VS Code |

To check it's working, ask your agent "show me Jira ticket SHOP-42" before running kbee.

## What kbee does and doesn't do with your tickets

- **It reads** the ticket and its links to write the spec. The spec cites the ticket as `[source: <ticket url>]`, and `features/<slug>/status.json` records where the requirements came from.
- **It posts a comment** with the PR links and a short summary, but only after asking. The question comes together with "open these PRs?", so it's still one prompt.
- **It never changes a ticket's status** unless you ask it to, for example "…and move it to In Review".
- **It never edits Figma files.** It only reads them.
