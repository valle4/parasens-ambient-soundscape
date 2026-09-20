import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { dropPosition } from "../src/lib/music/reorder.ts";
const source = await readFile(
  new URL("../src/hooks/useSongDrag.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
function events() {
  const listeners = new Map();
  return {
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) {
      listeners.get(name)?.delete(fn);
    },
    emit(name, e = {}) {
      for (const fn of [...(listeners.get(name) ?? [])]) fn(e);
    },
    count() {
      return [...listeners.values()].reduce((n, s) => n + s.size, 0);
    },
  };
}
function setup(enabled = true) {
  const window = { ...events(), innerWidth: 800 },
    frames = new Map(),
    ghosts = new Set(),
    effects = [],
    writes = [];
  let captured = false,
    frameId = 0;
  const handle = {
    ...events(),
    setPointerCapture() {
      captured = true;
    },
    hasPointerCapture() {
      return captured;
    },
    releasePointerCapture() {
      captured = false;
      handle.emit("lostpointercapture");
    },
  };
  const document = {
    body: {
      appendChild(el) {
        ghosts.add(el);
      },
    },
    createElement() {
      return {
        style: {},
        setAttribute() {},
        remove() {
          ghosts.delete(this);
        },
      };
    },
  };
  const rows = ["a", "b", "c"].map((id, i) => ({
    dataset: { songRow: id },
    getBoundingClientRect: () => ({
      top: 60 + i * 80,
      bottom: 140 + i * 80,
      height: 80,
    }),
  }));
  const box = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ left: 0, right: 600, top: 0, bottom: 400 }),
    querySelectorAll: () => rows,
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 40 }) }),
  };
  const exports = {};
  runInNewContext(code, {
    exports,
    window,
    document,
    requestAnimationFrame(fn) {
      frames.set(++frameId, fn);
      return frameId;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    require(id) {
      if (id === "react")
        return {
          useState: () => [null, () => {}],
          useRef: (v) => ({ current: v }),
          useEffect: (fn) => effects.push(fn),
          useCallback: (fn) => fn,
        };
      if (id === "@/lib/music/reorder") return { dropPosition };
      throw Error(id);
    },
  });
  const hook = exports.useSongDrag({
    container: { current: box },
    ids: ["a", "b", "c"],
    enabled,
    onMove: (id, to) => writes.push([id, to]),
  });
  const cleanups = effects.map((fn) => fn());
  const point = (x = 100, y = 100) => ({
    pointerId: 1,
    clientX: x,
    clientY: y,
    preventDefault() {},
  });
  return {
    window,
    frames,
    ghosts,
    handle,
    writes,
    box,
    start() {
      hook.startDrag(
        { ...point(), currentTarget: handle, button: 0, isPrimary: true },
        "a",
        "Song A",
      );
    },
    move(x, y) {
      window.emit("pointermove", point(x, y));
    },
    drop(x, y) {
      window.emit("pointerup", point(x, y));
    },
    flush() {
      const queue = [...frames.values()];
      frames.clear();
      queue.forEach((fn) => fn());
    },
    unmount() {
      cleanups.forEach((fn) => fn());
    },
    checkClean() {
      assert.equal(window.count(), 0);
      assert.equal(handle.count(), 0);
      assert.equal(frames.size, 0);
      assert.equal(ghosts.size, 0);
      assert.equal(captured, false);
    },
  };
}
test("pointer drag saves one destination and releases all resources", () => {
  const app = setup();
  app.start();
  app.move(100, 290);
  app.flush();
  assert.equal(app.ghosts.size, 1);
  assert.equal(app.frames.size, 1);
  app.drop(100, 290);
  assert.deepEqual(app.writes, [["a", 3]]);
  app.checkClean();
});
for (const reason of [
  "Escape",
  "blur",
  "pointercancel",
  "lostpointercapture",
  "unmount",
  "outside",
  "click",
])
  test(`drag cancellation (${reason}) does not save or leak work`, () => {
    const app = setup();
    app.start();
    if (reason !== "click") {
      app.move(100, 290);
      app.flush();
    }
    if (reason === "Escape")
      app.window.emit("keydown", { key: "Escape", preventDefault() {} });
    else if (reason === "lostpointercapture") app.handle.emit(reason);
    else if (reason === "unmount") app.unmount();
    else if (reason === "outside") app.drop(700, 290);
    else if (reason === "click") app.drop(100, 100);
    else app.window.emit(reason);
    assert.deepEqual(app.writes, []);
    app.checkClean();
  });
test("edge scrolling only runs during a drag and disabled handles do nothing", () => {
  const app = setup();
  app.start();
  app.move(100, 380);
  app.flush();
  assert.equal(app.box.scrollTop, 10);
  app.unmount();
  app.checkClean();
  const disabled = setup(false);
  disabled.start();
  disabled.move(100, 290);
  disabled.drop(100, 290);
  assert.deepEqual(disabled.writes, []);
  disabled.checkClean();
});
