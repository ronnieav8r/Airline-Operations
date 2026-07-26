param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $TsxArgs
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $repoRoot ".env.local"

if (!(Test-Path $envFile)) {
  Write-Error ".env.local was not found. Copy .env.local.example to .env.local before running local scripts."
  exit 1
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()

  if ($line.Length -eq 0 -or $line.StartsWith("#")) {
    return
  }

  $separator = $line.IndexOf("=")

  if ($separator -lt 1) {
    return
  }

  $key = $line.Substring(0, $separator).Trim()
  $value = $line.Substring($separator + 1).Trim()

  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  [Environment]::SetEnvironmentVariable($key, $value, "Process")
}

npx tsx @TsxArgs
exit $LASTEXITCODE
