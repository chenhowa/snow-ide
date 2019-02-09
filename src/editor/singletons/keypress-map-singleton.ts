

import { KeyPressMap, EditorKeyPressMap } from "editor/keypress-map";


let map: KeyPressMap = new EditorKeyPressMap();


let KeyPressMapSingleton = {
    get: function(): KeyPressMap {
        if(!map) {
            map = new EditorKeyPressMap();
        }
        return map;
    }
}

export default KeyPressMapSingleton;