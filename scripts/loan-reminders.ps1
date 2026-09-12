# Loan due-date reminder job.
# Register with Windows Task Scheduler to run once every workday morning, e.g.:
#
#   schtasks /Create /TN "ITService-LoanReminders" /SC WEEKLY /D MON,TUE,WED,THU,FRI `
#     /ST 08:15 /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\itservice-rebuild\itservice-app\scripts\loan-reminders.ps1"
#
# Configure these environment variables on the machine that runs the task:
#   IT_SERVICE_BASE_URL       (optional; defaults to localhost)
#   IT_SERVICE_CRON_SECRET    (required; must equal CRON_SECRET in .env)
# Keeping the secret out of this file also prevents it from being committed or
# appearing in the request URL / proxy logs.

$BaseUrl = if ($env:IT_SERVICE_BASE_URL) { $env:IT_SERVICE_BASE_URL.TrimEnd('/') } else { "http://localhost:3000" }
$Token = $env:IT_SERVICE_CRON_SECRET

if (-not $Token) {
    Write-Error "IT_SERVICE_CRON_SECRET is not set; refusing to run the reminder job."
    exit 1
}

$uri = "$BaseUrl/api/cron/loan-reminders"
$headers = @{ Authorization = "Bearer $Token" }

try {
    $res = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -TimeoutSec 60
    Write-Output ("{0}  reminders: active={1} overdue={2} dueSoon={3} emailsSent={4}" -f `
        (Get-Date -Format s), $res.active, $res.overdue, $res.dueSoon, $res.emailsSent)
    exit 0
} catch {
    Write-Error ("loan-reminders failed: {0}" -f $_.Exception.Message)
    exit 1
}
