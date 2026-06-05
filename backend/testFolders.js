function testFolders() {
  try {
    const f1 = DriveApp.getFolderById('1ozAkjspgSj6m2fN4tqqCm-mjrsux6ULi');
    console.log("Root folder exists: " + f1.getName());
  } catch(e) {
    console.log("Root folder error: " + e.message);
  }
  
  try {
    const f2 = DriveApp.getFolderById('1tJSOD4-OXmx-GNmuvPxRAWRzRX6Dh8gE');
    console.log("Fallback folder exists: " + f2.getName());
  } catch(e) {
    console.log("Fallback folder error: " + e.message);
  }
}
