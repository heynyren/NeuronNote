@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Neuron Note - Cap nhat extension

REM ============================================================
REM  Neuron Note - Tu dong cap nhat extension tu GitHub.
REM
REM  Dat file nay o THU MUC GOC cua repo (vd: F:\setupfiles\NeuronNote).
REM  Script keo code moi nhat ve NGAY tai cho (git pull), nen thu muc
REM  extension "neuron-note" giu nguyen duong dan -> extension giu
REM  nguyen ID va toan bo ghi chu da luu KHONG bi mat.
REM  Sau do ban chi can bam Reload trong edge://extensions
REM  (hoac chrome://extensions).
REM
REM  Yeu cau: da cai Git for Windows va thu muc nay la ban sao
REM  (git clone) cua repo NeuronNote.
REM ============================================================

REM (Tuy chon) Ten nhanh muon cap nhat. De trong = nhanh hien tai.
set "BRANCH="

cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Chua cai Git hoac Git khong co trong PATH.
  echo Tai Git for Windows tai: https://git-scm.com/download/win
  echo Cai xong, mo lai file nay.
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Thu muc nay khong phai ban sao git cua repo NeuronNote.
  echo Hay dung "git clone" de tai repo ve ^(dung tai file .zip^), roi thu lai.
  echo.
  pause
  exit /b 1
)

echo.
echo === Neuron Note: dang cap nhat... ===
echo.

git fetch --all --prune
if errorlevel 1 goto fail

if defined BRANCH (
  git checkout "%BRANCH%" || goto fail
)

git pull --ff-only
if errorlevel 1 (
  echo.
  echo [Chu y] Khong the fast-forward ^(co the ban dang co thay doi cuc bo^).
  echo Dang tam cat thay doi ^(git stash^) va thu lai...
  git stash push -u -m "neuron-note-auto-update" >nul 2>nul
  git pull --ff-only
  if errorlevel 1 goto fail
)

set "REV="
for /f "delims=" %%v in ('git rev-parse --short HEAD') do set "REV=%%v"

echo.
echo ============================================================
echo  ^>^> Cap nhat xong.  Phien ban: !REV!
echo.
echo  Buoc cuoi: mo   edge://extensions   ^(hoac chrome://extensions^)
echo  tim "Neuron Note" roi bam bieu tuong Reload ^(vong tron mui ten^).
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo [LOI] Cap nhat that bai. Xem thong bao loi ben tren.
echo Neu bi ket, mo Git Bash tai thu muc nay va chay:  git status
echo.
pause
exit /b 1
