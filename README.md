# Batch Queue Web

Standalone static web UI for configuring and monitoring ordered GitHub issue batch queues.

## What it does

- edits a batch queue config with repo, batch issue number, ordered issue list, first check time, and interval
- reads public GitHub issue state directly in the browser
- detects the latest dispatch signal from the batch issue
- highlights the current active issue and likely completion state
- generates the local watcher startup command for `/Users/rhuang/.codex/batch_queue/batch_queue_start.py`
- exports and imports queue config JSON

## Open locally

Open [index.html](./index.html) directly in a browser, or serve the repo with any static file server.

## Notes

- public GitHub issue monitoring works without a token, subject to GitHub rate limits
- you can optionally paste a GitHub token into the page for higher API limits; it stays in browser-local state only
- this UI does not start local watcher processes by itself; it generates the command you run on the host machine
