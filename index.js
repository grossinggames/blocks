var start_block_id;
var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');
var workspace = Blockly.inject(blocklyDiv, { toolbox: document.getElementById('toolbox') });
var types = [
    "play_video", "play_s_video", 
    "dialog", "btn_play"
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


function getChilds(block, blocks){
    if (block.childBlocks_[0])  {
        blocks.push(block.childBlocks_[0])
        blocks = getChilds(block.childBlocks_[0], blocks);
    }
    return blocks;
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

function childCode(cur_block, cur_code) {
    // console.log(' ');
    // console.warn('cur_block', cur_block.type);
    // console.warn('cur_code', cur_code);

    if (!cur_code) {
        cur_code = Blockly.JavaScript[cur_block.type](cur_block);
    } else {
        // console.log('cur_code', cur_code);
        // <@keys@>
        // console.warn('\n', cur_block);
        if (cur_code.includes("<@next@>")) {
            // console.warn('cur_code', cur_code);
            // console.warn('cur_block.type', cur_block.type);
            cur_code = cur_code.replace('<@next@>', Blockly.JavaScript[cur_block.type](cur_block));
        }
    }

    // if (cur_code.type == 'play_s_video') {
    //     cur_code = cur_code.replace('<@next@>', Blockly.JavaScript[cur_block.type](cur_block));
    // }

    // var childs = getChilds(cur_block, []);
    // consolewarn('childs', childs);

    if (cur_code.includes("<@next@>")) {
        if (cur_block.childBlocks_[0]) {
            cur_code = childCode(cur_block.childBlocks_[0], cur_code);
        }
    }

    if (cur_block.type == "play_s_video") {
        // cur_code = cur_code.replace('<@next@>', Blockly.JavaScript[cur_block.type](cur_block));
    }

    
    if (cur_block.type == "play_video") {
        if (cur_block.childBlocks_[0]) {
            var tabs = getTabs(cur_block.childBlocks_[0]);
            var keys = {};
            var childs = getChilds(cur_block, []);
            // console.log('play_video childs', childs);
            keys = childSttKey(cur_block.childBlocks_[0]);
            // console.log('play_video keys', keys);
            // console.log(cur_block);


            for (var prop in keys) {
                for (var i = 0; i < childs.length; i++){
                    if (childs[i].type == "btn_play") {
                        // console.log('TYPE == btn_play');

                        for (var j = 0; j < childs[i].childBlocks_.length; j++) {
                            // console.warn('keys[prop] ', keys[prop]);
                            if (childs[i].childBlocks_[j].type != 'play_s_video') {
                                console.error(childs[i].childBlocks_[j].type);
                                // keys[prop] = keys[prop].replace("<@next@>", childCode(childs[i].childBlocks_[j], ''));
                                // if (childs[i].childBlocks_[j].type != "on_stt_def") {
                                    // keys[prop] = keys[prop].replace("<@next@>", childCode(childs[i].childBlocks_[j], ''));
                                // } 
                            } 
                        }                        
                    }

                    // if ((childs[i].type == "on_stt_text" && ("'"+childs[i].getFieldValue('text')+"'") == prop) || (childs[i].type == "on_stt_def" && prop == "def")) {
                    //     for (var j = 0; j < childs[i].childBlocks_.length; j++){
                    //         if (childs[i].childBlocks_[j].type != "on_stt_text"){
                    //             if (childs[i].childBlocks_[j].type != "on_stt_def") {
                    //                 keys[prop] = keys[prop].replace("<@next@>", childCode(childs[i].childBlocks_[j], ""));
                    //             } 
                    //         } 
                    //     }                        
                    // }
                }
            }
            // var keys_text = "{\n";
            var keys_text = "";
            var counter = 0;

            for (var prop in keys) {
                // keys_text += tabs + prop;
                // keys_text += ": " + keys[prop];
                keys_text += keys[prop];
                counter++;
                if (Object.keys(keys).length > counter) {
                    // keys_text += ",\n";
                } else {
                    // keys_text += "\n" + tabs.slice(0, -4);
                }
            }
            // keys_text += "}";
            cur_code = cur_code.replace("<@next@>", keys_text);
            
            // console.warn('cur_code', cur_code);
        }
    }
    cur_code = cur_code.replace('<@next@>', '');
    cur_code = cur_code.replace("<@actions@>", '');
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
    if (types.includes(block.type)) {
        level--;
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

// Blockly.Blocks['start'] = {
//     init: function () {
//         this.appendStatementInput("START")
//             .setCheck(null);
//         this.setColour(230);
//         this.setTooltip("");
//         this.setHelpUrl("");
//     }
// };
Blockly.Blocks['play_video'] = {
    // init: function () {
    //     this.appendDummyInput()
    //         .appendField("Проиграть видео");
    //     this.setInputsInline(true);
    //     this.setPreviousStatement(true, null);
    //     this.setNextStatement(true, null);
    //     this.setColour(230);
    // }
    init: function () {
        this.appendDummyInput()
            .appendField('Проиграть видео')
            .appendField(new Blockly.FieldTextInput(""), "stton")
            .appendField(")");
        this.appendStatementInput("keys")
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['play_s_video'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Проиграть с.. видео");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(230);
    }
};
Blockly.Blocks['dialog'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Диалог")
            .appendField(new Blockly.FieldNumber(2, 0, 10), "dialog")
            .appendField("сек.");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};
Blockly.Blocks['btn_play'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("Кнопка play")
            // .appendField(new Blockly.FieldNumber(2, 0, 10), "btn_play")
            // .appendField("сек.");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(120);
    }
};


// Blockly.JavaScript['start'] = function (block) {
//     var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');
//     var code = 'function(self){\n    <@next@>\n}';
//     return code;
// };

Blockly.JavaScript['play_video'] = function (block) {
    var nameVideo = block.getFieldValue('name_video');
    var tabs = getTabs(block);    
    let code = `
    '': {
        video: '',
        loop: true,
        next: false,
        smoothStart: false,
        smoothFinish: false,
        open: function() {
            // PlaySound("sounds/sfx_.mp3", 0);
            // PlaySound("sounds/env_.mp3", 1);

        },
        click: function() {

        },
        close: function() {
            // StopSound("sounds/sfx_.mp3", 0);
            // StopSound("sounds/env_.mp3", 0);

        },
        onended: function() {
        },
        actions: [
            // {
            //     type: 'dialog',
            //     image: '',
            //     x: 0,
            //     y: 0,
            //     next: true,
            //     open: function() {
            //     },
            //     click: function() {
            //     }
            // },

            // {
            //     type: 'play',
            //     x: 0,
            //     y: 0,
            //     next: true,
            //     open: function() {
            //     },
            //     click: function() {
            //     }
            // }
        ]
    },
    <@next@>
    `
    return code;
};

Blockly.JavaScript['play_s_video'] = function (block) {
    var nameVideo = block.getFieldValue('name_video');

    let code = `
    '': {
        video: '',
        cum_image: '',
        smoothStart: false,
        smoothFinish: false,
        cum: true,
        afterCum: true,
        open: function() {
        },
        close: function() {
        }
    },
    <@next@>
    `
    return code;
};

Blockly.JavaScript['dialog'] = function (block) {
    var tabs = getTabs(block);
    var nameVideo = block.getFieldValue('name_video');
    var code = "        {\n            dialog: '" + nameVideo + "', \n        },\n<@next@>";
    return code;
};

Blockly.JavaScript['btn_play'] = function (block) {
    var dropdown_file_name = block.getFieldValue('file_name');
    var tabs = getTabs(block)
    var code = "        {\n            btn_play: '',\n        },\n<@next@>";
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
