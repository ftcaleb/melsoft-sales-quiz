# Sending quiz results to Google Sheets

Every completed quiz posts one row to this spreadsheet:

https://docs.google.com/spreadsheets/d/1_26wQ6Q9qd939h_u__KQJ33kcFeuZXL0gHkBMRd--1A/edit

The quiz page talks to an Apps Script Web App, which does the writing. Follow the steps below once; after that it runs itself.

---

## 1. Open the Apps Script editor

1. Open the spreadsheet linked above.
2. **Extensions → Apps Script.**
3. A tab opens with a file called `Code.gs` containing an empty `myFunction()`.

## 2. Paste in the code

1. Select everything in `Code.gs` and delete it.
2. Open `apps-script/Code.gs` from this repo, copy the whole file, paste it in.
3. **Ctrl+S** to save. Name the project something like `Melsoft Quiz Endpoint`.

`SPREADSHEET_ID` at the top is already set to the sheet above — only change it if you switch to a different spreadsheet.

## 3. Grant permissions

1. In the function dropdown at the top of the editor, pick **`testConnection`**.
2. Click **Run**.
3. Google shows **"Authorization required" → Review permissions**.
4. Pick your Google account.
5. You will likely see **"Google hasn't verified this app"** — this is expected for your own script. Click **Advanced → Go to Melsoft Quiz Endpoint (unsafe)**.
6. Click **Allow**.
7. The execution log should print `Connected to: ... / Responses`, and a **Responses** tab appears in the spreadsheet.

## 4. Deploy as a Web App

1. Top right: **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `Melsoft quiz v1`
   - **Execute as:** **Me (your@email.com)**
   - **Who has access:** **Anyone**  ← must be "Anyone", not "Anyone with Google account". Candidates are not signed in.
4. Click **Deploy**.
5. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb...../exec`

**It must end in `/exec`.** The `/dev` URL only works while you are logged in and will silently drop candidate submissions.

## 5. Check the deployment is live

Paste the `/exec` URL into a browser tab. You should see:

```json
{"status":"ok","message":"Melsoft quiz endpoint is live. Submissions must be POSTed."}
```

If you get a login screen or an error page, redo step 4 — "Who has access" is almost always the culprit.

## 6. Wire it into the quiz

In `index.html`, find:

```js
const SHEET_WEBAPP_URL = 'your_web_app_url';
```

Replace the placeholder with your `/exec` URL:

```js
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycb...../exec';
```

Save, commit, push, and redeploy the page to your host.

## 7. Test end to end

1. Open the hosted quiz (not `file://` — it must be served over HTTP/HTTPS).
2. Enter a name like `TEST — ignore`, tick the box, begin.
3. Answer a few questions, then click through to the end. (Fastest full test: answer all 52 quickly; there is no early-submit button.)
4. Check the **Responses** tab — a new row should be there within a second or two.
5. Delete the test row when you're happy.

---

## What lands in the sheet

One row per submission:

| Column | Contents |
|---|---|
| Submitted At | Timestamp the quiz was finished |
| Candidate Name | As typed on the start screen |
| Quiz Date | The date field on the start screen |
| Result | `PASSED` / `FAILED` |
| Score / Out Of / Percentage | e.g. `44`, `52`, `85` |
| Pass Threshold | `42` |
| Questions Answered | Useful when the timer ran out |
| Time Taken | e.g. `31m 12s` |
| Timed Out | `YES` / `NO` |
| Section 1–4 | Per-section scores |
| Wrong Questions | Comma-separated question numbers |
| Q1 … Q52 | The letter the candidate chose, `-` if unanswered |

The header row is written automatically on the first submission and frozen.

---

## Notes and gotchas

- **Changing `Code.gs` later:** edits do **not** go live automatically. Go to **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same.
- **Creating a *new* deployment instead** gives you a *new* URL and the old one keeps running the old code — always edit the existing deployment.
- **No confirmation to the candidate.** The browser sends the row with `mode: 'no-cors'`, so the page cannot read the response. This is a deliberate trade-off: it avoids the CORS preflight that Apps Script can't answer. The quiz never blocks or errors on a failed write.
- **Consequence of the above:** if the endpoint is misconfigured, submissions are lost silently. Do step 5 and step 7 properly.
- **Anyone who has the page can post to the endpoint.** It's a public URL with no auth, so a row in the sheet is not proof of identity. Fine for onboarding; don't treat it as tamper-proof.
- **EmailJS is separate.** The sheet write and the results email are independent — configuring one does not require the other.
- **Quotas:** Apps Script allows ~20,000 URL-triggered executions/day on a free account. Not a concern at onboarding volume.
