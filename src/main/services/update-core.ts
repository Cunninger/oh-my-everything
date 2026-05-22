import type { UpdateAsset, UpdateCheckResult, UpdateSettings } from '../../shared/types'

const DEFAULT_NORMALIZED_UPDATE_SETTINGS: UpdateSettings = {
  autoCheckOnStartup: true,
  proxyEnabled: true,
  proxyTemplate: 'https://gh-proxy.com/{url}',
  preferInstaller: true,
}

export interface GitHubReleaseAsset {
  name: string
  size: number
  browser_download_url: string
}

export interface GitHubRelease {
  tag_name: string
  name?: string
  html_url: string
  body?: string
  published_at?: string
  assets: GitHubReleaseAsset[]
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a)
  const right = parseVersion(b)
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i++) {
    const delta = (left[i] || 0) - (right[i] || 0)
    if (delta !== 0) return delta > 0 ? 1 : -1
  }
  return 0
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0
}

export function selectReleaseAsset(release: GitHubRelease, preferInstaller: boolean): GitHubReleaseAsset | null {
  const executableAssets = release.assets.filter(asset => /\.exe$/i.test(asset.name))
  const installer = executableAssets.find(asset => /setup|nsis|installer/i.test(asset.name))
  const portable = executableAssets.find(asset => /portable/i.test(asset.name)) ||
    executableAssets.find(asset => !/setup|nsis|installer/i.test(asset.name))
  return preferInstaller ? (installer || portable || null) : (portable || installer || null)
}

export function rewriteDownloadUrl(url: string, settings: Pick<UpdateSettings, 'proxyEnabled' | 'proxyTemplate'>): string {
  if (!settings.proxyEnabled) return url
  const template = settings.proxyTemplate.trim()
  if (!template) return url
  const encodedUrl = encodeURIComponent(url)

  if (template.includes('{url}')) {
    return template.replaceAll('{url}', url).replaceAll('{encodedUrl}', encodedUrl)
  }
  if (template.includes('{encodedUrl}')) {
    return template.replaceAll('{encodedUrl}', encodedUrl)
  }
  return `${template.replace(/\/+$/, '')}/${url}`
}

export function toUpdateCheckResult(
  release: GitHubRelease,
  currentVersion: string,
  settings: UpdateSettings
): UpdateCheckResult {
  const latestVersion = release.tag_name.replace(/^v/i, '')
  const selectedAsset = selectReleaseAsset(release, settings.preferInstaller)
  const asset: UpdateAsset | null = selectedAsset
    ? {
        name: selectedAsset.name,
        size: selectedAsset.size,
        url: selectedAsset.browser_download_url,
        proxiedUrl: rewriteDownloadUrl(selectedAsset.browser_download_url, settings),
        kind: /setup|nsis|installer/i.test(selectedAsset.name) ? 'installer' : 'portable',
      }
    : null

  return {
    currentVersion,
    latestVersion,
    hasUpdate: isNewerVersion(latestVersion, currentVersion),
    releaseName: release.name || release.tag_name,
    releaseUrl: release.html_url,
    releaseNotes: release.body || '',
    publishedAt: release.published_at || '',
    asset,
  }
}

export function normalizeUpdateSettings(value: unknown): UpdateSettings {
  const updates = isRecord(value) ? value : {}
  return {
    autoCheckOnStartup: typeof updates.autoCheckOnStartup === 'boolean'
      ? updates.autoCheckOnStartup
      : DEFAULT_NORMALIZED_UPDATE_SETTINGS.autoCheckOnStartup,
    proxyEnabled: typeof updates.proxyEnabled === 'boolean'
      ? updates.proxyEnabled
      : DEFAULT_NORMALIZED_UPDATE_SETTINGS.proxyEnabled,
    proxyTemplate: normalizeOptionalString(updates.proxyTemplate) || DEFAULT_NORMALIZED_UPDATE_SETTINGS.proxyTemplate,
    preferInstaller: typeof updates.preferInstaller === 'boolean'
      ? updates.preferInstaller
      : DEFAULT_NORMALIZED_UPDATE_SETTINGS.preferInstaller,
  }
}

function parseVersion(version: string): number[] {
  const normalized = version.replace(/^v/i, '').split('-')[0]
  return normalized.split('.').map(part => {
    const parsed = parseInt(part.replace(/\D.*$/, ''), 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
