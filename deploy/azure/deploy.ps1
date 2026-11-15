param(
    [string]$AzureCli = 'az',
    [string]$Subscription,
    [ValidatePattern('^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$')]
    [string]$AppName,
    [string]$Location = 'spaincentral'
)

$ErrorActionPreference = 'Stop'
$package = Join-Path $PSScriptRoot 'novapulse-azure.zip'
if (-not (Test-Path -LiteralPath $package -PathType Leaf)) {
    throw 'Create the deployment ZIP with python deploy/azure/package.py first.'
}

function Invoke-AzureCli {
    & $AzureCli @args
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI failed: az $($args[0]) $($args[1]) (exit $LASTEXITCODE)."
    }
}

$accountArgs = @()
if ($Subscription) { $accountArgs = @('--subscription', $Subscription) }
$subscriptionId = Invoke-AzureCli account show @accountArgs --query id -o tsv --only-show-errors
if (-not $subscriptionId) { throw 'Sign in to Azure and select a subscription.' }

if (-not $AppName) {
    $hash = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($subscriptionId)
        $suffix = [BitConverter]::ToString($hash.ComputeHash($bytes), 0, 6).Replace('-', '').ToLowerInvariant()
        $AppName = "novapulse-$suffix"
    } finally {
        $hash.Dispose()
    }
}

$group = "$AppName-rg"
$planName = "$AppName-f1"
$scope = @('--subscription', $subscriptionId, '--only-show-errors')
$target = @('--resource-group', $group, '--name', $AppName) + $scope
$tag = 'novapulse-demo'

Write-Host "Preparing Linux App Service F1 in $Location."
if ((Invoke-AzureCli group exists --name $group @scope -o tsv) -eq 'true') {
    $existingTag = Invoke-AzureCli group show --name $group @scope --query tags.project -o tsv
    if ($existingTag -ne $tag) { throw "Resource group $group belongs to a different deployment. Choose another AppName." }
} else {
    Invoke-AzureCli group create --name $group --location $Location --tags "project=$tag" @scope -o none
}

$plan = Invoke-AzureCli appservice plan list --resource-group $group @scope -o json |
    ConvertFrom-Json | Where-Object name -EQ $planName | Select-Object -First 1
if (-not $plan) {
    $plan = Invoke-AzureCli appservice plan create --name $planName --resource-group $group --location $Location --sku F1 --is-linux @scope -o json |
        ConvertFrom-Json
}
$planRunsOnLinux = $plan.reserved -eq $true -or $plan.properties.reserved -eq $true
if ($plan.sku.name -ne 'F1' -or -not $planRunsOnLinux) {
    throw "The existing App Service plan $planName must be Linux and use the free F1 tier."
}

$site = Invoke-AzureCli webapp list --resource-group $group @scope -o json |
    ConvertFrom-Json | Where-Object name -EQ $AppName | Select-Object -First 1
if (-not $site) {
    $site = Invoke-AzureCli webapp create @target --plan $plan.id --runtime 'PYTHON:3.13' -o json |
        ConvertFrom-Json
}
$siteDetails = $site
if ($site.properties) { $siteDetails = $site.properties }
if ($siteDetails.serverFarmId -ne $plan.id) { throw "$AppName is attached to another hosting plan." }
if (-not $siteDetails.defaultHostName) { throw "$AppName does not have a default hostname yet." }
$url = "https://$($siteDetails.defaultHostName)"

Invoke-AzureCli webapp update @target --https-only true --basic-auth Disabled -o none
Invoke-AzureCli webapp config set @target --startup-file 'python -m uvicorn azure_app:app --host 0.0.0.0 --port 8000' -o none
Invoke-AzureCli webapp config appsettings set @target --settings 'SCM_DO_BUILD_DURING_DEPLOYMENT=true' 'NOVAPULSE_DB_PATH=/tmp/novapulse/mission.sqlite' "ALLOWED_ORIGINS=$url" -o none

Write-Host "Uploading NovaPulse to $url. Azure will install the Python dependencies."
Invoke-AzureCli webapp deploy @target --src-path $package --type zip --timeout 600000 -o none

for ($attempt = 0; $attempt -lt 12; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri "$url/api/v1/health" -TimeoutSec 10
        $page = Invoke-WebRequest -Uri "$url/" -UseBasicParsing -TimeoutSec 10
        if ($health.status -eq 'healthy' -and $page.Content -match '<title>NovaPulse') {
            Write-Output "$url/"
            return
        }
    } catch {
        Write-Verbose $_.Exception.Message
    }
    Start-Sleep -Seconds 5
}

throw "Deployment was uploaded, but NovaPulse did not become ready at $url. Check the App Service deployment logs."
