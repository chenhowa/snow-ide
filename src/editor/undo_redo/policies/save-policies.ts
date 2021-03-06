

import { SavePolicy, SaveData, SetPolicies, EditorActionType, DeletionType } from "editor/undo_redo/policies/save-policy";
import KeyDownTimeSavePolicy from "editor/undo_redo/policies/keydown-time-save-policy";
import CompositeSavePolicy from "editor/undo_redo/policies/composite-save-policy";
import CurrentKeySavePolicy from "editor/undo_redo/policies/current-key-save-policy";
import SwitchInsertDeleteSavePolicy from "editor/undo_redo/policies/switch-insert-delete-save-policy";
import SwitchBackspaceDeleteSavePolicy from "editor/undo_redo/policies/switch-backspace-delete-save-policy";
import SwitchCharSpaceSavePolicy from "editor/undo_redo/policies/switch-char-space-policy";
import ActionSavePolicy from "editor/undo_redo/policies/editor-action-save-policy";

export {
    SavePolicy,
    SaveData,
    KeyDownTimeSavePolicy,
    CompositeSavePolicy,
    CurrentKeySavePolicy,
    SetPolicies,
    EditorActionType,
    SwitchInsertDeleteSavePolicy,
    DeletionType,
    SwitchBackspaceDeleteSavePolicy,
    SwitchCharSpaceSavePolicy,
    ActionSavePolicy
}