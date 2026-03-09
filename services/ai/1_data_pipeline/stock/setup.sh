#!/usr/bin/env bash
# KOSPI 200 데이터 파이프라인 — 환경 설정 자동화 스크립트
# 사용법: bash setup.sh
# 환경: Git Bash (Windows) / Linux / macOS

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON_MIN_MAJOR=3
PYTHON_MIN_MINOR=12
VENV_DIR=".venv"

# ── 색상 ──
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── 1. Python 버전 확인 ──
info "Python 버전 확인 중..."

if command -v python &>/dev/null; then
    PYTHON_CMD="python"
elif command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
else
    error "Python이 설치되어 있지 않습니다. Python ${PYTHON_MIN_MAJOR}.${PYTHON_MIN_MINOR}+ 를 설치해주세요."
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | sed 's/[^0-9.]//g')
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)

if [[ "$PYTHON_MAJOR" -lt "$PYTHON_MIN_MAJOR" ]] || \
   { [[ "$PYTHON_MAJOR" -eq "$PYTHON_MIN_MAJOR" ]] && [[ "$PYTHON_MINOR" -lt "$PYTHON_MIN_MINOR" ]]; }; then
    error "Python ${PYTHON_MIN_MAJOR}.${PYTHON_MIN_MINOR}+ 필요 (현재: ${PYTHON_VERSION})"
fi

info "Python ${PYTHON_VERSION} 확인 완료 (${PYTHON_CMD})"

# ── 2. 가상환경 생성 ──
if [[ -d "$VENV_DIR" ]]; then
    warn "가상환경이 이미 존재합니다 (${VENV_DIR}/). 기존 환경을 사용합니다."
else
    info "가상환경 생성 중... (${VENV_DIR}/)"
    $PYTHON_CMD -m venv "$VENV_DIR"
    info "가상환경 생성 완료"
fi

# ── 3. 가상환경 활성화 ──
if [[ -f "$VENV_DIR/Scripts/activate" ]]; then
    # Windows (Git Bash)
    source "$VENV_DIR/Scripts/activate"
elif [[ -f "$VENV_DIR/bin/activate" ]]; then
    # Linux / macOS
    source "$VENV_DIR/bin/activate"
else
    error "가상환경 활성화 스크립트를 찾을 수 없습니다."
fi

info "가상환경 활성화 완료 ($(which python))"

# ── 4. pip 업그레이드 ──
info "pip 업그레이드 중..."
python -m pip install --upgrade pip --quiet

# ── 5. 패키지 설치 ──
info "패키지 설치 중... (--only-binary :all:)"
if python -m pip install -r requirements.txt --only-binary :all: --quiet 2>/dev/null; then
    info "패키지 설치 완료"
else
    warn "--only-binary 설치 실패. 일반 설치로 재시도합니다..."
    python -m pip install -r requirements.txt --quiet
    info "패키지 설치 완료 (일반 모드)"
fi

# ── 6. .env 파일 설정 ──
if [[ ! -f ".env" ]]; then
    cp .env.example .env
    info ".env 파일 생성 완료 (.env.example 복사)"
    warn ".env 파일에 API 키를 설정해주세요:"
    echo "    DART_API_KEY    — 재무 데이터 수집 (필수)"
    echo "    FRED_API_KEY    — kr_bond_3y 수집 (선택)"
    echo "    KRX_USER_ID     — 수급 수집 (필수)"
    echo "    KRX_PASSWORD    — 수급 수집 (필수)"
    echo "    KIS_API_KEY     — KIS 수급 수집 (선택)"
    echo "    KIS_SECRET_KEY  — KIS 수급 수집 (선택)"
else
    info ".env 파일이 이미 존재합니다. 건너뜁니다."
fi

# ── 7. Drive 폴더 구조 확인 ──
info "Drive 폴더 구조 확인 중..."
python -c "
from config import BASE_PATH
from pathlib import Path
p = Path(BASE_PATH)
if p.exists():
    print(f'  BASE_PATH 확인: {p}')
else:
    print(f'  BASE_PATH가 존재하지 않습니다: {p}')
    print('  python setup_drive.py 를 실행하여 폴더 구조를 생성하세요.')
" 2>/dev/null || warn "config.py 로드 실패. .env 설정 후 다시 시도하세요."

# ── 8. 설치 검증 ──
info "핵심 패키지 import 검증 중..."
python -c "
import sys
errors = []
packages = [
    ('pandas', 'pandas'),
    ('numpy', 'numpy'),
    ('pyarrow', 'pyarrow'),
    ('pykrx', 'pykrx.stock'),
    ('yfinance', 'yfinance'),
    ('ta', 'ta'),
    ('dotenv', 'dotenv'),
    ('schedule', 'schedule'),
    ('tqdm', 'tqdm'),
]
for name, mod in packages:
    try:
        __import__(mod)
        print(f'  {name:12s} OK')
    except ImportError as e:
        errors.append(name)
        print(f'  {name:12s} FAIL ({e})')
if errors:
    print(f'\n  실패한 패키지: {errors}')
    sys.exit(1)
print('\n  모든 핵심 패키지 검증 완료!')
"

if [[ $? -eq 0 ]]; then
    echo ""
    info "============================================"
    info "  환경 설정 완료!"
    info "============================================"
    echo ""
    echo "  다음 단계:"
    echo "    1. .env 파일에 API 키 설정"
    echo "    2. source ${VENV_DIR}/Scripts/activate  (Git Bash)"
    echo "    3. python setup_drive.py               (최초 1회)"
    echo "    4. python pipeline.py --mode initial    (초기 수집)"
    echo ""
else
    error "패키지 검증 실패. 위 오류를 확인하세요."
fi
