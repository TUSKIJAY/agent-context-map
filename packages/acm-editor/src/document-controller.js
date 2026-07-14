import React from "react";
import { diffCount, diffDoc, validateDoc } from "./data.js";

const clone = (value) => structuredClone(value);

export class AcmDocumentController {
  constructor(initialDocument, { historyLimit = 120 } = {}) {
    this.historyLimit = historyLimit;
    this.load(initialDocument, initialDocument);
  }

  load(document, baseline = document) {
    this.document = clone(document);
    this.baseline = clone(baseline);
    this.undoStack = [];
    this.redoStack = [];
    this.lastCoalesceKey = null;
    this.epoch = (this.epoch || 0) + 1;
    return this.document;
  }

  commit(next, coalesceKey = null) {
    const previous = this.document;
    if (!(coalesceKey && coalesceKey === this.lastCoalesceKey)) {
      this.undoStack.push(clone(previous));
      if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
      this.redoStack = [];
    }
    this.lastCoalesceKey = coalesceKey;
    this.document = clone(typeof next === "function" ? next(clone(previous)) : next);
    this.epoch += 1;
    return this.document;
  }

  undo() {
    if (!this.undoStack.length) return this.document;
    this.redoStack.push(clone(this.document));
    this.document = this.undoStack.pop();
    this.lastCoalesceKey = null;
    this.epoch += 1;
    return this.document;
  }

  redo() {
    if (!this.redoStack.length) return this.document;
    this.undoStack.push(clone(this.document));
    this.document = this.redoStack.pop();
    this.lastCoalesceKey = null;
    this.epoch += 1;
    return this.document;
  }

  adoptBaseline() {
    this.baseline = clone(this.document);
    this.undoStack = [];
    this.redoStack = [];
    this.lastCoalesceKey = null;
    return this.baseline;
  }

  get diff() { return diffDoc(this.baseline, this.document); }
  get dirty() { const diff = this.diff; return diffCount(diff) > 0 || diff.layout_changes.length > 0; }
  get validation() { return validateDoc(this.document); }
}

export function useDocumentController(initialDocument, { historyLimit = 120 } = {}) {
  const [document, setDocument] = React.useState(initialDocument);
  const [baseline, setBaseline] = React.useState(initialDocument);
  const historyRef = React.useRef({ undo: [], redo: [], lastKey: null });
  const epochRef = React.useRef(0);

  const load = React.useCallback((nextDocument, nextBaseline = nextDocument) => {
    epochRef.current += 1;
    setDocument(nextDocument);
    setBaseline(nextBaseline);
    historyRef.current = { undo: [], redo: [], lastKey: null };
  }, []);

  const commit = React.useCallback((next, coalesceKey = null) => {
    epochRef.current += 1;
    setDocument((previous) => {
      const history = historyRef.current;
      if (!(coalesceKey && coalesceKey === history.lastKey)) {
        history.undo.push(previous);
        if (history.undo.length > historyLimit) history.undo.shift();
        history.redo = [];
      }
      history.lastKey = coalesceKey;
      return typeof next === "function" ? next(previous) : next;
    });
  }, [historyLimit]);

  const undo = React.useCallback(() => {
    const history = historyRef.current;
    if (!history.undo.length) return false;
    epochRef.current += 1;
    setDocument((current) => { history.redo.push(current); return history.undo.pop(); });
    history.lastKey = null;
    return true;
  }, []);

  const redo = React.useCallback(() => {
    const history = historyRef.current;
    if (!history.redo.length) return false;
    epochRef.current += 1;
    setDocument((current) => { history.undo.push(current); return history.redo.pop(); });
    history.lastKey = null;
    return true;
  }, []);

  const adoptBaseline = React.useCallback((nextBaseline) => {
    setBaseline(nextBaseline);
    historyRef.current = { undo: [], redo: [], lastKey: null };
  }, []);

  return { document, baseline, load, commit, undo, redo, adoptBaseline, historyRef, epochRef };
}
