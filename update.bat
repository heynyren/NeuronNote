@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Neuron Note - Cap nhat extension

REM ============================================================
REM  Neuron Note - Tu dong cap nhat extension tu GitHub.
REM  Dat file nay o THU MUC GOC repo (vd: F:\setupfiles\NeuronNote).
REM
REM  Cach hoat dong: ep thu muc local KHOP CHINH XAC voi ban tren
REM  GitHub (git reset --hard). => Khong xung dot, khong hoi (y/n).
REM  LUU Y: moi thay doi code cuc bo trong thu muc se bi ghi de.
REM  File nay dung de "chi cap nhat", dung sua code truc tiep o day.
REM
REM  Thu muc "neuron-note" giu nguyen duong dan -> extension giu
REM  nguyen ID va ghi chu da luu KHONG mat. Xong nho bam Reload.
REM ============================================================

REM (Tuy chon) Ten nhanh muon theo. De trong = nhanh hien tai.
set "BRANCH="

cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Chua cai Git. Tai tai: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Thu muc nay khong phai ban sao git ^(git clone^) cua repo.
  echo.
  pause
  exit /b 1
)

if not defined BRANCH (
  for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
)

echo.
echo === Neuron Note: dang cap nhat nhanh "!BRANCH!"... ===
echo.

git fetch origin "!BRANCH!" --prune
if errorlevel 1 goto fail

REM Ep khop chinh xac voi ban tren GitHub (khong hoi, khong ket).
git reset --hard "origin/!BRANCH!"
if errorlevel 1 goto fail

REM Don file rac untracked (giu lai chinh update.bat neu ban tu tao tay truoc do).
git clean -fd -e update.bat >nul 2>nul

set "REV="
for /f "delims=" %%v in ('git rev-parse --short HEAD') do set "REV=%%v"

echo.
echo ============================================================
echo  ^>^> Cap nhat xong.  ^(commit !REV!^)
echo.
echo  Buoc cuoi: mo   edge://extensions   ^(hoac chrome://extensions^)
echo  tim "Neuron Note" roi bam Reload ^(vong tron mui ten^)
echo  va kiem tra so phien ban.
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo [LOI] Cap nhat that bai. Thuong do 1 file/thu muc dang bi khoa.
echo   - Dong File Explorer / VS Code dang mo thu muc nay.
echo   - Roi chay lai file update.bat nay.
echo.
pause
exit /b 1
