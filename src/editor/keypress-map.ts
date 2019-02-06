


interface KeyPressMap {
    Control: boolean;
}

class EditorKeyPressMap implements KeyPressMap {
    Control : boolean = false;

    constructor() {

    }
}

export { 
    KeyPressMap,
    EditorKeyPressMap
}