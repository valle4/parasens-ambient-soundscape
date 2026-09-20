import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function target() {
  const events = new Map();
  return {
    events,
    addEventListener(name, fn) {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(fn);
    },
    removeEventListener(name, fn) {
      events.get(name)?.delete(fn);
    },
    emit(name, value) {
      for (const fn of events.get(name) ?? []) fn(value);
    },
    count() {
      return [...events.values()].reduce((n, fns) => n + fns.size, 0);
    },
  };
}
function classes() {
  const values = new Set();
  return {
    values,
    add: (name) => values.add(name),
    remove: (name) => values.delete(name),
    toggle: (name, on) => (on ? values.add(name) : values.delete(name)),
  };
}
class Element {
  constructor(interactive = false) {
    this.interactive = interactive;
  }
  closest() {
    return this.interactive ? this : null;
  }
  matches(selector) {
    return this.tagName === selector;
  }
}
async function mount(name, matches = true) {
  const refs = [],
    effects = [],
    frames = new Map();
  const media = { ...target(), matches };
  const window = { ...target(), matchMedia: () => media };
  const document = { body: {}, documentElement: { classList: classes() } };
  let nextFrame = 0;
  const exports = {};
  const source = await readFile(
    new URL(`../src/components/${name}.tsx`, import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  runInNewContext(code, {
    exports,
    window,
    document,
    Element,
    requestAnimationFrame(fn) {
      const id = ++nextFrame;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    require(id) {
      if (id === "react")
        return {
          useRef() {
            const ref = { current: { style: {}, classList: classes() } };
            refs.push(ref);
            return ref;
          },
          useEffect(fn) {
            effects.push(fn);
          },
          useState() {
            throw new Error(
              "Pointer movement must not schedule React renders.",
            );
          },
        };
      if (id === "react-dom")
        return {
          createPortal: (_children, container) => {
            assert.equal(container, document.body);
            return null;
          },
        };
      if (id === "react/jsx-runtime")
        return { jsx: () => null, jsxs: () => null, Fragment: "fragment" };
      throw new Error(id);
    },
  });
  exports.default();
  const cleanups = effects.map((fn) => fn());
  return {
    window,
    document,
    media,
    refs,
    frames,
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    },
    unmount() {
      cleanups.forEach((fn) => fn());
    },
  };
}

for (const component of ["CustomCursor", "MouseSpotlight"]) {
  test(`${component}: pointer bursts use one frame and all listeners are cleaned up`, async () => {
    const app = await mount(component);
    const listeners = app.window.count();
    for (let round = 0; round < 30; round++) {
      for (let n = 0; n < 100; n++)
        app.window.emit("pointermove", { clientX: n, clientY: n + 10 });
      assert.equal(app.frames.size, 1);
      app.flush();
      assert.equal(app.window.count(), listeners);
      assert.equal(app.refs[0].current.style.opacity, "1");
    }
    const style = app.refs[0].current.style;
    assert.equal(
      style.translate ?? style.transform,
      component === "CustomCursor"
        ? "99px 109px"
        : "translate3d(-201px, -191px, 0)",
    );
    app.window.emit("pointermove", { clientX: 5, clientY: 5 });
    app.window.emit("blur");
    assert.equal(app.frames.size, 0);
    assert.equal(style.opacity, "0");
    app.media.matches = false;
    app.media.emit("change");
    assert.equal(app.window.count(), 0);
    app.media.matches = true;
    app.media.emit("change");
    assert.equal(app.window.count(), listeners);
    app.window.emit("pointermove", { clientX: 1, clientY: 1 });
    app.unmount();
    assert.equal(app.window.count(), 0);
    assert.equal(app.media.count(), 0);
    assert.equal(app.frames.size, 0);
    assert.equal(app.document.documentElement.classList.values.size, 0);
  });
  test(`${component}: touch and reduced-motion users have no pointer work`, async () => {
    const app = await mount(component, false);
    assert.equal(app.window.count(), 0);
    assert.equal(app.frames.size, 0);
    assert.equal(app.document.documentElement.classList.values.size, 0);
    app.unmount();
  });
}
test("cursor delegation supports newly inserted controls without attaching new listeners", async () => {
  const app = await mount("CustomCursor");
  const listeners = app.window.count();
  for (let i = 0; i < 1500; i++) {
    app.window.emit("pointerover", { target: new Element(true) });
    assert.equal(app.refs[0].current.classList.values.has("hovering"), true);
    app.window.emit("pointerout", { relatedTarget: new Element(false) });
    assert.equal(app.refs[0].current.classList.values.has("hovering"), false);
  }
  assert.equal(app.window.count(), listeners);
  app.unmount();
});

test("cursor yields to embedded players and resumes outside them", async () => {
  const app = await mount("CustomCursor");
  const iframe = new Element();
  iframe.tagName = "iframe";
  app.window.emit("pointermove", { clientX: 20, clientY: 30 });
  app.flush();
  app.window.emit("pointermove", { clientX: 21, clientY: 31 });
  app.window.emit("pointerout", { relatedTarget: iframe });
  assert.equal(app.frames.size, 0);
  assert.equal(app.refs[0].current.style.opacity, "0");
  app.window.emit("pointermove", { target: iframe, clientX: 22, clientY: 32 });
  assert.equal(app.frames.size, 0);
  app.window.emit("pointermove", {
    target: new Element(),
    clientX: 23,
    clientY: 33,
  });
  app.flush();
  assert.equal(app.refs[0].current.style.opacity, "1");
  app.unmount();
});
