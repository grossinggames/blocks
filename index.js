var start_block_id;
var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');
var workspace = Blockly.inject(blocklyDiv, { toolbox: document.getElementById('toolbox') });
var types = [
    "on_dtmf_1", "on_dtmf_2", "on_dtmf_3",
    "on_dtmf_4", "on_dtmf_5", "on_dtmf_6",
    "on_dtmf_8", "on_dtmf_7", "on_dtmf_9",
    "on_dtmf_asterisk", "on_dtmf_0", "on_dtmf_lattice",
    "on_dtmf_def"
];

function childKey(key, keys) {
    var type;
    if (!keys) {
        keys = {};
        type = key.type;
        keys[type.substr(type.lastIndexOf("_") + 1)] = Blockly.JavaScript[type](key);
    }
    for (var i = 0; i < key.childBlocks_.length; i++) {
        if (types.includes(key.childBlocks_[i].type)) {
            type = key.childBlocks_[i].type;
            keys[type.substr(type.lastIndexOf("_") + 1)] = Blockly.JavaScript[type](key.childBlocks_[i]);
            keys = childKey(key.childBlocks_[i], keys)
        }
    }
    return keys;
}

function childSttKey(key, keys) {
    var type;
    if (!keys) {
        keys = {};
        type = key.type;
        if (type == "on_stt_def") {
            keys["def"] = Blockly.JavaScript[type](key);
        } else {
            keys["'"+key.getFieldValue('text')+"'"] = Blockly.JavaScript[type](key);
        }
    }
    for (var i = 0; i < key.childBlocks_.length; i++) {
        if (key.childBlocks_[i].type == "on_stt_text" || key.childBlocks_[i].type == "on_stt_def") {
            type = key.childBlocks_[i].type;
            if (type == "on_stt_def") {
                keys["def"] = Blockly.JavaScript[type](key.childBlocks_[i]);
            } else {
                keys["'"+key.childBlocks_[i].getFieldValue('text')+"'"] = Blockly.JavaScript[type](key.childBlocks_[i]);
            }
            keys = childSttKey(key.childBlocks_[i], keys)
        }
    }
    return keys;
}

function getChilds(block, blocks){
    if (block.childBlocks_[0])  {
        blocks.push(block.childBlocks_[0])
        blocks = getChilds(block.childBlocks_[0], blocks);
    }
    return blocks;
}

function childCode(cur_block, cur_code) {
    if (!cur_code) {
        cur_code = Blockly.JavaScript[cur_block.type](cur_block);
    } else {
        if (cur_code.includes("<@next@>")) {
            cur_code = cur_code.replace("<@next@>", Blockly.JavaScript[cur_block.type](cur_block));
        }
    }
    if (cur_code.includes("<@next@>")) {
        if (cur_block.childBlocks_[0]) {
            cur_code = childCode(cur_block.childBlocks_[0], cur_code);
        }
    }
    if (cur_block.type == "dtmfon") {
        if (cur_block.childBlocks_[0]) {
            var tabs = getTabs(cur_block.childBlocks_[0]);
            var keys = {};
            var childs = getChilds(cur_block, []);
            keys = childKey(cur_block.childBlocks_[0]);
            for (var prop in keys){
                for (var i = 0; i < childs.length; i++){
                    if (childs[i].type == ("on_dtmf_"+prop)) {
                        for (var j = 0; j < childs[i].childBlocks_.length; j++){
                            if (!(types.includes(childs[i].childBlocks_[j].type))) keys[prop] = keys[prop].replace("<@next@>", childCode(childs[i].childBlocks_[j], ""));
                        }                        
                    }                    
                }
            }
            var keys_text = "{\n";
            var counter = 0;
            for (var prop in keys) {
                if (prop == "def") {
                    keys_text += tabs + prop;
                } else {
                    keys_text += tabs + "'" + prop + "'";
                }
                keys_text += ": " + keys[prop];
                counter++;
                if (Object.keys(keys).length > counter) {
                    keys_text += ",\n";
                } else {
                    keys_text += "\n" + tabs.slice(0, -4);
                }

            }
            keys_text += "}";
            cur_code = cur_code.replace("<@keys@>", keys_text);
        }
    }
    if (cur_block.type == "stton") {
        if (cur_block.childBlocks_[0]) {
            var tabs = getTabs(cur_block.childBlocks_[0]);
            var keys = {};
            var childs = getChilds(cur_block, []);
            keys = childSttKey(cur_block.childBlocks_[0]);
            for (var prop in keys){
                for (var i = 0; i < childs.length; i++){
                    if ((childs[i].type == "on_stt_text" && ("'"+childs[i].getFieldValue('text')+"'") == prop) || (childs[i].type == "on_stt_def" && prop == "def")) {
                        for (var j = 0; j < childs[i].childBlocks_.length; j++){
                            if (childs[i].childBlocks_[j].type != "on_stt_text"){
                                if (childs[i].childBlocks_[j].type != "on_stt_def") {
                                    keys[prop] = keys[prop].replace("<@next@>", childCode(childs[i].childBlocks_[j], ""));
                                } 
                            } 
                        }                        
                    }                    
                }
            }
            var keys_text = "{\n";
            var counter = 0;
            for (var prop in keys) {
                keys_text += tabs + prop;
                keys_text += ": " + keys[prop];
                counter++;
                if (Object.keys(keys).length > counter) {
                    keys_text += ",\n";
                } else {
                    keys_text += "\n" + tabs.slice(0, -4);
                }
            }
            keys_text += "}";
            cur_code = cur_code.replace("<@keys@>", keys_text);
        }
    }
    return cur_code;
}

function workspaceToCode(event) {
    var code = "";
    var start_block;
    var base = workspace.blockDB_;
    for (var block_id in base) {
        if (!base[block_id].parentBlock_) {
            start_block = base[block_id];
            start_block_id = block_id;
        }
    }
    if (start_block) code = childCode(start_block, "");
    return code;
}

function getBlockLevel(block, level) {
    if (block.type == "send_dtmf") {
        level--;
    }
    if (types.includes(block.type)) {
        level--;
    }
    if (block.type == "on_stt_text") {
        level--;
    }
    if (block.type == "on_stt_def") {
        level--;
    }
    if (!level) {
        level = 0;
    }
    if (block.parentBlock_) {
        level++;
        if (types.includes(block.parentBlock_.type) && !types.includes(block.type)){
            level++;
        }
        if (block.parentBlock_.type == "on_stt_text" || block.parentBlock_.type == "on_stt_def"){
            if (block.type != "on_stt_text") {
                if (block.type != "on_stt_def"){
                    level++;
                }
            }
        }
        // if (block.parentBlock_.type == "on_stt_text" && block.type != "on_stt_text"){
        //     level++;
        // }
        // if (block.parentBlock_.type == "on_stt_def" && block.type != "on_stt_def"){
        //     level++;
        // }
        if (block.parentBlock_.id == start_block_id) {
            return level;
        } else {
            return getBlockLevel(block.parentBlock_, level);
        }
    } else {
        return level;
    }
}

function getTabs(block){
    var tabs = "";
    var level = getBlockLevel(block);
    for (var i = 0; i < level; i++) {
        tabs += "    "
    }
    return tabs;
}

var onresize = function (e) {
    var element = blocklyArea;
    var x = 0;
    var y = 0;
    do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    } while (element);
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
    blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
};
window.addEventListener('resize', onresize, false);
onresize();
Blockly.svgResize(workspace);

Blockly.Blocks['start'] = {
    init: function () {
        this.appendStatementInput("START")
            .setCheck(null);
        this.setColour(230);
        this.setTooltip("");
        this.setHelpUrl("");
    }
};
Blockly.Blocks['ttsplay'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Проговорить текст")
            .appendField(new Blockly.FieldTextInput("Тестовый текст"), "TTS_TEXT")
            .appendField("голосом")
            .appendField(new Blockly.FieldDropdown([["zahar", "zahar"], ["levitan", "levitan"], ["ermilov", "ermilov"], ["silaerkan", "silaerkan"], ["oksana", "oksana"], ["jane", "jane"], ["omazh", "omazh"], ["kolya", "kolya"], ["kostya", "kostya"], ["nastya", "nastya"], ["sasha", "sasha"], ["nick", "nick"], ["erkanyavas", "erkanyavas"], ["zhenya", "zhenya"], ["tanya", "tanya"], ["ermil", "ermil"], ["anton_samokhvalov", "anton_samokhvalov"], ["tatyana_abramova", "tatyana_abramova"], ["voicesearch", "voicesearch"], ["alyss", "alyss"]]), "VOICE");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['bye'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Положить трубку");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['wait'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Подождать")
            .appendField(new Blockly.FieldNumber(2, 0, 10), "wait_time")
            .appendField("сек.");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['start_play'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Проиграть файл")
            .appendField(new Blockly.FieldDropdown([["Ваша_оценка", "Ваша_оценка"], ["Ваш_звонок_будет_переведен_на_IVR_опрос", "Ваш_звонок_будет_переведен_на_IVR_опрос"], ["Вы_можете_осавить_свое_сообщение", "Вы_можете_осавить_свое_сообщение"], ["Добро_пожаловать_в демонстрацию_системы_MARS", "Добро_пожаловать_в демонстрацию_системы_MARS"], ["Добрый_день", "Добрый_день"], ["Спасибо_за_звонок", "Спасибо_за_звонок"], ["До_свидания", "До_свидания"], ["Звуковой_сигнал", "Звуковой_сигнал"], ["Сигнал_получения_данных", "Сигнал_получения_данных"], ["Что__вас__интересует", "Что__вас__интересует"], ["К_сожалению_мы_ смогли_распознать_Вашу_оценку", "К_сожалению_мы_ смогли_распознать_Вашу_оценку"], ["Чтобы_еще_раз_оценть_работу_оператора", "Чтобы_еще_раз_оценть_работу_оператора"], ["Оцените_работу_оператора", "Оцените_работу_оператора"], ["Спасибо_за_оценку", "Спасибо_за_оценку"], ["Оцените_работу_оператора2", "Оцените_работу_оператора2"], ["Приветствие", "Приветствие"], ["Сигнал_записи", "Сигнал_записи"]]), "file_name");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['send_dtmf'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Послать тоновый сигнал")
            .appendField(new Blockly.FieldDropdown([["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"], ["0", "0"], ["*", "10"], ["#", "11"], ["A", "12"], ["B", "13"], ["C", "14"], ["D", "15"], ["Flash", "16"]]), "tone");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['refer'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Перевести звонок на номер ")
            .appendField(new Blockly.FieldTextInput(""), "phone");
        this.setPreviousStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['dtmfon'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Если введена клавиша");
        this.appendStatementInput("keys")
            .setCheck(null);
        this.setPreviousStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['stton'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Если сказали голосом (с ключем ")
            .appendField(new Blockly.FieldTextInput(""), "stt_key")
            .appendField(")");
        this.appendStatementInput("keys")
        this.setPreviousStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['on_stt_text'] = {
    init: function() {
        this.appendStatementInput("stt")
            .setCheck(null)
            .appendField("Cлово")
            .appendField(new Blockly.FieldTextInput(""), "text");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_1'] = {
    init: function () {
        this.appendStatementInput("dtmf_1")
            .setCheck(null)
            .appendField("Клавиша 1");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_2'] = {
    init: function () {
        this.appendStatementInput("dtmf_2")
            .setCheck(null)
            .appendField("Клавиша 2");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_3'] = {
    init: function () {
        this.appendStatementInput("dtmf_3")
            .setCheck(null)
            .appendField("Клавиша 3");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_4'] = {
    init: function () {
        this.appendStatementInput("dtmf_4")
            .setCheck(null)
            .appendField("Клавиша 4");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_5'] = {
    init: function () {
        this.appendStatementInput("dtmf_5")
            .setCheck(null)
            .appendField("Клавиша 5");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_6'] = {
    init: function () {
        this.appendStatementInput("dtmf_6")
            .setCheck(null)
            .appendField("Клавиша 6");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_7'] = {
    init: function () {
        this.appendStatementInput("dtmf_7")
            .setCheck(null)
            .appendField("Клавиша 7");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_8'] = {
    init: function () {
        this.appendStatementInput("dtmf_8")
            .setCheck(null)
            .appendField("Клавиша 8");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_9'] = {
    init: function () {
        this.appendStatementInput("dtmf_9")
            .setCheck(null)
            .appendField("Клавиша 9");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_0'] = {
    init: function () {
        this.appendStatementInput("dtmf_0")
            .setCheck(null)
            .appendField("Клавиша 0");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_lattice'] = {
    init: function () {
        this.appendStatementInput("dtmf_lattice")
            .setCheck(null)
            .appendField("Клавиша #");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_asterisk'] = {
    init: function () {
        this.appendStatementInput("dtmf_asterisk")
            .setCheck(null)
            .appendField("Клавиша *");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_dtmf_def'] = {
    init: function () {
        this.appendStatementInput("dtmf_def")
            .setCheck(null)
            .appendField("Другая клавиша");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['on_stt_def'] = {
    init: function () {
        this.appendStatementInput("stt_def")
            .setCheck(null)
            .appendField("Другое слово");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};

Blockly.JavaScript['start'] = function (block) {
    var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');
    var code = 'function(self){\n    <@next@>\n}';
    return code;
};
Blockly.JavaScript['ttsplay'] = function (block) {
    var text_tts_text = block.getFieldValue('TTS_TEXT');
    var dropdown_voice = block.getFieldValue('VOICE');
    var tabs = getTabs(block)
    var code = "self.session.ttsPlay({text: '" + text_tts_text + "', voice: '" + dropdown_voice + "'}, function () {\n" + tabs + "    <@next@>\n" + tabs + "})";
    return code;
};
Blockly.JavaScript['bye'] = function (block) {
    var code = 'self.session.bye();';
    return code;
};
Blockly.JavaScript['wait'] = function (block) {
    var wait_time = block.getFieldValue('wait_time');
    var tabs = getTabs(block)
    var code = "setTimeout(function () {\n" + tabs + "    <@next@>\n" + tabs + "}, " + parseInt(wait_time * 1000) + ")";
    return code;
};
Blockly.JavaScript['start_play'] = function (block) {
    var dropdown_file_name = block.getFieldValue('file_name');
    var tabs = getTabs(block)
    var code = "self.session.start_play({file: 'media/" + dropdown_file_name + ".wav'}, function () {\n" + tabs + "    <@next@>\n" + tabs + "})";
    return code;
};
Blockly.JavaScript['send_dtmf'] = function (block) {
    var dropdown_tone = block.getFieldValue('tone');
    var code = "self.session.sendDtmf('" + dropdown_tone + "');\n" + getTabs(block) + "<@next@>";
    return code;
};
Blockly.JavaScript['refer'] = function (block) {
    var text_phone = block.getFieldValue('phone');
    var code = "self.session.refer('" + text_phone + "');";
    return code;
};
Blockly.JavaScript['dtmfon'] = function (block) {
    var code = "self.session.dtmfOn(<@keys@>, function () {})";
    return code;
};
Blockly.JavaScript['stton'] = function (block) {
    var stt_key = block.getFieldValue('stt_key');
    var code = "self.session.sttOn({'opt': {model: 'general', developer_key: '"+stt_key+"'}, keys: <@keys@>}, function () {})";
    return code;
};
Blockly.JavaScript['on_stt_text'] = function(block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_stt_def'] = function(block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_1'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_2'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_3'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_4'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_5'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_6'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_7'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_8'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_9'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_0'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_lattice'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_asterisk'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};
Blockly.JavaScript['on_dtmf_def'] = function (block) {
    var tabs = getTabs(block)
    var code = "function () {\n" + tabs + "    <@next@>\n" + tabs + "}";
    return code;
};

function myUpdateFunction(event) {
    document.getElementById('textarea').value = workspaceToCode(event);
}

function save(){
    var xml = Blockly.Xml.workspaceToDom(workspace);
    localStorage["workspace"] = Blockly.Xml.domToText(xml);
}

function restoreDom(){
    if (localStorage["workspace"]) {
        var xml = Blockly.Xml.textToDom(localStorage["workspace"]);
        Blockly.Xml.domToWorkspace(workspace, xml);
    }
}
workspace.addChangeListener(myUpdateFunction);