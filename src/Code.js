function createDocumentOpenTrigger(url) {
  var doc = DocumentApp.openByUrl(url);
  ScriptApp.newTrigger('checkChanges')
      .forDocument(doc)
      .onOpen()
      .create();
}

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
  // as of right now, this creates in the root folder
  var ss = SpreadsheetApp.create("dealflow-values");
  var sheet = ss.getSheets()[0];
  for each (var item in finalCats){
    var entry = [];
    entry.push(item.name);
    entry.push(item.color);
    entry.push(item.currentValue);
    sheet.appendRow(entry);
  }
  ss.insertSheet();
  var sheet = ss.getSheets()[1];
  sheet.appendRow(['last visited page', 'NA']);
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
  var sheet = ss.getSheets()[1];
  sheet.clear()
  sheet.appendRow(["last visited page", doc.getId()]);
}

function checkChanges(){
  var findDict = DriveApp.getFilesByName('dealflow-values');
  while(findDict.hasNext()){
      var file = findDict.next();
      var dictUrl = file.getUrl();
  }
  var categories = retrieveCategories(dictUrl);
  var changedCat = [];
  var ss = SpreadsheetApp.openByUrl(dictUrl);
  var sheet = ss.getSheets()[1];
  var values = sheet.getSheetValues(1, 1, -1, -1);
  if (values[0][1] != "NA"){
    Logger.log("We have a document here.");
    var doc = DocumentApp.openById(values[0][1]).getBody();
    // this is a function, just make code that works for now and then put into function later
    var allParagraphs = doc.getParagraphs();
    for each(var par in allParagraphs){
      var fullString = par.getText();
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
          if(isThereColor != null){
            var color = isThereColor;
            if(colorPresence == false){
              position.beginning = startPos;
            }
            colorPresence = true;
          }
          else{
            if(colorPresence){
              position.end = startPos;
              var word = fullString.substring(position.beginning, position.end);
              if(word != "") { 
                for each (var obj in categories){
                  if(obj.color == color.toUpperCase()){
                    // currently set up so that it saves the first instance that has changed.
                    if(changedCat.indexOf(obj.name) == -1){
                      obj.currentValue = word;
                      changedCat.push(obj.name);
                    }
                  }
                }
              }
              colorPresence = false;
            }
          }
          startPos++;
        }
      }
    }
    // now we have to update categories spreadsheet
    var updateSheet = ss.getSheets()[0];
    updateSheet.clear();
    for each (var cat in categories){
      var entry = [];
      entry.push(cat.name);
      entry.push(cat.color);
      entry.push(cat.currentValue);
      updateSheet.appendRow(entry);
    }
    // and then we have to update the current document
    var words = [];
    var doc = DocumentApp.getActiveDocument().getBody();
    var allParagraphs = doc.getParagraphs();
    for each(var par in allParagraphs){
      var fullString = par.getText();
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
          if(isThereColor != null){
            var color = isThereColor;
            if(colorPresence == false){
              position.beginning = startPos;
            }
            colorPresence = true;
          }
          else{
            if(colorPresence){
              position.end = startPos;          
              var word = fullString.substring(position.beginning, position.end);
              Logger.log(word);
              if(word != "") { 
                for each (var obj in categories){
                  if(obj.color == color.toUpperCase()){
                    if(obj.currentValue.indexOf("}") != -1 || obj.currentValue.indexOf("{") != -1){
                      word = '\\' + word + '\\';
                    }
                    word = word + '+';
                    words.push([word, obj.currentValue]);
                  }
                }
              }
              colorPresence = false;
            }
          }
          startPos++;
        }
      }
    }
    for each(var term in words){
     doc.replaceText(term[0], term[1]);  
    }
    Logger.log(words);
  }
  else {
    Logger.log("We do not have a document here.");
  }
  lastVisitedDoc();
}

function main(){
  var allFiles = allFilesInFolder('dealflow');
  var dictUrl = initializeAllCategories();
  colorCategories(dictUrl, allFiles);
  for each (var url in allFiles){
    createDocumentOpenTrigger(url);
  }
  var findDict = DriveApp.getFilesByName('dealflow-values');
}
