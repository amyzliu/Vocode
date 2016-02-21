var editor;

(function() {


  // var URL = 'wss://httpapi.labs.nuance.com/v1?';

  // var APP_ID = "NMDPTRIAL_zzh8829_gmail_com20160220124508";
  // var APP_KEY = "ff6c5d416e4bf48d85795fdc0a686bc70579fe811fa54e4c16871d439866f497d251d8409dccce22452dfe4f9569169be2141c02ba6a4ed0f16b1389d10720a3";
  // var USER_ID = "zzh8829@gmail.com";
  // var NLU_TAG = "hello";

  var URL = 'wss://httpapi.labs.nuance.com/v1?';

  var APP_ID = "NMDPTRIAL_liuzamy_gmail_com20160220121529";
  var APP_KEY = "63fbe89ff3ab6b83df60558af08793595ee3678811535b6b59f67dfbea18804e1369ed06145889f3b8de7ea9651102c3f4694b05bda670169ced12860592d418";
  var USER_ID = "liuzamy@gmail.com";
  var NLU_TAG = "TEST1";

  editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "python",
    tabSize: 2,
    indentWithTabs: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    showCursorWhenSelecting: true
  });


  var userMedia = undefined;
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;


  if (!navigator.getUserMedia) {
    console.log("No getUserMedia Support in this Browser");
  }

  navigator.getUserMedia({
    audio: true
  }, function(stream) {
    userMedia = stream;
  }, function(error) {
    console.error("Could not get User Media: " + error);
  });

  //
  // APP STATE
  var isRecording = false;
  // NODES
  var $content = $('#content');
  var $textNluTag = $("#text_nlu_tag");
  var $ttsGo = $('#tts_go');
  var $ttsText = $('#tts_text');
  var $ttsDebug = $('#tts_debug_output');
  var $asrRecord = $('#asr_go');
  var $asrLabel = $('#asr_label');
  var $nluExecute = $('#nlu_go');
  var $asrViz = $('#asr_viz');
  var $asrDebug = $('#asr_debug_output');
  var $nluDebug = $('#nlu_debug_output');
  var $asrVizCtx = $asrViz.get()[0].getContext('2d');

  var dLog = function dLog(msg, logger) {
    var d = new Date();
    logger.prepend('<div><em>' + d.toISOString() + '</em> &nbsp; <pre>' + msg + '</pre></div>');
  };

  var Small = {
    'zero': 0,
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9,
    'ten': 10,
    'eleven': 11,
    'twelve': 12,
    'thirteen': 13,
    'fourteen': 14,
    'fifteen': 15,
    'sixteen': 16,
    'seventeen': 17,
    'eighteen': 18,
    'nineteen': 19,
    'twenty': 20,
    'thirty': 30,
    'forty': 40,
    'fifty': 50,
    'sixty': 60,
    'seventy': 70,
    'eighty': 80,
    'ninety': 90
  };

  var Magnitude = {
    'thousand':     1000,
    'million':      1000000,
    'billion':      1000000000,
    'trillion':     1000000000000,
    'quadrillion':  1000000000000000,
    'quintillion':  1000000000000000000,
    'sextillion':   1000000000000000000000,
    'septillion':   1000000000000000000000000,
    'octillion':    1000000000000000000000000000,
    'nonillion':    1000000000000000000000000000000,
    'decillion':    1000000000000000000000000000000000,
  };

  var a, n, g;

  function text2num(s) {
    a = s.toString().split(/[\s-]+/);
    n = 0;
    g = 0;
    e = 0;
    a.forEach(function (w) {
      var x = Small[w];
      if (x != null) {
        g = g + x;
      }
      else if (w == "hundred") {
        g = g * 100;
      }
      else {
        x = Magnitude[w];
        if (x != null) {
          n = n + g * x
          g = 0;
        }
        else {
          e = 1;
        }
      }
    });
    if(e) {
      return "error";
    }
    return n + g;
  }

  symbols = {}

  function getSymbol(symbol, line) {
    symbol = symbol.toLowerCase();
    line = line || editor.getCursor()["line"]
    for(var i = 0; i < line; i++) {
      if(symbols[i] && $.inArray(symbol, symbols[i]) >= 0)
        return symbol;
    }

    if(!isNaN(symbol)) {
      return parseInt(symbol);
    }
    num = text2num(symbol);
    if(num != "error")
      return num
    return '"' + symbol + '"';
  }

  function addSymbol(symbol, line) {
    symbol = symbol.toLowerCase();
    line = line || editor.getCursor()["line"]
    if(!(line in symbols)) {
      symbols[line] = []
    }
    symbols[line].push(symbol);
  }

  function getOp(op, literal) {
    opTable = {
      plus: '+',
      minus: '-',
      mult: '*',
      div: '/',
      less: '<',
      great: '>',
      equal: '==',
    }
    for (var key in opTable) {
      if (opTable.hasOwnProperty(key)) {
        if(op.indexOf(key) > -1) {
          return opTable[key];
        }
      }
    }
    for (var key in opTable) {
      if (opTable.hasOwnProperty(key)) {
        if(literal.indexOf(key) > -1) {
          return opTable[key];
        }
      }
    }
    return "error"
  }

  function getFn(fn, literal) {
    fnTable = {
      abs: 'abs',
      neg: 'neg',
      sort: 'sort',
      list: 'list',
      len: 'len',
    }
    for (var key in fnTable) {
      if (fnTable.hasOwnProperty(key)) {
        if(fn.indexOf(key) > -1) {
          return fnTable[key];
        }
      }
    }
    for (var key in fnTable) {
      if (fnTable.hasOwnProperty(key)) {
        if(literal.indexOf(key) > -1) {
          return fnTable[key];
        }
      }
    }
    return fn
  }

  function lastWord(str) {
      var n = str.split(" ");
      return n[n.length - 1];
  }

  function insertAtCursor(content, callback) {
    insertAnimated(content, 0, 100, callback)
  }

  function insertAnimated (str, i, timeout, callback) {
    if (i >= str.length) return callback()
    var cursor = editor.getCursor()

    setTimeout(function() {
      editor.replaceRange(str[i], cursor)
      insertAnimated(str, i + 1, timeout, callback)
    }, timeout)
  }

  function parseJSONresult(JSONresult) {
    var intent
    var concepts
    var literal

    if (JSONresult.hasOwnProperty("literal")) {
      // keep this in case we need to do something with literals
      // insertAtCursor(JSONresult.literal + "\n");
      literal = JSONresult.literal
    }
    if (JSONresult.hasOwnProperty("action")) {
      intent = JSONresult.action.intent.value;
    }
    tokens = []
    if (JSONresult.hasOwnProperty("concepts")) {
      concepts = {};
      for (var key in JSONresult.concepts) {
        var value = []
        for (concept in JSONresult.concepts[key]) {
          if (JSONresult.concepts[key][concept].hasOwnProperty("value")) {
            tokens.push([JSONresult.concepts[key][concept].ranges[0][0], JSONresult.concepts[key][concept].value]);
            value.push(JSONresult.concepts[key][concept].value)
          } else {
            tokens.push([JSONresult.concepts[key][concept].ranges[0][0], JSONresult.concepts[key][concept].literal]  );
            value.push(JSONresult.concepts[key][concept].literal)
          }
        }
        concepts[key] = value;
      }
    }
    tokens.sort(function (a,b) { return a[0] > b[0] });
    handleIntent(intent, concepts, literal, tokens);
  }

  // Perform actions based on intent and concept types
  function handleIntent(intent, concepts, literal, tokens) {
    switch (intent.toUpperCase()) {
      case 'ASSIGN':
        handleAssign(concepts);
        break;
      case 'ASSIGN_B':
        handleAssignB(concepts, literal, tokens);
        break;
      case 'ASSIGN_U':
        handleAssignU(concepts, literal, tokens);
        break;
      case 'MOVE':
        handleMove(concepts, literal);
        break;
      case 'WHILE':
        handleWhile(concepts, literal);
        break;
      case 'PRINT':
        handlePrint(literal);
        break;
      case 'IF':
        handleIf(concepts, literal)
        break;
      case 'FUNCTION':
        return alert('Awaiting implementation: FUNCTION')
        break;
      case 'REMOVE_LINE':
        handleRemoveLine(concepts)
        break;
      case 'OPEN_LINE':
        handleOpenLine(concepts, literal)
        break;
      case 'EXECUTE':
        execute()
        break;
      default:
        return alert('No Intent found for: ' + intent)
    }
    // insertAtCursor(intent + "\n");
    // for (var key in concepts) {
    //     insertAtCursor(key + " " + concepts[key] + "\n")
    // }
  }

  function handleAssign (concepts) {
    addSymbol(concepts.VARIABLE[0]);
    str = getSymbol(concepts.VARIABLE[1]);
    insertAtCursor(concepts.VARIABLE[0] + " = " + str, function () {
      CodeMirror.commands.newlineAndIndent(editor)
    })
  }

  function handleAssignU (concepts, literal, tokens) {
    console.log(tokens)
    debugger;

    fn = literal
    if(tokens[2])
      fn = tokens[2][1]
    fn = getFn(fn, literal);

    addSymbol(tokens[0][1]);

    if(tokens[3])
      str = getSymbol(tokens[3][1]);
    else
      str = getSymbol(lastWord(literal))

    if(fn == 'neg')
      str = '-' + str
    else if(fn == 'sort')
      str = 'sorted(' + str + ')'
    else
      str = fn + '(' + str + ')'

    insertAtCursor(tokens[0][1] + " = " + str, function () {
      CodeMirror.commands.newlineAndIndent(editor)
    })
  }


  function handleAssignB (concepts, literal, tokens) {
    console.log(tokens)
    op = literal
    if(tokens[3])
      op = tokens[3][1]
    op = getOp(tokens[3][1], literal);
    if(op == "error") {
      console.log(literal, tokens[3]);
      return;
    }
    addSymbol(tokens[0][1]);
    str1 = getSymbol(tokens[2][1]);

    if(tokens[4])
      str2 = getSymbol(tokens[4][1]);
    else
      str2 = getSymbol(lastWord(literal))

    insertAtCursor(tokens[0][1] + " = " + str1 + " " + op + " " + str2, function () {
      CodeMirror.commands.newlineAndIndent(editor)
    })
  }

  function handlePrint(literal) {
    str = getSymbol(literal.substring(6));
    insertAtCursor("print " + str, function () {
      CodeMirror.commands.newlineAndIndent(editor)
    });
  }

  function handleWhile(concepts, literal) {
    if (literal.match(/end *while/i)) {
      CodeMirror.commands.indentLess(editor)
    } else {
      insertAtCursor('while ' + concepts.VARIABLE[0] + ":", function () {
        CodeMirror.commands.newlineAndIndent(editor)
      })
    }
  }

  function handleRemoveLine (concepts) {
    if (concepts && typeof concepts.CARDINAL_NUMBER[0] !== 'undefined') {
      editor.setCursor(concepts.CARDINAL_NUMBER[0]-1)
    }
    CodeMirror.commands.deleteLine(editor)
    CodeMirror.commands.indentAuto(editor)
  }

  function handleOpenLine (concepts, literal) {
    console.log(concepts);
    var DIRECTION
    var LINE_NUM
    if (concepts && concepts.CARDINAL_NUMBER && typeof concepts.CARDINAL_NUMBER[0] !== 'undefined') {
      LINE_NUM = Number(concepts.CARDINAL_NUMBER[0])
    } else {
      LINE_NUM = editor.getCursor()["line"]
    }
    if (concepts && typeof concepts.DIRECTION[0] !== 'undefined') {
      DIRECTION = concepts.DIRECTION[0]
    } else {
      DIRECTION = 'BELOW'
    }

    if(DIRECTION === 'BELOW') {
      editor.setCursor(LINE_NUM)
      CodeMirror.commands.newlineAndIndent(editor)
    } else {
      editor.setCursor(LINE_NUM - 1)
      CodeMirror.commands.newlineAndIndent(editor)
    }
  }

  function handleIf (concepts, literal) {
    if (literal.match(/end *if/i)) {
      CodeMirror.commands.indentLess(editor)
    } else {
      insertAtCursor('if ' + concepts.VARIABLE[0] + ":", function () {
        CodeMirror.commands.newlineAndIndent(editor)
      })
    }
  }

  function handleMove (concepts, literal) {
    if (concepts && typeof concepts.CARDINAL_NUMBER[0] !== 'undefined') {
      editor.setCursor(concepts.CARDINAL_NUMBER[0]-1)
    }
  }

  function moveCursor(concepts) {
    var CARDINAL_NUMBER = concepts.CARDINAL_NUMBER
    var QUANTIFIER = concepts.QUANTIFIER || 'line'
    var DIRECTION = concepts.DIRECTION
    var OBJECT = concepts.OBJECT
    var LOCATION_VAR = concepts.LOCATION_VAR

    if (LOCATION_VAR) {
      switch (LOCATION_VAR.toLowerCase()) {
        case 'line':
          CodeMirror.jumpToLine(editor, CARDINAL_NUMBER)
          break;
        default:
          return;
      }
    }
  }


  //
  // Connect
  function connect() {

    // INIT THE SDK
    Nuance.connect({
      appId: APP_ID,
      appKey: APP_KEY,
      userId: USER_ID,
      url: URL,

      onopen: function() {
        console.log("Websocket Opened");
        $content.addClass('connected');
      },
      onclose: function() {
        console.log("Websocket Closed");
        $content.removeClass('connected');
      },
      onmessage: function(msg) {
        console.log(msg);
        if (msg.message == "volume") {
          viz(msg.volume);
        } else if (msg.result_type == "NMDP_TTS_CMD") {
          dLog(JSON.stringify(msg, null, 2), $ttsDebug);
        } else if (msg.result_type == "NDSP_ASR_APP_CMD") {
          if (msg.result_format == "rec_text_results") {
            if (msg.message == "query_error") {
              alert('error');
            } else {
              alert(msg.transcriptions[0]);
            }
          } else if (msg.result_format == "nlu_interpretation_results") {
            if (msg.nlu_interpretation_results.status === 'success') {
              dLog(JSON.stringify(msg, null, 2), $asrDebug);

              var json_response = msg.nlu_interpretation_results.payload.interpretations[0]

              // grab JSON result and generate python code
              parseJSONresult(json_response);
            } else {
              dLog(JSON.stringify(msg.nlu_interpretation_results.payload.interpretations, null, 2), $asrDebug);
            }
          }
        } else if (msg.result_type == "NVC_ASR_CMD") {
          if (msg.message == "query_error") {
            alert('error');
          } else {
            alert(msg.transcriptions);
          }
        } else if (msg.result_type === "NDSP_APP_CMD") {
          if (msg.nlu_interpretation_results.status === 'success') {
            var json_response = msg.nlu_interpretation_results.payload.interpretations[0]
            dLog(JSON.stringify(json_response), $nluDebug);

            // grab JSON result and generate python code
            parseJSONresult(json_response);
          } else {
            dLog(JSON.stringify(msg, null, 2), $nluDebug);
          }
        }
      },
      onerror: function(error) {
        console.error(error);
        $content.removeClass('connected');
      }

    });
  };
  $("#status-indicator").click(connect);

  $textNluTag.val(NLU_TAG || '');

  // Disconnect
  $(window).unload(function() {
    Nuance.disconnect();
  });


  //
  // TTS
  function tts(evt) {
    Nuance.playTTS({
      language: 'eng-USA',
      voice: 'ava',
      text: $ttsText.val()
    });
  };
  $ttsGo.on('click', tts);


  //
  // ASR / NLU
  function asr(evt) {
    if (isRecording) {
      Nuance.stopASR();
      $asrLabel.text('RECORD');
    } else {
      cleanViz();

      var options = {
        userMedia: userMedia
      };
      if (NLU_TAG) {
        options.nlu = true;
        options.tag = NLU_TAG;
      }
      Nuance.startASR(options);
      $asrLabel.text('STOP');
    }
    isRecording = !isRecording;
  };
  $asrRecord.on('click', asr);

  //
  // NLU / Text
  function textNlu(evt) {
    var options = {
      text: $("#nlu_text").val(),
      tag: $textNluTag.val()
    };
    Nuance.startTextNLU(options);
  }
  $nluExecute.on('click', textNlu);

  //
  // ASR Volume visualization

  window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function(callback, element) {
        window.setTimeout(callback, 1000 / 60);
      };
  })();

  var asrVizData = {};

  function cleanViz() {
    var parentWidth = $asrViz.parent().width();
    $asrViz[0].getContext('2d').canvas.width = parentWidth;
    asrVizData = {
      w: parentWidth,
      h: 256,
      col: 0,
      tickWidth: 0.5
    };
    var w = asrVizData.w,
      h = asrVizData.h;
    $asrVizCtx.clearRect(0, 0, w, h); // TODO: pull out height/width
    $asrVizCtx.strokeStyle = '#333';
    var y = (h / 2) + 0.5;
    $asrVizCtx.moveTo(0, y);
    $asrVizCtx.lineTo(w - 1, y);
    $asrVizCtx.stroke();
    asrVizData.col = 0;
  };

  function viz(amplitudeArray) {
    var h = asrVizData.h;
    requestAnimFrame(function() {
      // Drawing the Time Domain onto the Canvas element
      var min = 999999;
      var max = 0;
      for (var i = 0; i < amplitudeArray.length; i++) {
        var val = amplitudeArray[i] / asrVizData.h;
        if (val > max) {
          max = val;
        } else if (val < min) {
          min = val;
        }
      }
      var yLow = h - (h * min) - 1;
      var yHigh = h - (h * max) - 1;
      $asrVizCtx.fillStyle = '#6d8f52';
      $asrVizCtx.fillRect(asrVizData.col, yLow, asrVizData.tickWidth, yHigh - yLow);
      asrVizData.col += 1;
      if (asrVizData.col >= asrVizData.w) {
        asrVizData.col = 0;
        cleanViz();
      }
    });
  };
  cleanViz();

  $(connect);


  function execute() {
    var code = editor.getValue();

    $.post(
      "https://zihao.me/api/codepad", {
        lang: "Python",
        code: code,
        run: "True",
        submit: "Submit",
      }
    ).done(function(data) {
      var pres = $($(data).find("a[name=output]").next()).find("pre")
      pres = pres.slice(pres.length / 2);
      $("#output").text(pres.text());
    });
  }

  $("#run_code").click(execute);
})();
