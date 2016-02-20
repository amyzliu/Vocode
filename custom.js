var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    mode: "python",
    keyMap: "vim",
    matchBrackets: true,
    autoCloseBrackets: true,
    showCursorWhenSelecting: true
});