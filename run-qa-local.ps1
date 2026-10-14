param(
  [switch]$Live,
  [switch]$SkipBuild
)

$argsList = @("qa\run_qa.py", "--mode", "local")

if ($Live) {
  $argsList += "--live"
}

if ($SkipBuild) {
  $argsList += "--skip-build"
}

python @argsList
