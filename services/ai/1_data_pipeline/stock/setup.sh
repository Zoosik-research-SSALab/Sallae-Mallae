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

# ── 7. rclone 설치 및 설정 ──
info "rclone 확인 중..."

if command -v rclone &>/dev/null; then
    info "rclone 이미 설치됨 ($(rclone version --check 2>/dev/null | head -1 || rclone --version 2>/dev/null | head -1))"
else
    info "rclone 설치 중..."
    # OS 별 설치
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*)
            # Windows (Git Bash)
            RCLONE_ZIP="rclone-current-windows-amd64.zip"
            RCLONE_URL="https://downloads.rclone.org/${RCLONE_ZIP}"
            RCLONE_DIR="$HOME/.local/bin"
            mkdir -p "$RCLONE_DIR"
            curl -sSL "$RCLONE_URL" -o "/tmp/${RCLONE_ZIP}"
            unzip -o -j "/tmp/${RCLONE_ZIP}" "*/rclone.exe" -d "$RCLONE_DIR" 2>/dev/null
            rm -f "/tmp/${RCLONE_ZIP}"
            # PATH에 추가 (현재 세션)
            export PATH="$RCLONE_DIR:$PATH"
            if command -v rclone &>/dev/null; then
                info "rclone 설치 완료 (${RCLONE_DIR}/rclone.exe)"
                warn "영구 PATH 등록: .bashrc에 export PATH=\"\$HOME/.local/bin:\$PATH\" 를 추가하세요"
            else
                warn "rclone 설치 실패. https://rclone.org/downloads/ 에서 수동 설치하세요"
            fi
            ;;
        Linux*)
            curl -sSL https://rclone.org/install.sh | sudo bash 2>/dev/null \
                && info "rclone 설치 완료" \
                || warn "rclone 설치 실패. sudo 권한을 확인하세요"
            ;;
        Darwin*)
            if command -v brew &>/dev/null; then
                brew install rclone && info "rclone 설치 완료"
            else
                curl -sSL https://rclone.org/install.sh | sudo bash 2>/dev/null \
                    && info "rclone 설치 완료" \
                    || warn "rclone 설치 실패"
            fi
            ;;
        *)
            warn "알 수 없는 OS. https://rclone.org/downloads/ 에서 수동 설치하세요"
            ;;
    esac
fi

# rclone.conf 존재 확인 및 설정 안내
if command -v rclone &>/dev/null; then
    RCLONE_CONF_PATH=$(rclone config file 2>/dev/null | tail -1)
    if [[ -f "$RCLONE_CONF_PATH" ]] && grep -q "\[" "$RCLONE_CONF_PATH" 2>/dev/null; then
        info "rclone 설정 파일 확인: ${RCLONE_CONF_PATH}"
    else
        warn "rclone remote가 설정되지 않았습니다"
        echo "    Google Drive 연동 설정:"
        echo "      1. rclone config"
        echo "      2. n (New remote) → 이름: gdrive → Storage: drive"
        echo "      3. OAuth 인증 완료"
        echo "      4. .env에 RCLONE_REMOTE=gdrive:kospi200-project 설정"
        echo ""
        echo "    Docker에서 사용 시 rclone.conf를 프로젝트 디렉토리에 복사:"
        echo "      cp ${RCLONE_CONF_PATH} ./rclone.conf"
    fi
fi

# ── 8. 데이터 폴더 구조 확인 ──
info "데이터 폴더 구조 확인 중..."
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

# ── 9. 설치 검증 ──
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
    echo "    3. rclone config                        (Google Drive 연동, 최초 1회)"
    echo "    4. python setup_drive.py               (폴더 구조 생성, 최초 1회)"
    echo "    5. python pipeline.py --mode initial    (초기 수집)"
    echo ""
else
    error "패키지 검증 실패. 위 오류를 확인하세요."
fi
