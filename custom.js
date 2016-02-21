(function(){


    // var URL = 'wss://httpapi.labs.nuance.com/v1?';

    // var APP_ID = "NMDPTRIAL_zzh8829_gmail_com20160220124508";
    // var APP_KEY = "ff6c5d416e4bf48d85795fdc0a686bc70579fe811fa54e4c16871d439866f497d251d8409dccce22452dfe4f9569169be2141c02ba6a4ed0f16b1389d10720a3";
    // var USER_ID = "zzh8829@gmail.com";
    // var NLU_TAG = "hello";

    var URL = 'wss://httpapi.labs.nuance.com/v1?';

    var APP_ID = "NMDPTRIAL_liuzamy_gmail_com20160220121529";
    var APP_KEY = "63fbe89ff3ab6b83df60558af08793595ee3678811535b6b59f67dfbea18804e1369ed06145889f3b8de7ea9651102c3f4694b05bda670169ced12860592d418";
    var USER_ID = "liuzamy@gmail.com";
    var NLU_TAG = "TEST1" ;

    var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: true,
        mode: "python",
        keyMap: "vim",
        matchBrackets: true,
        autoCloseBrackets: true,
        showCursorWhenSelecting: true
    });


    var userMedia = undefined;
    navigator.getUserMedia = navigator.getUserMedia
    || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia
    || navigator.msGetUserMedia;


    if(!navigator.getUserMedia){
        console.log("No getUserMedia Support in this Browser");
    }
    
    navigator.getUserMedia({
        audio:true
    }, function(stream){
        userMedia = stream;
    }, function(error){
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

    var dLog = function dLog(msg, logger){
        var d = new Date();
        logger.prepend('<div><em>'+d.toISOString()+'</em> &nbsp; <pre>'+msg+'</pre></div>');
    };

    function insertAtCursor(content) {
        var cursor = editor.doc.getCursor();
        editor.doc.replaceRange(content, cursor);
    }

    function generateCode(JSONresult) {
        if (JSONresult.hasOwnProperty("literal")) {
            // insertAtCursor(JSONresult.literal + "\n");
        }
        if (JSONresult.hasOwnProperty("action")) {
            var intent = JSONresult.action.intent.value;
        }
        if (JSONresult.hasOwnProperty("concepts")) {
            var concepts = {};
            for (var key in JSONresult.concepts) {
                if (JSONresult.concepts[key][0].hasOwnProperty("value")) {
                    var value = JSONresult.concepts[key][0].value;
                }
                else {
                    var value = JSONresult.concepts[key][0].literal;
                }
                concepts[key] = value;
            }
        }
        handleIntent(intent, concepts);
    }

    // Perform actions based on intent and concept types
    function handleIntent(intent, concepts) {
        insertAtCursor(intent + "\n");
        for (var key in concepts) {
            insertAtCursor(key + " " + concepts[key] + "\n")
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
                if(msg.message == "volume") {
                   viz(msg.volume);
                } else if (msg.result_type == "NMDP_TTS_CMD") {
                    dLog(JSON.stringify(msg, null, 2), $ttsDebug);
                } else if (msg.result_type == "NDSP_ASR_APP_CMD") {
                    if(msg.result_format == "rec_text_results") {
                        if(msg.message == "query_error") {
                            alert('error');
                        } else {
                            alert(msg.transcriptions[0]);
                        }
                    } else if(msg.result_format == "nlu_interpretation_results") {
                        if(msg.nlu_interpretation_results.status === 'success'){
                            dLog(JSON.stringify(msg, null, 2), $asrDebug);
                        } else {
                            dLog(JSON.stringify(msg.nlu_interpretation_results.payload.interpretations, null, 2), $asrDebug);
                        }
                    }
                } else if (msg.result_type == "NVC_ASR_CMD") {
                    if(msg.message == "query_error") {
                        alert('error');
                    } else {
                        alert(msg.transcriptions);
                    }
                } else if (msg.result_type === "NDSP_APP_CMD") {
                    if(msg.nlu_interpretation_results.status === 'success'){
                        dLog(JSON.stringify(msg.nlu_interpretation_results.payload.interpretations, null, 2), $nluDebug);

                        // grab JSON result and generate python code
                        generateCode(msg.nlu_interpretation_results.payload.interpretations[0]);
                        
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
    $(window).unload(function(){
        Nuance.disconnect();
    });


    //
    // TTS
    function tts(evt){
        Nuance.playTTS({
            language: 'eng-USA',
            voice: 'ava',
            text: $ttsText.val()
        });
    };
    $ttsGo.on('click', tts);


    //
    // ASR / NLU
    function asr(evt){
        if(isRecording) {
            Nuance.stopASR();
            $asrLabel.text('RECORD');
        } else {
            cleanViz();

            var options = {
                userMedia: userMedia
            };
            if(NLU_TAG) {
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
    function textNlu(evt){
        var options = {
            text: $("#nlu_text").val(),
            tag: $textNluTag.val()
        };
        Nuance.startTextNLU(options);
    }
    $nluExecute.on('click', textNlu);

    //
    // ASR Volume visualization

    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame       ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                function(callback, element){
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

    var asrVizData = {};
    function cleanViz(){
        var parentWidth = $asrViz.parent().width();
        $asrViz[0].getContext('2d').canvas.width = parentWidth;
        asrVizData = {
            w: parentWidth,
            h: 256,
            col: 0,
            tickWidth: 0.5
        };
        var w = asrVizData.w, h = asrVizData.h;
        $asrVizCtx.clearRect(0, 0, w, h); // TODO: pull out height/width
        $asrVizCtx.strokeStyle = '#333';
        var y = (h/2) + 0.5;
        $asrVizCtx.moveTo(0,y);
        $asrVizCtx.lineTo(w-1,y);
        $asrVizCtx.stroke();
        asrVizData.col = 0;
    };

    function viz(amplitudeArray){
        var h = asrVizData.h;
        requestAnimFrame(function(){
            // Drawing the Time Domain onto the Canvas element
            var min = 999999;
            var max = 0;
            for(var i=0; i<amplitudeArray.length; i++){
                var val = amplitudeArray[i]/asrVizData.h;
                if(val>max){
                    max=val;
                } else if(val<min){
                    min=val;
                }
            }
            var yLow = h - (h*min) - 1;
            var yHigh = h - (h*max) - 1;
            $asrVizCtx.fillStyle = '#6d8f52';
            $asrVizCtx.fillRect(asrVizData.col,yLow,asrVizData.tickWidth,yHigh-yLow);
            asrVizData.col += 1;
            if(asrVizData.col>=asrVizData.w){
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
            "https://zihao.me/api/codepad", 
            {
                lang: "Python",
                code: code,
                run: "True",
                submit: "Submit",
            }
        ).done(function(data) {
            var pres = $($(data).find("a[name=output]").next()).find("pre")
            pres = pres.slice(pres.length/2);
            $("#output").text(pres.text());
        });
    }

    $("#run_code").click(execute);
})();
