

interface SaveData {
    key?: string;
}

interface SetPolicies {
    setPolicies(policies: Array<SavePolicy>): void;
}

interface SavePolicy {
    shouldSave(data?: SaveData): boolean;
    reset(): void; // resets the policy so that the state does not keep determining that it should save.
}


export { 
    SaveData, 
    SavePolicy,
    SetPolicies,
}