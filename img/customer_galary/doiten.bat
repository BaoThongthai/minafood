@echo off
setlocal enabledelayedexpansion

:: Bắt đầu từ số 28
set count=28

:: Lặp qua tất cả file ảnh trong folder
for %%f in (*.jpg *.jpeg *.png *.webp) do (
    set "newname=galary-!count!.png"
    
    echo Renaming: %%f → !newname!
    
    ren "%%f" "!newname!"
    
    set /a count+=1
)

echo Done!
pause