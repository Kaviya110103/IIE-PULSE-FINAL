#!/usr/bin/env python
"""IIE Pulse QA runner.

Runs the checks that should pass before local testing, GitHub pushes, cPanel/VPS
deployment, and Play Store AAB builds.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
MOBILE = ROOT / "MobileApp"
REPORTS = ROOT / "qa" / "reports"


@dataclass
class CheckResult:
    name: str
    status: str
    detail: str = ""
    duration_seconds: float = 0.0
    command: str = ""


@dataclass
class QaReport:
    mode: str
    started_at: str
    finished_at: str = ""
    status: str = "pass"
    checks: list[CheckResult] = field(default_factory=list)


def now_iso() -> str:
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def command_text(command: Iterable[str] | str) -> str:
    if isinstance(command, str):
        return command
    return " ".join(command)


def run_command(name: str, command: str, cwd: Path, timeout: int = 240) -> CheckResult:
    started = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            shell=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
        )
        output = (completed.stdout or "").strip()
        status = "pass" if completed.returncode == 0 else "fail"
        detail = output[-4000:] if output else "OK"
        return CheckResult(
            name=name,
            status=status,
            detail=detail,
            duration_seconds=round(time.perf_counter() - started, 2),
            command=command,
        )
    except subprocess.TimeoutExpired as exc:
        output = (exc.stdout or "")
        return CheckResult(
            name=name,
            status="fail",
            detail=f"Timed out after {timeout}s\n{output[-3000:]}",
            duration_seconds=round(time.perf_counter() - started, 2),
            command=command,
        )
    except Exception as exc:  # pragma: no cover - defensive for local machines
        return CheckResult(
            name=name,
            status="fail",
            detail=str(exc),
            duration_seconds=round(time.perf_counter() - started, 2),
            command=command,
        )


def downgrade_known_windows_migration_permission(result: CheckResult, strict: bool) -> CheckResult:
    if strict or result.status == "pass":
        return result

    detail = result.detail.lower()
    is_site_package_permission = (
        "permissionerror" in detail
        and "site-packages" in detail
        and "rest_framework_simplejwt" in detail
        and "migrations" in detail
    )
    if not is_site_package_permission:
        return result

    result.status = "warn"
    result.detail = (
        "Skipped strict pending-migration failure because local Windows Python could not "
        "resolve a third-party SimpleJWT migration file. GitHub Actions and production QA "
        "can run this strictly.\n\n"
        + result.detail
    )
    return result


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def check_config(mode: str) -> list[CheckResult]:
    started = time.perf_counter()
    messages: list[str] = []
    failures: list[str] = []

    try:
        app = read_json(MOBILE / "app.json")["expo"]
        eas = read_json(MOBILE / "eas.json")
        version = app.get("version")
        version_code = app.get("android", {}).get("versionCode")
        package_name = app.get("android", {}).get("package")
        prod_build_type = eas.get("build", {}).get("production", {}).get("android", {}).get("buildType")
        prod_api = eas.get("build", {}).get("production", {}).get("env", {}).get("EXPO_PUBLIC_API_URL", "")

        messages.append(f"Mobile version {version}, versionCode {version_code}, package {package_name}")
        if not version:
            failures.append("Mobile app.json version is missing.")
        if not isinstance(version_code, int) or version_code <= 0:
            failures.append("Android versionCode must be a positive integer.")
        if prod_build_type != "app-bundle":
            failures.append("EAS production buildType must be app-bundle for Play Store AAB.")
        if mode == "production" and not prod_api.startswith("https://"):
            failures.append("Production EAS API URL must be HTTPS.")
    except Exception as exc:
        failures.append(f"Mobile config could not be read: {exc}")

    backend_env = read_env(BACKEND / ".env")
    frontend_local_env = read_env(FRONTEND / ".env.local")

    if mode == "local":
        proxy_target = frontend_local_env.get("VITE_API_PROXY_TARGET", "")
        api_base = frontend_local_env.get("VITE_API_BASE_URL", "")
        deployment_domain = backend_env.get("DEPLOYMENT_DOMAIN", "")
        allowed_hosts = backend_env.get("DJANGO_ALLOWED_HOSTS", "")

        if api_base != "/api":
            failures.append("frontend/.env.local should use VITE_API_BASE_URL=/api for local proxy testing.")
        if not (proxy_target.startswith("http://127.0.0.1") or proxy_target.startswith("http://localhost")):
            failures.append("frontend/.env.local should proxy to the local backend.")
        if not (deployment_domain.startswith("127.0.0.1") or deployment_domain.startswith("localhost")):
            failures.append("backend/.env DEPLOYMENT_DOMAIN should be local in local mode.")
        if "127.0.0.1" not in allowed_hosts or "localhost" not in allowed_hosts:
            failures.append("backend/.env local allowed hosts must include localhost and 127.0.0.1.")
        messages.append(f"Local proxy target: {proxy_target}")

    if mode == "production":
        prod_example = read_env(FRONTEND / ".env.production.example")
        if prod_example.get("VITE_API_BASE_URL") != "https://iiepulse.indrainstitute.com/api":
            failures.append("frontend/.env.production.example must point to the production API.")
        if prod_example.get("VITE_API_PROXY_TARGET") != "https://iiepulse.indrainstitute.com":
            failures.append("frontend/.env.production.example must point proxy target to production domain.")
        messages.append("Production domain target: iiepulse.indrainstitute.com")

    return [
        CheckResult(
            name="config",
            status="fail" if failures else "pass",
            detail="\n".join(failures or messages),
            duration_seconds=round(time.perf_counter() - started, 2),
        )
    ]


def request_url(url: str, timeout: int = 12) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "IIE-Pulse-QA/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(800).decode("utf-8", errors="replace")
            return response.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read(800).decode("utf-8", errors="replace")
        return exc.code, body


def check_live_routes(frontend_url: str, backend_url: str) -> list[CheckResult]:
    checks: list[tuple[str, str, set[int]]] = [
        ("frontend home", frontend_url.rstrip("/") + "/", {200}),
        ("public gallery api", backend_url.rstrip("/") + "/api/gallery/", {200}),
        ("public awards api", backend_url.rstrip("/") + "/api/awards/", {200}),
        ("public news api", backend_url.rstrip("/") + "/api/news/", {200}),
        ("public calendar api", backend_url.rstrip("/") + "/api/calendar-events/", {200}),
        ("practice quiz api", backend_url.rstrip("/") + "/api/quiz/practice/", {200}),
        ("protected course types api", backend_url.rstrip("/") + "/api/course-types/", {401, 403}),
        ("protected materials api", backend_url.rstrip("/") + "/api/materials/", {401, 403}),
        ("protected student fee api", backend_url.rstrip("/") + "/api/student/fee/", {401, 403}),
        ("protected student quizzes api", backend_url.rstrip("/") + "/api/quiz/student/", {401, 403}),
    ]

    results: list[CheckResult] = []
    for name, url, expected_statuses in checks:
        started = time.perf_counter()
        try:
            status, body = request_url(url)
            ok = status in expected_statuses
            results.append(
                CheckResult(
                    name=f"live: {name}",
                    status="pass" if ok else "fail",
                    detail=f"{url} -> HTTP {status}" + ("" if ok else f"\n{body[:400]}"),
                    duration_seconds=round(time.perf_counter() - started, 2),
                )
            )
        except Exception as exc:
            results.append(
                CheckResult(
                    name=f"live: {name}",
                    status="fail",
                    detail=f"{url} -> {exc}",
                    duration_seconds=round(time.perf_counter() - started, 2),
                )
            )
    return results


def write_report(report: QaReport) -> Path:
    REPORTS.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    json_path = REPORTS / f"qa-report-{stamp}.json"
    md_path = REPORTS / f"qa-report-{stamp}.md"

    json_path.write_text(
        json.dumps(asdict(report), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    lines = [
        f"# IIE Pulse QA Report",
        "",
        f"- Mode: `{report.mode}`",
        f"- Status: `{report.status}`",
        f"- Started: `{report.started_at}`",
        f"- Finished: `{report.finished_at}`",
        "",
        "| Check | Status | Seconds |",
        "|---|---:|---:|",
    ]
    for check in report.checks:
        lines.append(f"| {check.name} | {check.status} | {check.duration_seconds} |")
    lines.append("")
    for check in report.checks:
        lines.extend([
            f"## {check.name}",
            "",
            f"Status: `{check.status}`",
            "",
            "```text",
            check.detail.strip() or "OK",
            "```",
            "",
        ])
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return md_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run IIE Pulse QA checks.")
    parser.add_argument("--mode", choices=["local", "production"], default="local")
    parser.add_argument("--skip-build", action="store_true", help="Skip frontend/mobile build checks.")
    parser.add_argument("--live", action="store_true", help="Check live local/production URLs too.")
    parser.add_argument("--strict-migrations", action="store_true", help="Fail on any pending migration scan issue.")
    parser.add_argument("--frontend-url", default="http://localhost:5173")
    parser.add_argument("--backend-url", default="http://127.0.0.1:8000")
    parser.add_argument("--production-url", default="https://iiepulse.indrainstitute.com")
    args = parser.parse_args()

    if args.mode == "production" and args.frontend_url == "http://localhost:5173":
        args.frontend_url = args.production_url
    if args.mode == "production" and args.backend_url == "http://127.0.0.1:8000":
        args.backend_url = args.production_url

    report = QaReport(mode=args.mode, started_at=now_iso())
    report.checks.extend(check_config(args.mode))

    report.checks.append(run_command("backend: django system check", f"{sys.executable} manage.py check", BACKEND, 180))
    migration_result = run_command(
        "backend: pending migration check",
        f"{sys.executable} manage.py makemigrations --check --dry-run",
        BACKEND,
        180,
    )
    report.checks.append(downgrade_known_windows_migration_permission(migration_result, args.strict_migrations))

    if not args.skip_build:
        report.checks.append(run_command("frontend: production build", "npm run build", FRONTEND, 360))
        report.checks.append(run_command("mobile: typescript check", "npx tsc --noEmit", MOBILE, 240))
        report.checks.append(run_command("mobile: expo config check", "npx expo config --type public", MOBILE, 180))

    if args.live:
        report.checks.extend(check_live_routes(args.frontend_url, args.backend_url))

    failed = [check for check in report.checks if check.status == "fail"]
    report.status = "fail" if failed else "pass"
    report.finished_at = now_iso()
    report_path = write_report(report)

    for check in report.checks:
        symbol = "OK" if check.status == "pass" else "WARN" if check.status == "warn" else "FAIL"
        print(f"[{symbol}] {check.name} ({check.duration_seconds}s)")
        if check.status != "pass":
            print(check.detail)
            print()
    print(f"\nQA report: {report_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
