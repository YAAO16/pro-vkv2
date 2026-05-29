# ============================================
# SCRIPT DE PRUEBAS - CON LOGIN CADA VEZ
# ============================================

Write-Host "=== LOGIN PARA OBTENER TOKEN ===" -ForegroundColor Cyan

# 1. Login para obtener token nuevo
$body = @{username="Eduar_admin"; password="Edu@rvp2026#"} | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $login.access_token
Write-Host "Token obtenido: $token" -ForegroundColor Green

# Headers con el token nuevo
$headers = @{Authorization = "Bearer $token"}

# 2. Probar /auth/me
Write-Host "`n=== PERFIL (/auth/me) ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/me" -Headers $headers
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Probar /sedes/
Write-Host "`n=== SEDES (/sedes/) ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/sedes/" -Headers $headers
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Probar /productos/
Write-Host "`n=== PRODUCTOS (/productos/) ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/productos/" -Headers $headers
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Probar /usuarios/
Write-Host "`n=== USUARIOS (/usuarios/) ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/usuarios/" -Headers $headers
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Probar /reportes/dashboard
Write-Host "`n=== DASHBOARD (/reportes/dashboard) ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/reportes/dashboard" -Headers $headers
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Probar /ventas/
Write-Host "`n=== VENTAS (/ventas/) ===" -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/ventas/" -Headers $headers
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "PRUEBAS COMPLETADAS" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green