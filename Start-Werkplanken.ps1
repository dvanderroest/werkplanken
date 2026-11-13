<#
.SYNOPSIS
    Start de lokale PHP-ontwikkelserver voor Mijn Werkplank op http://localhost:3000.

.DESCRIPTION
    Zoekt automatisch naar een geïnstalleerde PHP 8+ versie op Windows (PATH, C:\php, XAMPP, Laragon),
    controleert of PDO SQLite aanstaat, initialiseert zo nodig de SQLite-database met voorbeeldloges
    en start de ingebouwde PHP-webserver met router.php.

.PARAMETER Port
    Poortnummer waarop de lokale server luistert (standaard: 3000).

.PARAMETER NoBrowser
    Geef deze vlag mee als de standaardbrowser niet automatisch geopend hoeft te worden.
#>
[CmdletBinding()]
param(
    [int]$Port = 3000,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Find-PhpExecutable {
    $cmd = Get-Command php.exe -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        return $cmd.Source
    }

    $candidates = @(
        'C:\php\php.exe',
        'C:\xampp\php\php.exe',
        'C:\wamp64\bin\php\php*\php.exe',
        'C:\laragon\bin\php\php*\php.exe',
        "$env:LOCALAPPDATA\Programs\PHP\php.exe"
    )

    foreach ($pattern in $candidates) {
        $found = Get-Item -Path $pattern -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($found) {
            return $found.FullName
        }
    }

    throw "PHP (php.exe) is niet gevonden op deze computer. Plaats PHP 8+ in C:\php of installeer PHP via winget: winget install PHP.PHP.8.4"
}

$phpExe = Find-PhpExecutable
$modules = & $phpExe -m
if ($modules -notcontains 'pdo_sqlite') {
    throw "De PHP-extensie 'pdo_sqlite' staat nog uit in php.ini. Haal de puntkomma weg voor extension=pdo_sqlite in de map van $phpExe."
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Mijn Werkplank (100% PHP + SQLite)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PHP gevonden : $phpExe" -ForegroundColor Gray
Write-Host "Webadres     : http://localhost:$Port" -ForegroundColor Green
Write-Host "(Druk op Ctrl+C om de lokale server weer te stoppen)`n" -ForegroundColor Yellow

# Zorg dat schema + voorbeelddata klaarstaan en toon kort overzicht
& $phpExe "$PSScriptRoot\cli\beheer.php" status

if (-not $NoBrowser) {
    Start-Process "http://localhost:$Port"
}

& $phpExe -S "localhost:$Port" "$PSScriptRoot\router.php"
