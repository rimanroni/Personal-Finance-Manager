Add-Type -AssemblyName System.Drawing

$root = 'C:\Users\riman\Downloads\finance-manager'
$brand = Join-Path $root 'brand'
New-Item -ItemType Directory -Force -Path $brand | Out-Null

$glyph = [char]0x09F3  # ৳
$navy  = [System.Drawing.Color]::FromArgb(255, 16, 24, 40)
$indigo = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)

function Save-Mono-Logo {
  param([int]$Size, [string]$Path)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $fontSize = [int]($Size * 0.58)
  $font = New-Object System.Drawing.Font('Nirmala UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $box = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $g.DrawString($glyph, $font, [System.Drawing.Brushes]::White, $box, $format)
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $font.Dispose(); $bmp.Dispose()
}

function Save-Logo {
  param([int]$Size, [string]$Path)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(0, $Size)),
    $navy,
    $indigo
  )
  $g.FillRectangle($bg, 0, 0, $Size, $Size)

  $fontSize = [int]($Size * 0.58)
  $font = New-Object System.Drawing.Font('Nirmala UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $box = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)

  # Soft dark shadow under the glyph.
  $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(80, 0, 0, 0))
  $shadowBox = New-Object System.Drawing.RectangleF(0, [single]($Size * 0.018), $Size, $Size)
  $g.DrawString($glyph, $font, $shadowBrush, $shadowBox, $format)

  $g.DrawString($glyph, $font, [System.Drawing.Brushes]::White, $box, $format)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bg.Dispose(); $font.Dispose(); $shadowBrush.Dispose(); $bmp.Dispose()
  Write-Host "Wrote $Path ($Size px)"
}

# Brand master + PWA icons.
Save-Logo 1024 (Join-Path $brand 'finora-logo.png')
Save-Logo 512  (Join-Path $root 'public\icons\icon-512.png')
Save-Logo 192  (Join-Path $root 'public\icons\icon-192.png')

# Android launcher icons (legacy + adaptive foreground).
$densities = @(
  @{ Folder = 'mdpi';    Legacy = 48;  Fore = 108 },
  @{ Folder = 'hdpi';    Legacy = 72;  Fore = 162 },
  @{ Folder = 'xhdpi';   Legacy = 96;  Fore = 216 },
  @{ Folder = 'xxhdpi';  Legacy = 144; Fore = 324 },
  @{ Folder = 'xxxhdpi'; Legacy = 192; Fore = 432 }
)

foreach ($d in $densities) {
  $dir = Join-Path $root ("android\app\src\main\res\mipmap-" + $d.Folder)
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Get-ChildItem -Path $dir -Filter 'ic_launcher*.webp' | Remove-Item -Force
  Save-Logo $d.Legacy (Join-Path $dir 'ic_launcher.png')
  Save-Logo $d.Legacy (Join-Path $dir 'ic_launcher_round.png')
  Save-Logo $d.Fore   (Join-Path $dir 'ic_launcher_foreground.png')
  Save-Mono-Logo $d.Fore (Join-Path $dir 'ic_launcher_monochrome.png')
}

Write-Host 'Logo installed.'
