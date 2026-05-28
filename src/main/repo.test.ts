import { test, expect, describe } from 'bun:test'
import { parseRemote } from './repo'

describe('parseRemote', () => {
  test('https URL → host + path, strips .git', () => {
    expect(parseRemote('https://gitlab.example.com/owner/project.git')).toEqual({
      host: 'gitlab.example.com',
      path: 'owner/project',
    })
  })

  test('https without .git', () => {
    expect(parseRemote('https://github.com/owner/repo')).toEqual({
      host: 'github.com',
      path: 'owner/repo',
    })
  })

  test('scp-like ssh URL', () => {
    expect(parseRemote('git@github.com:owner/repo.git')).toEqual({
      host: 'github.com',
      path: 'owner/repo',
    })
  })

  test('ssh:// URL with nested group path', () => {
    expect(parseRemote('ssh://git@gitlab.example.com/group/sub/proj.git')).toEqual({
      host: 'gitlab.example.com',
      path: 'group/sub/proj',
    })
  })

  test('https with embedded credentials', () => {
    expect(parseRemote('https://user:token@gitlab.example.com/a/b.git')).toEqual({
      host: 'gitlab.example.com',
      path: 'a/b',
    })
  })

  test('garbage → null', () => {
    expect(parseRemote('not a url')).toBeNull()
    expect(parseRemote('')).toBeNull()
  })
})
