function doGetTestPublic(e) { return ContentService.createTextOutput(JSON.stringify({ status: "ok public" })).setMimeType(ContentService.MimeType.JSON); }
