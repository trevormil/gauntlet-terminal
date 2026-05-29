import { test, expect, describe } from 'bun:test'
import { pluginNamespaceFromSkillPath } from './skills'

describe('pluginNamespaceFromSkillPath', () => {
  const cache = '/Users/x/.claude/plugins/cache'
  test('derives the plugin namespace (segment above the version dir)', () => {
    expect(
      pluginNamespaceFromSkillPath(`${cache}/compound-engineering-plugin/compound-engineering/3.8.3/skills/ce-debug/SKILL.md`),
    ).toBe('compound-engineering')
    expect(pluginNamespaceFromSkillPath(`${cache}/bitbadges/bitbadges/0.1.0/skills/build/SKILL.md`)).toBe(
      'bitbadges',
    )
    expect(
      pluginNamespaceFromSkillPath(`${cache}/claude-plugins-official/frontend-design/unknown/skills/frontend-design/SKILL.md`),
    ).toBe('frontend-design')
    expect(pluginNamespaceFromSkillPath(`${cache}/claude-code-toolkit/nopeek/0.0.23/skills/nopeek/SKILL.md`)).toBe(
      'nopeek',
    )
  })
})
