// look into this : https://developers.google.com/apps-script/guides/triggers/installable
// can trigger on document opening or by time! 

function createDocumentOpenTrigger(url) {
  var doc = DocumentApp.openByUrl(url);
  ScriptApp.newTrigger('lastVisitedDoc')
      .forDocument(doc)
      .onOpen()
      .create();
}

// The trigger needs to be a function that does the parsing and then checks for the colors and then update - very very doable.

// holds info for each category: name, color, current value of the category
var Category = function(name, color, currentValue){
  this.name = name;
  this.color = color;
  this.currentValue = currentValue;
};

// allFilesInFolder
// input: name of folder as string
// output: all names of files within folder as array of URLs stored as strings
function allFilesInFolder(name){
  var urls = [];
  var folders = DriveApp.getFoldersByName(name);
  while (folders.hasNext()) {
    var folder = folders.next();
    var files = folder.getFiles();
    while(files.hasNext()){
      var file = files.next();
      if(file.getUrl().indexOf('spreadsheets') == -1){
         urls.push(file.getUrl());
      }
    }
  }
  return urls;
}

// initializeCategoriesInDoc
// input: name of document as string, array representing overarching array of Categories, counter where colors last left off
// output: object that contains: array of Categories from this one document, array of unique Category names, counter where colors leave off
function initializeCategoriesInDoc(url, cats, cc){
  var output = {
    categories: [],
    uniqueCategories: cats,
    counter: cc
  };
  // curated list of colors for highlighting - picked from the third row of flat design color chart
  // https://htmlcolorcodes.com/color-chart/
  var colors = [
    "#E6B0AA",
    "#D7BDE2",
    "#A9CCE3",
    "#A3E4D7",
    "#A9DFBF",
    "#F9E79F",
    "#F5CBA7",
  ];
  var doc = DocumentApp.openByUrl(url).getBody();
  var allParagraphs = doc.getParagraphs();
  for each(var par in allParagraphs){
    var fullString = par.getText();
    if(fullString != ""){
      var currPos = 0;
      var endPos = fullString.length;
      var withinCategory = new Boolean(false);
      var position = {
        beginning: 0,
        end: 0
      }
      while(currPos < endPos){
        var char = fullString.substring(currPos, currPos + 1);
        if(withinCategory == false && char == "{"){  
          position.beginning = currPos;
          withinCategory = true;
        }
        else{
          if(char == "}"){
            position.end = currPos + 1;
            var word = fullString.substring(position.beginning, position.end);
            if(!(output.uniqueCategories.indexOf(word) > -1)){
              var category = new Category(word, colors[output.counter], word);
              output.categories.push(category);
              output.uniqueCategories.push(word);
              output.counter++;
            }
            withinCategory = false;
          }
        }
        currPos++;
      }
    }
  }
  //Logger.log(output);
  return output;
}

// initializeAllCategories
// input: name of folder as string
// output: URL of spreadsheet created
function initializeAllCategories(url){
  var finalCats = []
  var uniqueCategories = []
  var cc = 0;
  var allFiles = allFilesInFolder('dealflow');
  for each (var url in allFiles){
    var cats = initializeCategoriesInDoc(url, uniqueCategories, cc);
    if(cats.categories.length > 0){
      finalCats = finalCats.concat(cats.categories);
      uniqueCategories = cats.uniqueCategories;
      cc = cats.counter;
    }
  }
  // as of right now, this creates in the root folder, maybe figure out how to move it into the dealflow folder
  // should work fine for right now though
  var ss = SpreadsheetApp.create("dealflow-values");
  var sheet = ss.getSheets()[0];
  for each (var item in finalCats){
    var entry = [];
    entry.push(item.name);
    entry.push(item.color);
    entry.push(item.currentValue);
    sheet.appendRow(entry);
  }
  //Logger.log(finalCats);
  return ss.getUrl();
}

// retrieveCategories
// input: spreadsheet URL containing all categories
// output: array of Categories 
function retrieveCategories(dictUrl){
  var ss = SpreadsheetApp.openByUrl(dictUrl)
  var sheet = ss.getSheets()[0];
  var values = sheet.getSheetValues(1, 1, -1, -1);
  var categories = [];
  for each(var value in values){
    cat = new Category(value[0], value[1], value[2]);
    categories.push(cat);
  }
  return categories;
}

/// colorCategories
/// input: spreadsheet URL containing all categories, all Google Doc URLs
/// output: None
function colorCategories(dictUrl, docUrls){
  var categories = retrieveCategories(dictUrl);
  for each(var url in docUrls){
    var doc = DocumentApp.openByUrl(url).getBody();
    var allParagraphs = doc.getParagraphs();
    for each(var par in allParagraphs){
      // go through each category type; highlight and locate each instance of each category accordingly
      for (var i=0; i<categories.length; i++){    
        // find first instance of category
        var item = par.findText(categories[i].name);
        while (item != null){
          item.getElement().asText().setBackgroundColor(item.getStartOffset(),item.getEndOffsetInclusive(), categories[i].color);
          // find the next instance of category in the same full string of paragraph
          item = par.findText(categories[i].name, item);
        }
      }
    }
  }
}

/// trigger function that stores the URL of the most recently opened document
function lastVisitedDoc(){
  var doc = DocumentApp.getActiveDocument();
  var findDict = DriveApp.getFilesByName('dealflow-values');
  while(findDict.hasNext()){
      var file = findDict.next();
      var dictUrl = file.getUrl();
  }
  var ss = SpreadsheetApp.openByUrl(dictUrl);
  var sheet = ss.getSheets()[0];
  sheet.appendRow(["last visited page", doc.getUrl()]);
  Logger.log(["last visited page", doc.getUrl()]);
}


/// FUNCTION - this is the trigger that runs when you open a doc? it should parse through all documents, check colors, repopulate the spreadsheet with initial values
/// input: 
/// output: 

function checkChanges(dictUrl, docUrls){
  var categories = retrieveCategories(dictUrl);
  for each(var url in docUrls){
    var doc = DocumentApp.openByUrl(url).getBody();
    var allParagraphs = doc.getParagraphs();
    
  }
}

function searchAndReplace(url) {
  var dict = initializeCategoryDictionary();
  var doc = DocumentApp.openByUrl(url).getBody();
  var words = [];
  var allParagraphs = doc.getParagraphs();
  
  // go through each paragraph 
  for each(var par in allParagraphs){
    // get the entire paragraph text
    var fullString = par.getText();
    // continue if the paragraph is not null
    if(fullString != ""){
      var startPos = 0;
      var endPos = fullString.length;
      var colorPresence = new Boolean(false);
      var position = {
        beginning: 0,
        end: 1
      };
      while(startPos < endPos){
        var char = fullString.substring(startPos, startPos + 1);
        var isThereColor = par.editAsText().getBackgroundColor(startPos);
        
        // check if current character is highlighted
        if(isThereColor != null){
          if(colorPresence == false){
            // mark the start position here
            position.beginning = startPos;
            //Logger.log('The start is here: ' + String(startPos));
          }
          colorPresence = true;
          //Logger.log("THERE IS COLOR HERE");
        }
        else{
          if(colorPresence){
            // mark the end position here
            position.end = startPos;
            var word = fullString.substring(position.beginning, position.end);
            //if(word != ""){
              
            //}
            words.push(word);
            //Logger.log('The end is here: ' + String(startPos));
            colorPresence = false;
          }
          //Logger.log("WE GOT NO COLOR HERE");
        }
        startPos++;
      }
      //Logger.log(words);
    }
    
    // go through each category type; highlight and locate each instance of each category accordingly
    for (var i=0; i<dict.length; i++){    
      // find first instance of category
      var item = par.findText(dict[i].name);
      while (item != null){
        item.getElement().asText().setBackgroundColor(item.getStartOffset(),item.getEndOffsetInclusive(), dict[i].color);
        
        // add to dictionary of current category
        // I don't think this does something as of rn
        // dict[i].catDict = item;

        // find the next instance of category in the same full string of paragraph
        item = par.findText(dict[i].name, item);
      }
    }
  }
  Logger.log(dict);
}

function main(){
  var allFiles = allFilesInFolder('dealflow');
  
  // TODO: scan through all files and initialize a category dictionary
  // TODO: add trigger functions to each files while scanning - on open, all documents are scanned and checked for differences,
  //       and then each file is updated accordingly

  var dictUrl = initializeAllCategories();
  colorCategories(dictUrl, allFiles);
  for each (var url in allFiles){
    createDocumentOpenTrigger(url);
  }
  var findDict = DriveApp.getFilesByName('dealflow-values');
  Logger.log(findDict);
}
