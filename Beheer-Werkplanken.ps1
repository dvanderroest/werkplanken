<#
.SYNOPSIS
    PowerShell-beheerscript voor de Platformbeheerder van Mijn Werkplank.

.DESCRIPTION
    Biedt zowel een interactief keuzemenu als directe parameters (-Actie Status | Backup | Lint)
    om loges aan te sluiten, een eerste Secretaris te koppelen, Platformbeheerders te beheren,
    SQLite-backups te maken en alle PHP-bestanden op syntaxfouten te controleren.

.EXAMPLE
    .\Beheer-Werkplanken.ps1
    Opent het interactieve PowerShell-menu.

.EXAMPLE
    .\Beheer-Werkplanken.ps1 -Actie Backup
    Maakt direct een veilige backup van data\werkplanken.sqlite in data\backups\ (ideaal voor Windows Taakplanner).
#>
[CmdletBinding()]
param(
    [ValidateSet('Menu', 'Status', 'Backup', 'Lint')]
    [string]$Actie = 'Menu'
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Find-PhpExecutable {
    $cmd = Get-Command php.exe -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { return $cmd.Source }
    if (Test-Path 'C:\php\php.exe') { return 'C:\php\php.exe' }
    if (Test-Path 'C:\xampp\php\php.exe') { return 'C:\xampp\php\php.exe' }
    throw "php.exe niet gevonden. Controleer of PHP in PATH of C:\php staat."
}

$phpExe = Find-PhpExecutable
$cliScript = Join-Path $PSScriptRoot 'cli\beheer.php'

function Invoke-DatabaseBackup {
    $dbFile = Join-Path $PSScriptRoot 'data\werkplanken.sqlite'
    if (-not (Test-Path $dbFile)) {
        Write-Warning "Databasebestand nog niet aanwezig op $dbFile. Start eerst een keer status om te initialiseren."
        return
    }

    $backupDir = Join-Path $PSScriptRoot 'data\backups'
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $dest  = Join-Path $backupDir "werkplanken-$stamp.sqlite"

    # Gebruik SQLite's eigen veilige VACUUM INTO via PDO zodat lopende WAL-transacties netjes mee-gekopieerd worden
    $escapedDest = $dest.Replace("'", "''")
    $phpCode = "require 'app/bootstrap.php'; db()->exec(`"VACUUM INTO '$escapedDest'`");"
    & $phpExe -r $phpCode

    $sizeKb = [math]::Round((Get-Item $dest).Length / 1KB, 1)
    Write-Host "[OK] Veilige SQLite-backup opgeslagen: $dest ($sizeKb KB)" -ForegroundColor Green
}

function Invoke-PhpLint {
    $phpFiles = Get-ChildItem -Path $PSScriptRoot -Recurse -Filter '*.php' |
        Where-Object { $_.FullName -notmatch '\\data\\backups\\' }

    $errors = 0
    foreach ($file in $phpFiles) {
        $rel = $file.FullName.Substring($PSScriptRoot.Length + 1)
        $output = & $phpExe -l $file.FullName 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FOUT] $rel : $output" -ForegroundColor Red
            $errors++
        } else {
            Write-Host "[OK]   $rel" -ForegroundColor DarkGray
        }
    }

    if ($errors -gt 0) {
        throw "$errors PHP-bestand(en) bevatten syntaxfouten."
    }
    Write-Host "`nAlle $($phpFiles.Count) PHP-bestanden zijn 100% vrij van syntaxfouten!" -ForegroundColor Green
}

if ($Actie -eq 'Status') {
    & $phpExe $cliScript status
    exit $LASTEXITCODE
}
if ($Actie -eq 'Backup') {
    Invoke-DatabaseBackup
    exit 0
}
if ($Actie -eq 'Lint') {
    Invoke-PhpLint
    exit 0
}

# Interactief keuzemenu
while ($true) {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "  MIJN WERKPLANK — POWERSHELL PLATFORMBEHEER" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  1) Platformstatus tonen (loges, secretarissen & beheerders)"
    Write-Host "  2) Nieuwe loge aanmaken + eerste Secretaris aanwijzen"
    Write-Host "  3) Nieuwe Secretaris koppelen aan bestaande loge"
    Write-Host "  4) Platformbeheerder toevoegen"
    Write-Host "  5) Veilige SQLite-backup maken (data\backups\)"
    Write-Host "  6) PHP-syntaxiscontrole uitvoeren op alle bestanden"
    Write-Host "  0) Afsluiten"
    Write-Host "------------------------------------------------------------"

    $keuze = Read-Host "Maak een keuze (0-6)"

    switch ($keuze) {
        '1' {
            & $phpExe $cliScript status
        }
        '2' {
            $nr       = Read-Host "Logenummer (bijv. 142)"
            $naam     = Read-Host "Naam van de loge (zonder 'Loge', bijv. De Morgenster)"
            $stad     = Read-Host "Oosten / Stad (bijv. Groningen)"
            $adres    = Read-Host "Volledig adres van het logegebouw"
            $secNaam  = Read-Host "Volledige naam eerste Secretaris (bijv. Br. Piet Bakker)"
            $secEmail = Read-Host "E-mailadres eerste Secretaris"
            & $phpExe $cliScript nieuw-loge $nr $naam $stad $adres $secNaam $secEmail
        }
        '3' {
            $nr       = Read-Host "Logenummer van de bestaande loge (bijv. 42)"
            $secNaam  = Read-Host "Volledige naam nieuwe Secretaris"
            $secEmail = Read-Host "E-mailadres nieuwe Secretaris"
            & $phpExe $cliScript koppel-secretaris $nr $secNaam $secEmail
        }
        '4' {
            $email = Read-Host "E-mailadres voor Platformbeheerder"
            $naam  = Read-Host "Volledige naam (alleen nodig als account nog niet bestaat)"
            if ([string]::IsNullOrWhiteSpace($naam)) {
                & $phpExe $cliScript maak-beheerder $email
            } else {
                & $phpExe $cliScript maak-beheerder $email $naam
            }
        }
        '5' {
            Invoke-DatabaseBackup
        }
        '6' {
            Invoke-PhpLint
        }
        '0' {
            Write-Host "Tot ziens!" -ForegroundColor Cyan
            break
        }
        default {
            Write-Warning "Ongeldige keuze, kies een nummer van 0 t/m 6."
        }
    }

    if ($keuze -eq '0') { break }
}
