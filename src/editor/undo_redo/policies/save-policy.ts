import { Action } from "editor/subjects_observables/action-processor";


interface SaveData {
    key?: string;
    editor_action?: EditorActionType;
    deletion_direction?: DeletionType; // true for forward, false for backward.
    action: Action
}

enum DeletionType {
    Backward = 1,
    Forward
}

enum EditorActionType {
    Insert = 1,
    Remove,
    Undo,
    Redo,
    Copy
}

interface SetPolicies {
    setPolicies(policies: Array<SavePolicy>): void;
}

interface SavePolicy {
    shouldSave(data: SaveData): boolean;
    reset(): void; // resets the policy so that the state does not keep determining that it should save.
}


export { 
    SaveData, 
    SavePolicy,
    SetPolicies,
    EditorActionType,
    DeletionType
}