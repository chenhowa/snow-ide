

interface SaveData {
    key?: string;
    editor_action?: EditorActionType;
    deletion_direction?: DeletionType // true for forward, false for backward.
}

enum DeletionType {
    Backward = 1,
    Forward
}

enum EditorActionType {
    Insert = 1,
    Remove
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