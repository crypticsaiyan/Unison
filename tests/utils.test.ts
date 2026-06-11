import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("filters falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
  })

  it("handles conditional classes", () => {
    const active = true
    expect(cn("base", active && "active")).toBe("base active")
    expect(cn("base", !active && "inactive")).toBe("base")
  })

  it("returns empty string for no input", () => {
    expect(cn()).toBe("")
  })
})
