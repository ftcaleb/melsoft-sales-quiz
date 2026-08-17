/**
 * ============================================================
 * MELSOFT ACADEMY — BDM SALES QUIZ
 * Google Apps Script endpoint: writes one row per submission
 * ============================================================
 *
 * Paste this whole file into the Apps Script editor attached to
 * the results spreadsheet (Extensions -> Apps Script), then
 * deploy it as a Web App. Full step-by-step instructions are in
 * APPS_SCRIPT_SETUP.md next to this file.
 *
 * The quiz page posts JSON as Content-Type: text/plain so the
 * browser treats it as a "simple" CORS request and skips the
 * preflight OPTIONS call, which Apps Script cannot answer.
 */

// The spreadsheet that collects results.
var SPREADSHEET_ID = '1_26wQ6Q9qd939h_u__KQJ33kcFeuZXL0gHkBMRd--1A';

// The tab inside that spreadsheet. Created automatically if missing.
var SHEET_NAME = 'Responses';

// The fixed columns, in order, before the per-question columns.
// Each entry is [header text, key in the posted JSON].
var COLUMNS = [
  ['Submitted At',     'submittedAt'],
  ['Candidate Name',   'candidateName'],
  ['Quiz Date',        'quizDate'],
  ['Result',           'result'],
  ['Score',            'totalCorrect'],
  ['Out Of',           'totalQuestions'],
  ['Percentage',       'percentage'],
  ['Pass Threshold',   'passThreshold'],
  ['Questions Answered', 'answeredCount'],
  ['Time Taken',       'timeTaken'],
  ['Timed Out',        'timedOut'],
  ['Section 1 (/15)',  'section1'],
  ['Section 2 (/15)',  'section2'],
  ['Section 3 (/15)',  'section3'],
  ['Section 4 (/7)',   'section4'],
  ['Wrong Questions',  'wrongQuestions']
];


/**
 * Receives a quiz submission and appends it as a row.
 */
function doPost(e) {
  // A lock stops two candidates finishing at the same moment
  // from writing over each other's row.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: 'error', message: 'No payload received' });
    }

    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    var questionKeys = sortedQuestionKeys_(data.answers);

    ensureHeaders_(sheet, questionKeys);

    var row = [];

    // Submitted At becomes a real date so the sheet can sort on it.
    for (var i = 0; i < COLUMNS.length; i++) {
      var key = COLUMNS[i][1];
      var value = data[key];
      if (key === 'submittedAt') {
        value = value ? new Date(value) : new Date();
      }
      row.push(value === undefined || value === null ? '' : value);
    }

    for (var j = 0; j < questionKeys.length; j++) {
      row.push(data.answers[questionKeys[j]]);
    }

    sheet.appendRow(row);

    return jsonResponse({ status: 'success', row: sheet.getLastRow() });

  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}


/**
 * Opening the Web App URL in a browser hits this. Handy for
 * confirming the deployment is live before wiring up the quiz.
 */
function doGet() {
  return jsonResponse({
    status: 'ok',
    message: 'Melsoft quiz endpoint is live. Submissions must be POSTed.'
  });
}


/** Returns the Responses tab, creating it if it does not exist. */
function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}


/**
 * Question keys arrive as Q1..Q52. Sorting them as strings would
 * give Q1, Q10, Q11... so sort on the numeric part instead.
 */
function sortedQuestionKeys_(answers) {
  if (!answers) return [];
  return Object.keys(answers).sort(function(a, b) {
    return parseInt(a.substring(1), 10) - parseInt(b.substring(1), 10);
  });
}


/** Writes and freezes the header row the first time the sheet is used. */
function ensureHeaders_(sheet, questionKeys) {
  if (sheet.getLastRow() > 0) return;

  var headers = [];
  for (var i = 0; i < COLUMNS.length; i++) {
    headers.push(COLUMNS[i][0]);
  }
  for (var j = 0; j < questionKeys.length; j++) {
    headers.push(questionKeys[j]);
  }

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#6B2D8B')
    .setFontColor('#FFFFFF');

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
}


function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Optional: run this once from the editor to confirm the script
 * can reach the spreadsheet and to trigger the permission prompt
 * before the first real submission arrives.
 */
function testConnection() {
  var sheet = getSheet_();
  Logger.log('Connected to: ' + sheet.getParent().getName() + ' / ' + sheet.getName());
}
