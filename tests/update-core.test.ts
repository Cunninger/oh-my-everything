import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_UPDATE_SETTINGS } from '../src/shared/constants.ts'
import {
  compareVersions,
  normalizeUpdateSettings,
  rewriteDownloadUrl,
  selectReleaseAsset,
  toUpdateCheckResult,
  type GitHubRelease,
} from '../src/main/services/update-core.ts'

const release: GitHubRelease = {
  tag_name: 'v0.1.3',
  name: 'v0.1.3',
  html_url: 'https://github.com/Cunninger/oh-my-everything/releases/tag/v0.1.3',
  body: 'notes',
  published_at: '2026-05-20T00:00:00Z',
  assets: [
    {
      name: 'oh-my-everything-0.1.3-win-x64-portable.exe',
      size: 100,
      browser_download_url: 'https://github.com/Cunninger/oh-my-everything/releases/download/v0.1.3/oh-my-everything.0.1.3.exe',
    },
    {
      name: 'oh-my-everything-0.1.3-win-x64-nsis.exe',
      size: 200,
      browser_download_url: 'https://github.com/Cunninger/oh-my-everything/releases/download/v0.1.3/oh-my-everything.Setup.0.1.3.exe',
    },
  ],
}

describe('update core', () => {
  it('compares semantic versions numerically and ignores prerelease suffixes', () => {
    assert.equal(compareVersions('0.1.10', '0.1.9'), 1)
    assert.equal(compareVersions('v0.1.3-beta.1', '0.1.3'), 0)
    assert.equal(compareVersions('0.1.2', '0.1.3'), -1)
  })

  it('selects installer first when preferred and portable first otherwise', () => {
    assert.equal(selectReleaseAsset(release, true)?.name, 'oh-my-everything-0.1.3-win-x64-nsis.exe')
    assert.equal(selectReleaseAsset(release, false)?.name, 'oh-my-everything-0.1.3-win-x64-portable.exe')
  })

  it('rewrites download URLs through proxy templates', () => {
    const url = release.assets[0].browser_download_url
    assert.equal(rewriteDownloadUrl(url, { proxyEnabled: false, proxyTemplate: 'https://gh-proxy.com/{url}' }), url)
    assert.equal(rewriteDownloadUrl(url, { proxyEnabled: true, proxyTemplate: 'https://gh-proxy.com/{url}' }), `https://gh-proxy.com/${url}`)
    assert.equal(rewriteDownloadUrl(url, { proxyEnabled: true, proxyTemplate: 'https://mirror.example.com' }), `https://mirror.example.com/${url}`)
  })

  it('builds update check results and defaults update settings when absent', () => {
    const result = toUpdateCheckResult(release, '0.1.2', { ...DEFAULT_UPDATE_SETTINGS })
    assert.equal(result.hasUpdate, true)
    assert.equal(result.latestVersion, '0.1.3')
    assert.equal(result.asset?.kind, 'installer')
    assert.equal(result.asset?.proxiedUrl.startsWith('https://gh-proxy.com/https://github.com/'), true)
  })

  it('normalizes missing update settings for old config files', () => {
    assert.deepEqual(normalizeUpdateSettings(undefined), DEFAULT_UPDATE_SETTINGS)
    assert.deepEqual(normalizeUpdateSettings({ proxyEnabled: false }), {
      ...DEFAULT_UPDATE_SETTINGS,
      proxyEnabled: false,
    })
  })
})
