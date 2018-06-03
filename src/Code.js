function checkSpreadsheet() {
 var ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1ynzSOlH58Plmv9xYCLRa375mQq_RYJdFXrRUUUG9tc4/edit#gid=0");
 var sheet = ss.getSheets()[0];

 // The two samples below produce the same output
 var values = sheet.getSheetValues(1, 1, -1, -1);
 Logger.log(values);

 //var range = sheet.getRange(1, 1, 3, 3);
 //values = range.getValues();
 //Logger.log(values);
  
}

// look into this : https://developers.google.com/apps-script/guides/triggers/installable
// can trigger on document opening or by time! 

function createDocumentOpenTrigger() {
  var doc = DocumentApp.openByUrl('https://docs.google.com/document/d/1O1jU-DypJflBggimwKLmNosmJhdVOr6trN7xdjKOwoU/edit');
  ScriptApp.newTrigger('myFunction')
      .forDocument(doc)
      .onOpen()
      .create();
}

// The trigger needs to be a function that does the parsing and then checks for the colors and then update - very very doable.

function myFunction(){
  Logger.log("The trigger has occurred on open.")
}


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
      urls.push(file.getUrl());
    }
  }
  return urls;
}

// holds all category types
var Dict = function(){
  this.dict = [];

  this.addCategory = function(category){
    this.dict.push(category);
  }
};

// holds info for each category: name, color, dictionary of all words 
var Category = function(name, color){
  this.name = name;
  this.color = color;
  this.catDict = [];

  this.addInstance = function(elem){
    this.catDict.addCategory(elem);
  }
};

// initialization with dummy categories
function initializeCategoryDictionary(){
  // taken from the following link
  // https://stackoverflow.com/questions/5092808/how-do-i-randomly-generate-html-hex-color-codes-using-javascript
  var randomColor = "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});

  var cDict = new Dict();
  var date = new Category("{date}", "#40e0d0");
  cDict.addCategory(date);
  var x = new Category("{x}", "#c48891");
  cDict.addCategory(x);
  var y = new Category("{y}", "#acc9ec");
  cDict.addCategory(y);
  var z = new Category("{z}", "#ffff94");
  cDict.addCategory(z);
  
  return cDict;
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
    for (var i=0; i<dict.dict.length; i++){    
      // find first instance of category
      var item = par.findText(dict.dict[i].name);
      while (item != null){
        item.getElement().asText().setBackgroundColor(item.getStartOffset(),item.getEndOffsetInclusive(), dict.dict[i].color);
        
        // add to dictionary of current category
        dict.dict[i].catDict.push(item);

        // find the next instance of category in the same full string of paragraph
        item = par.findText(dict.dict[i].name, item);
      }
    }
  }
}

function test(){
  var allFiles = allFilesInFolder('dealflow');
  for each (var url in allFiles){
    searchAndReplace(url);
  }
}
