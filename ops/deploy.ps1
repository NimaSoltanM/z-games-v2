param(
  [string]$Server = "109.122.247.5",
  [string]$User = "root",
  [string]$IdentityFile = "C:\Users\manim\.ssh\z-games-production"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseId = (Get-Date).ToUniversalTime().ToString(
  "yyyyMMddHHmmss",
  [System.Globalization.CultureInfo]::InvariantCulture
)
$archive = Join-Path ([System.IO.Path]::GetTempPath()) "z-games-$releaseId.tar.gz"
$remoteArchive = "/tmp/z-games-$releaseId.tar.gz"
$remoteSource = "/opt/z-games/incoming/$releaseId/source"

function Invoke-NativeChecked {
  param(
    [Parameter(Mandatory)] [string]$Command,
    [Parameter(Mandatory)] [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE"
  }
}

try {
  Push-Location $repoRoot
  try {
    Invoke-NativeChecked tar @(
      "-czf", $archive,
      "--exclude=.git",
      "--exclude=backend/.env",
      "--exclude=backend/tmp",
      "--exclude=backend/uploads",
      "--exclude=backend/uploads-returns",
      "--exclude=frontend/.env",
      "--exclude=frontend/node_modules",
      "--exclude=frontend/dist",
      "--exclude=frontend/.tanstack",
      "--exclude=frontend/public/guides",
      "--exclude=*.log",
      "backend", "frontend", "ops", "README.md", "PROJECT.md"
    )
  }
  finally {
    Pop-Location
  }

  $sshCommon = @(
    "-i", $IdentityFile,
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=yes"
  )
  Invoke-NativeChecked scp ($sshCommon + @($archive, "${User}@${Server}:${remoteArchive}"))

  $remoteCommand = @(
    "set -Eeuo pipefail",
    "install -d -m 0750 -o root -g zgames '$remoteSource'",
    "tar -xzf '$remoteArchive' -C '$remoteSource'",
    "bash '$remoteSource/ops/scripts/deploy-release.sh' '$releaseId'"
  ) -join "; "
  Invoke-NativeChecked ssh ($sshCommon + @("${User}@${Server}", $remoteCommand))
  Write-Host "Release $releaseId deployed successfully."
}
finally {
  if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force
  }
}
