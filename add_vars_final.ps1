# Script PowerShell para adicionar variáveis ao Cloudflare
# Cole seu token quando pedir e pronto!

$ACCOUNT_ID = "5e7a6d96219ace37638854a076286a8e"
$WORKER_NAME = "late-feather-031byoga-pele-capi"
$PIXEL_ID = "69cb295f725a1b96c762db43"
$ACCESS_TOKEN = "EAAQjs5iKBGsBRN3ttvkjvKM6ChZBGEo5VZBtKs7lUJyjA0ab9J2T2UPN5ZAZAdU21maEylbeRcHeLJlGRQEWQ1cV3mjbgY94y45F8yJkgIKOS5yMGtQUdaWLph5oScuieabqPRZBSMr2ZBLBtZAZA4UOyoxpOtAJYcYLNsEefJ6NzqauA9aPA0UPtiJtJ5WCErSwwgZDZD"

Write-Host "================================" -ForegroundColor Yellow
Write-Host "Cloudflare Variables Manager" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""

# Cole seu token aqui (ou passe como argumento)
$CF_TOKEN = "cfut_oXPqiBe91H90bf3YddbYh2eNuA5iEAByzVRxSW3Sd417ce04"

Write-Host "Token: $($CF_TOKEN.Substring(0, 10))..." -ForegroundColor Green
Write-Host ""

$BASE_URL = "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/services/$WORKER_NAME/environments/production"

# Headers
$headers = @{
    "Authorization" = "Bearer $CF_TOKEN"
    "Content-Type"  = "application/json"
}

# 1. Adicionar PIXEL_ID
Write-Host "1. Adicionando PIXEL_ID..." -ForegroundColor Cyan

$body1 = @{
    name = "PIXEL_ID"
    text = $PIXEL_ID
} | ConvertTo-Json

try {
    $response1 = Invoke-WebRequest -Uri "$BASE_URL/variables" `
        -Method POST `
        -Headers $headers `
        -Body $body1

    Write-Host "✅ PIXEL_ID adicionado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao adicionar PIXEL_ID:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""

# 2. Adicionar ACCESS_TOKEN
Write-Host "2. Adicionando ACCESS_TOKEN..." -ForegroundColor Cyan

$body2 = @{
    name = "ACCESS_TOKEN"
    text = $ACCESS_TOKEN
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri "$BASE_URL/secrets" `
        -Method POST `
        -Headers $headers `
        -Body $body2

    Write-Host "✅ ACCESS_TOKEN adicionado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao adicionar ACCESS_TOKEN:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ CONCLUÍDO!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "Variáveis adicionadas:" -ForegroundColor Cyan
Write-Host "  • PIXEL_ID = 69cb295f725a1b96c762db43" -ForegroundColor Green
Write-Host "  • ACCESS_TOKEN = (oculto - é um secret)" -ForegroundColor Green
Write-Host ""

Write-Host "Verificar em:" -ForegroundColor Yellow
Write-Host "https://dash.cloudflare.com/$ACCOUNT_ID/workers/services/$WORKER_NAME/production/settings#variables" -ForegroundColor Blue
Write-Host ""

Write-Host "Próximas ações:" -ForegroundColor Yellow
Write-Host "  1. Deploy CAPI Code (opcional)" -ForegroundColor White
Write-Host "  2. Rodar testes de validação" -ForegroundColor White
Write-Host "  3. Começar a rodar tráfego!" -ForegroundColor White
