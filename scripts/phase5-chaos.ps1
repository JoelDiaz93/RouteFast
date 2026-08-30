param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('rabbitmq','redis','tracking-db')]
  [string]$Target,
  [int]$Seconds = 15
)

$container = switch ($Target) {
  'rabbitmq' { 'routefast-rabbitmq' }
  'redis' { 'routefast-redis' }
  'tracking-db' { 'routefast-tracking-postgis' }
}

Write-Host "Stopping $container for $Seconds seconds..."
docker stop $container | Out-Host
Start-Sleep -Seconds $Seconds
Write-Host "Starting $container..."
docker start $container | Out-Host
Write-Host "Failure injection completed. Inspect Jaeger, Grafana, structured logs and RabbitMQ as applicable."
