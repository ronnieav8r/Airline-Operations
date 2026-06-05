param(
  [Parameter(Position = 0, Mandatory = $true)]
  [string] $Command,
  [switch] $Detach,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $ComposeArgs
)

$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
$dockerApp = "C:\Program Files\Docker\Docker"

$env:PATH = "$dockerBin;$dockerApp;$env:PATH"

$args = @($Command)

if ($Detach) {
  $args += "--detach"
}

$args += $ComposeArgs

& "$dockerBin\docker.exe" compose @args
exit $LASTEXITCODE
