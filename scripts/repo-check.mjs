/**
 * Lightweight repository-hygiene check.
 *
 * These are heuristics, not proofs: they catch the obvious mistakes that slip
 * past tsc, ESLint and the test runner (a test left skipped, a stray
 * console.log, a hard-coded key). Passing this does not mean the code is
 * correct — the type-check, lint, tests and build do that work.
 */
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const SOURCE = /^src\/.*\.(ts|tsx)$/
const TEST = /\.test\.tsx?$/

/** @type {{ name: string, files: RegExp, pattern: RegExp, hint: string }[]} */
const RULES = [
  {
    name: 'skipped test',
    files: TEST,
    pattern: /\b(?:describe|it|test)\s*\.\s*(?:skip|todo|only)\b|\b(?:xit|xdescribe)\s*\(/,
    hint: 'a disabled or focused test hides failures from the suite',
  },
  {
    name: 'debug code',
    files: SOURCE,
    pattern: /\bconsole\s*\.\s*(?:log|debug|dir)\s*\(|\bdebugger\b|\balert\s*\(/,
    hint: 'remove debug output before merging',
  },
  {
    name: 'escape hatch',
    files: SOURCE,
    pattern: /\bas\s+any\b|:\s*any\b|@ts-(?:ignore|nocheck|expect-error)|eslint-disable/,
    hint: 'suppressing the type system or the linter needs a better fix',
  },
  {
    name: 'possible secret',
    files: SOURCE,
    pattern: /\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/,
    hint: 'credentials must never be committed',
  },
]

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)

/** @type {string[]} */
const failures = []

for (const file of tracked) {
  const rules = RULES.filter((rule) => rule.files.test(file))
  // A tracked file can be staged for deletion and already gone from disk.
  if (rules.length === 0 || !existsSync(file)) continue

  const lines = readFileSync(file, 'utf8').split('\n')
  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        failures.push(`${file}:${index + 1}  ${rule.name} — ${rule.hint}\n    ${line.trim()}`)
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`repo-check found ${String(failures.length)} problem(s):\n`)
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`repo-check: ${String(tracked.length)} tracked files, no problems found.`)
