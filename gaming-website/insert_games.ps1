
# Read file as lines array
$file = "c:\Users\vstni\.gemini\antigravity\scratch\gaming-website\index.html"
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

Write-Output "Total lines: $($lines.Length)"

# Find insertion points - we want to insert BEFORE the closing </div></div></div> of each category's game-grid
# Strategy: find the play-btn line for the LAST game in each category, then the next 3 closing divs

$colorRoadBtnLine = -1
$laserDefBtnLine = -1
$fruitCatchBtnLine = -1
$aimTrainBtnLine = -1
$tileSlideBtnLine = -1

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "launchGame\('color-road'\)") { $colorRoadBtnLine = $i; Write-Output "color-road btn at line $i" }
    if ($lines[$i] -match "launchGame\('laser-defense'\)") { $laserDefBtnLine = $i; Write-Output "laser-defense btn at line $i" }
    if ($lines[$i] -match "launchGame\('fruit-catcher'\)") { $fruitCatchBtnLine = $i; Write-Output "fruit-catcher btn at line $i" }
    if ($lines[$i] -match "launchGame\('aim-trainer'\)") { $aimTrainBtnLine = $i; Write-Output "aim-trainer btn at line $i" }
    if ($lines[$i] -match "launchGame\('tile-slide'\)") { $tileSlideBtnLine = $i; Write-Output "tile-slide btn at line $i" }
}
