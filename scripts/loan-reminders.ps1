# Loan due-date reminder job.
# Register with Windows Task Scheduler to run once every workday morning, e.g.:
#
#   schtasks /Create /TN "ITService-LoanReminders" /SC WEEKLY /D MON,TUE,WED,THU,FRI `
#     /ST 08:15 /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\itservice-rebuild\itservice-app\scripts\loan-reminders.ps1"
#
# Set $BaseUrl / $Token to match the running app + CRON_SECRET in .env.

$BaseUrl = "http://localhost:3000"
$Token   = ""   # must equal CRON_SECRET in .env (leave blank only if the app allows admin trigger)

$uri = "$BaseUrl/api/cron/loan-reminders"
if ($Token) { $uri = "$uri`?token=$Token" }

try {
    $res = Invoke-RestMethod -Uri $uri -Method Post -TimeoutSec 60
    Write-Output ("{0}  reminders: active={1} overdue={2} dueSoon={3} emailsSent={4}" -f `
        (Get-Date -Format s), $res.active, $res.overdue, $res.dueSoon, $res.emailsSent)
    exit 0
} catch {
    Write-Error ("loan-reminders failed: {0}" -f $_.Exception.Message)
    exit 1
}
