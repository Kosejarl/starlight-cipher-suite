# sign_app.ps1
# Script to create a self-signed code-signing certificate and sign the compiled Starlight executable.

$CertSubject = "CN=Starlight Cipher Suite Developer"
$CertStorePath = "Cert:\CurrentUser\My"
$TargetExe = "dist\StarlightCipherSuite.exe"

if (-not (Test-Path $TargetExe)) {
    Write-Error "Could not find $TargetExe. Please build the application first using PyInstaller."
    exit 1
}

# 1. Look for an existing code-signing certificate we created
Write-Host "Checking for existing Starlight Code Signing certificate..." -ForegroundColor Cyan
$Cert = Get-ChildItem -Path $CertStorePath | Where-Object { $_.Subject -eq $CertSubject } | Select-Object -First 1

if ($null -eq $Cert) {
    Write-Host "No certificate found. Creating a new self-signed Code Signing Certificate..." -ForegroundColor Yellow
    # Create the certificate in CurrentUser\My store
    $Cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $CertSubject -KeyUsage DigitalSignature -FriendlyName "Starlight Code Signing Cert" -CertStoreLocation $CertStorePath
    Write-Host "Created certificate with Thumbprint: $($Cert.Thumbprint)" -ForegroundColor Green
} else {
    Write-Host "Found existing certificate with Thumbprint: $($Cert.Thumbprint)" -ForegroundColor Green
}

# 2. Export the public key certificate (.cer)
$PublicCertPath = "StarlightRoot.cer"
Write-Host "Exporting public certificate to $PublicCertPath..." -ForegroundColor Cyan
Export-Certificate -Cert $Cert -FilePath $PublicCertPath -Type CERT | Out-Null
Write-Host "Exported!" -ForegroundColor Green

# 3. Trust the certificate locally (CurrentUser scope, no admin required)
Write-Host "Installing certificate to Current User's Trusted Roots and Trusted Publishers..." -ForegroundColor Cyan
Import-Certificate -FilePath $PublicCertPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
Import-Certificate -FilePath $PublicCertPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher | Out-Null
Write-Host "Certificate is now locally trusted for this user account!" -ForegroundColor Green

# 4. Sign the executable
Write-Host "Signing $TargetExe..." -ForegroundColor Cyan
$Signature = Set-AuthenticodeSignature -FilePath $TargetExe -Certificate $Cert
if ($Signature.Status -eq "Valid") {
    Write-Host "Successfully signed! $TargetExe is now authenticated by the certificate." -ForegroundColor Green
} else {
    Write-Warning "Signing status: $($Signature.Status) - $($Signature.StatusMessage)"
}
