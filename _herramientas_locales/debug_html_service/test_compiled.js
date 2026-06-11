function testGetCompiledHtml() {
  try {
    var template = HtmlService.createTemplateFromFile('backend/panel_validacion');
    var html = template.evaluate().getContent();
    return html;
  } catch(e) {
    return "Error: " + e.toString();
  }
}
