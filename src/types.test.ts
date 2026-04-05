import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RingBuffer } from "./types.js";

describe("RingBuffer", () => {
  it("stores and retrieves lines", () => {
    const buf = new RingBuffer(100);
    buf.push("hello");
    buf.push("world");
    const { lines, offset } = buf.getLines(0);
    assert.deepEqual(lines, ["hello", "world"]);
    assert.equal(offset, 2);
  });

  it("respects max capacity", () => {
    const buf = new RingBuffer(3);
    buf.push("a");
    buf.push("b");
    buf.push("c");
    buf.push("d");
    const { lines } = buf.getLines(0);
    assert.deepEqual(lines, ["b", "c", "d"]);
    assert.equal(buf.length, 3);
  });

  it("supports offset-based reading", () => {
    const buf = new RingBuffer(100);
    buf.push("line1");
    buf.push("line2");
    buf.push("line3");

    const first = buf.getLines(0);
    assert.equal(first.offset, 3);

    buf.push("line4");
    const next = buf.getLines(first.offset);
    assert.deepEqual(next.lines, ["line4"]);
    assert.equal(next.offset, 4);
  });

  it("clamps negative offset to 0", () => {
    const buf = new RingBuffer(100);
    buf.push("a");
    const { lines } = buf.getLines(-5);
    assert.deepEqual(lines, ["a"]);
  });

  it("clamps offset beyond length", () => {
    const buf = new RingBuffer(100);
    buf.push("a");
    const { lines } = buf.getLines(999);
    assert.deepEqual(lines, []);
  });

  it("pushMultiple splits on newlines", () => {
    const buf = new RingBuffer(100);
    buf.pushMultiple("hello\nworld\nfoo");
    const { lines } = buf.getLines(0);
    assert.deepEqual(lines, ["hello", "world", "foo"]);
  });

  it("returns all lines when since is omitted", () => {
    const buf = new RingBuffer(100);
    buf.push("a");
    buf.push("b");
    const { lines } = buf.getLines();
    assert.deepEqual(lines, ["a", "b"]);
  });
});
