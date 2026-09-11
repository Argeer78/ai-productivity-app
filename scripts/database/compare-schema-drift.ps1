[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9_.-]+$')]
    [string]$ExpectedService,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9_.-]+$')]
    [string]$ActualService,

    [string]$OutputDirectory = (Join-Path $env:TEMP 'aiprod-schema-drift')
)

$ErrorActionPreference = 'Stop'
$fingerprintSql = Join-Path $PSScriptRoot 'schema_fingerprint.sql'

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql is required and was not found on PATH.'
}

if (-not (Test-Path -LiteralPath $fingerprintSql -PathType Leaf)) {
    throw "Fingerprint SQL not found: $fingerprintSql"
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$expectedPath = Join-Path $OutputDirectory 'expected.tsv'
$actualPath = Join-Path $OutputDirectory 'actual.tsv'
$diffPath = Join-Path $OutputDirectory 'schema.diff.txt'

function Write-Fingerprint {
    param(
        [string]$Service,
        [string]$Destination
    )

    & psql "service=$Service" -X -v ON_ERROR_STOP=1 -f $fingerprintSql |
        Set-Content -LiteralPath $Destination -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        throw "Schema fingerprint failed for PostgreSQL service '$Service'."
    }
}

Write-Fingerprint -Service $ExpectedService -Destination $expectedPath
Write-Fingerprint -Service $ActualService -Destination $actualPath

$expectedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $expectedPath).Hash
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $actualPath).Hash

if ($expectedHash -eq $actualHash) {
    Remove-Item -LiteralPath $diffPath -ErrorAction SilentlyContinue
    Write-Output "Schema fingerprints match: $expectedHash"
    exit 0
}

$difference = Compare-Object \
    -ReferenceObject (Get-Content -LiteralPath $expectedPath) \
    -DifferenceObject (Get-Content -LiteralPath $actualPath)
$difference | Format-Table -AutoSize | Out-String | Set-Content -LiteralPath $diffPath

Write-Error "Schema drift detected. Review $diffPath"
exit 1